import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../stores/authStore";
import type { ApiErrorBody, RefreshResponse } from "../types/api";

declare module "axios" {
  // Per-request opt-out of the global 401 hard-redirect. Used by the route
  // guard's session validation so it can perform a clean SPA redirect instead.
  export interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
    /** Internal flag: set after one refresh+retry to prevent infinite loops. */
    _retry?: boolean;
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ── Silent refresh (single-flight) ──────────────────────────────────────────
// While a refresh is in flight, concurrent callers share the same promise so a
// burst of expired-token 401s triggers exactly one `/auth/refresh` call.
let refreshPromise: Promise<string> | null = null;

/** Clear auth and bounce to login (unless told to skip, or already there). */
function forceLogout(skipRedirect?: boolean): void {
  useAuthStore.getState().clearAuth();
  if (!skipRedirect && window.location.pathname !== "/") {
    window.location.href = "/";
  }
}

function isAuthEndpoint(url?: string): boolean {
  return !!url && (url.includes("/auth/refresh") || url.includes("/auth/login"));
}

async function doRefresh(): Promise<string> {
  const refreshToken = useAuthStore.getState().getRefreshToken();
  if (!refreshToken) {
    throw new Error("NO_REFRESH_TOKEN");
  }
  // Bare axios (not `apiClient`) so this request bypasses the interceptors below.
  const { data } = await axios.post<RefreshResponse>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { "Content-Type": "application/json", Accept: "application/json" } },
  );
  useAuthStore.getState().setTokens(data.accessToken, data.refreshToken, data.user);
  return data.accessToken;
}

/**
 * Exchange the stored refresh token for a fresh access token. Single-flight:
 * concurrent callers await the same in-flight request. Resolves with the new
 * access token; rejects if there is no refresh token or the refresh fails.
 */
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Request interceptor - add Authorization header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor - handle errors, silent refresh, and extract data
apiClient.interceptors.response.use(
  (response) => {
    // Return response.data directly
    return response.data;
  },
  async (error) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean; skipAuthRedirect?: boolean })
      | undefined;

    if (error.response) {
      const status = error.response.status;
      let data = error.response.data as ApiErrorBody | undefined;

      // For blob requests (PDF/zip downloads) an error body still arrives as a
      // Blob, so the backend `{ error: { code, message } }` would otherwise be
      // lost behind a generic statusText. Parse it so callers see the real
      // reason (e.g. the actual Typst compile error) and we can read the code.
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          data = text ? (JSON.parse(text) as ApiErrorBody) : undefined;
        } catch {
          data = undefined;
        }
      }

      const code = data?.error?.code;

      if (status === 401) {
        // Access token expired → attempt a single silent refresh, then retry the
        // original request once with the new token (the request interceptor
        // injects it from the store).
        if (
          code === "TOKEN_EXPIRED" &&
          original &&
          !original._retry &&
          !isAuthEndpoint(original.url)
        ) {
          original._retry = true;
          try {
            await refreshAccessToken();
            return await apiClient(original);
          } catch {
            forceLogout(original.skipAuthRedirect);
            throw new ApiError(
              status,
              code ?? "TOKEN_EXPIRED",
              data?.error?.message ?? "Phiên đăng nhập đã hết hạn",
            );
          }
        }

        // Any other 401 (missing/invalid/revoked token, an auth endpoint, or a
        // request already retried): clear auth and redirect to login. The route
        // guard opts out of the hard redirect via `skipAuthRedirect`.
        forceLogout(original?.skipAuthRedirect);
      }

      // Throw ApiError with backend error details
      throw new ApiError(
        status,
        code ?? "HTTP_ERROR",
        data?.error?.message ?? error.response.statusText,
      );
    }

    // Network error or timeout
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      error.message ?? "Không thể kết nối đến server",
    );
  },
);

/**
 * `fetch` wrapper for raw binary paths that can't use `apiClient` (they need the
 * raw `Response` / `Content-Type`). Injects the Bearer token and, on a
 * `401 TOKEN_EXPIRED`, performs one silent refresh + retry. Any other 401 (or a
 * failed refresh) clears auth and redirects to login. Returns the final
 * `Response` so the caller can read its body / headers.
 */
export async function authorizedFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const run = (token: string | null): Promise<Response> =>
    fetch(input, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let res = await run(useAuthStore.getState().getAccessToken());
  if (res.status !== 401) return res;

  // Read the error code from a clone so the caller can still consume the body.
  let code: string | undefined;
  try {
    code = (await res.clone().json())?.error?.code;
  } catch {
    /* non-JSON error body — leave code undefined */
  }

  if (code === "TOKEN_EXPIRED") {
    try {
      const token = await refreshAccessToken();
      res = await run(token); // retry once with the refreshed token
      if (res.status !== 401) return res;
    } catch {
      /* fall through to forceLogout */
    }
  }

  // Still unauthorized (non-expiry, or refresh failed/insufficient).
  forceLogout();
  return res;
}
