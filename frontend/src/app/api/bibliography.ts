/**
 * Bibliography API client.
 */

import { apiClient } from "./client";
import type {
  CheckDuplicatesBody,
  CheckDuplicatesResponse,
} from "../types/bibliography";

export async function checkDuplicates(
  projectId: string,
  body: CheckDuplicatesBody
): Promise<CheckDuplicatesResponse> {
  return apiClient.post<never, CheckDuplicatesResponse>(
    `/bibliography/projects/${projectId}/check-duplicates`,
    body
  );
}
