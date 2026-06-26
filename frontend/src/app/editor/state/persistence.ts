import { openDB, type IDBPDatabase } from "idb";
import type { EditorFileDraft } from "../types/editor";

const DB_NAME = "tlu-scholar-editor";
// Bumped from 1 → 2 to add the `tabs` store (multi-tab editor).
const DB_VERSION = 2;
const DRAFTS_STORE = "drafts";
const TABS_STORE = "tabs";

interface DraftRecord {
  projectId: string;
  path: string;
  content: string;
  timestamp: number;
}

export interface TabState {
  openTabs: string[];
  activePath: string | null;
  // Per-tab cursor + scroll state — keyed by file path. Optional so older DB
  // entries without this field still load cleanly.
  tabCursorState?: Record<string, { line: number; column: number; scrollTop: number }>;
}

interface TabRecord extends TabState {
  projectId: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Get or create IndexedDB connection
 */
async function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
          const store = db.createObjectStore(DRAFTS_STORE, {
            keyPath: ["projectId", "path"],
          });
          store.createIndex("projectId", "projectId");
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains(TABS_STORE)) {
          // Single-row-per-project tab state. Keyed by `projectId`.
          db.createObjectStore(TABS_STORE, { keyPath: "projectId" });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Stash draft content to IndexedDB
 * Called immediately when user types to prevent data loss on refresh
 */
export async function stashDraftToIDB(
  projectId: string,
  path: string,
  content: string,
): Promise<void> {
  try {
    const db = await getDB();
    const record: DraftRecord = {
      projectId,
      path,
      content,
      timestamp: Date.now(),
    };
    await db.put(DRAFTS_STORE, record);
  } catch (error) {
    console.error("Failed to stash draft to IDB:", error);
  }
}

/**
 * Clear draft from IndexedDB after successful save
 */
export async function clearDraftInIDB(
  projectId: string,
  path: string,
): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(DRAFTS_STORE, [projectId, path]);
  } catch (error) {
    console.error("Failed to clear draft from IDB:", error);
  }
}

/**
 * Persist the open-tabs state for a project (debounced at the call-site).
 */
export async function saveTabStateToIDB(
  projectId: string,
  state: TabState,
): Promise<void> {
  try {
    const db = await getDB();
    const record: TabRecord = { projectId, ...state };
    await db.put(TABS_STORE, record);
  } catch (error) {
    console.error("Failed to save tab state to IDB:", error);
  }
}

/**
 * Load saved tab state for a project. Returns `null` when no entry exists
 * (e.g. fresh project) so the caller can fall back to a sensible default.
 */
export async function loadTabStateFromIDB(
  projectId: string,
): Promise<TabState | null> {
  try {
    const db = await getDB();
    const record = (await db.get(TABS_STORE, projectId)) as TabRecord | undefined;
    if (!record) return null;
    return {
      openTabs: record.openTabs ?? [],
      activePath: record.activePath ?? null,
      tabCursorState: record.tabCursorState ?? {},
    };
  } catch (error) {
    console.error("Failed to load tab state from IDB:", error);
    return null;
  }
}

/**
 * Hydrate drafts from IndexedDB on bootstrap
 * Returns a map of path -> EditorFileDraft
 */
export async function hydrateDraftsFromIDB(
  projectId: string,
): Promise<Record<string, EditorFileDraft>> {
  try {
    const db = await getDB();
    const tx = db.transaction(DRAFTS_STORE, "readonly");
    const index = tx.store.index("projectId");
    const records = await index.getAll(projectId);

    const drafts: Record<string, EditorFileDraft> = {};
    for (const record of records) {
      drafts[record.path] = {
        path: record.path,
        content: record.content,
        dirty: true, // Assume dirty since it's from IDB
        saving: false,
        lastSavedAt: null,
        saveError: null,
      };
    }

    return drafts;
  } catch (error) {
    console.error("Failed to hydrate drafts from IDB:", error);
    return {};
  }
}
