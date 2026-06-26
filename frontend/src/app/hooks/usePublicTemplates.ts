import { useCallback } from "react";
import { listPublicTemplates } from "../api/templates";
import { useAsyncData } from "./useAsyncData";

export function usePublicTemplates() {
  return useAsyncData(useCallback(() => listPublicTemplates(), []));
}
