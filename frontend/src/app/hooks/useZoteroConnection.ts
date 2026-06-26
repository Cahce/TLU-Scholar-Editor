/**
 * useZoteroConnection Hook
 * 
 * Manages Zotero connection state and operations.
 */

import { useCallback } from "react";
import * as zoteroApi from "../api/zotero";
import { useAsyncData } from "./useAsyncData";
import type {
  ConnectZoteroBody,
  VerifyZoteroResponse,
} from "../types/bibliography";

export function useZoteroConnection() {
  const { data, loading, error, refetch } = useAsyncData(
    useCallback(() => zoteroApi.getMyConnection(), [])
  );

  const verify = useCallback(
    async (apiKey: string): Promise<VerifyZoteroResponse> => {
      return zoteroApi.verify(apiKey);
    },
    []
  );

  const connect = useCallback(
    async (body: ConnectZoteroBody) => {
      await zoteroApi.connect(body);
      await refetch();
    },
    [refetch]
  );

  const disconnect = useCallback(async () => {
    await zoteroApi.disconnect();
    await refetch();
  }, [refetch]);

  return {
    connection: data?.connection ?? null,
    loading,
    error,
    refetch,
    verify,
    connect,
    disconnect,
  };
}
