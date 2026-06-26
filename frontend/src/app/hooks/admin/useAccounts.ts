import { useCallback } from "react";
import { listAccounts } from "../../api/admin/accounts";
import { useAsyncData } from "../useAsyncData";
import type { ListAccountsQuery } from "../../types/admin";

export function useAccounts(query?: ListAccountsQuery) {
  return useAsyncData(
    useCallback(() => listAccounts(query), [
      query?.search,
      query?.role,
      query?.isActive,
      query?.hasLink,
      query?.page,
      query?.pageSize,
    ])
  );
}
