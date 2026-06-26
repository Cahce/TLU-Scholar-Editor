import { useCallback } from "react";
import { listTemplateVersions } from "../api/templates";
import { useAsyncData } from "./useAsyncData";

export function useTemplateVersions(templateId: string) {
  return useAsyncData(
    useCallback(() => listTemplateVersions(templateId), [templateId]),
  );
}
