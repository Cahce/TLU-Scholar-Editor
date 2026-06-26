/**
 * ZoteroPanel Component
 * 
 * Main panel for Zotero integration.
 */

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { useZoteroConnection } from "../../../hooks/useZoteroConnection";
import { useZoteroCollections } from "../../../hooks/useZoteroCollections";
import { useZoteroItems } from "../../../hooks/useZoteroItems";
import { ZoteroConnectionForm } from "./ZoteroConnectionForm";
import { ZoteroCollectionTree } from "./ZoteroCollectionTree";
import { ZoteroItemList } from "./ZoteroItemList";
import { ZoteroSyncDialog } from "./ZoteroSyncDialog";
import * as zoteroApi from "../../../api/zotero";
import { toast } from "sonner";
import { useEditorStore } from "../../state/editorStore";
import { useBibTargetPath } from "../../hooks/useBibTargetPath";
import { useInsertCitation } from "../../hooks/useInsertCitation";
import type { ZoteroItem } from "../../../types/bibliography";

interface ZoteroPanelProps {
  projectId: string;
}

export function ZoteroPanel({ projectId }: ZoteroPanelProps) {
  const { connection, loading, error, refetch, verify, connect, disconnect } = useZoteroConnection();
  const { collections, loading: collectionsLoading } = useZoteroCollections(!!connection);
  const [selectedCollectionKey, setSelectedCollectionKey] = useState<string | null>(null);
  const {
    items,
    total,
    page,
    loading: itemsLoading,
    setPage,
  } = useZoteroItems(selectedCollectionKey);

  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [itemsToSync, setItemsToSync] = useState<string[]>([]);
  const { suggestedPath } = useBibTargetPath();
  const insertCitation = useInsertCitation();

  // "Mới thêm gần đây" tab: pull the library's most-recently-added items so a
  // paper just saved via the real Zotero Connector can be cited in one click.
  const [tab, setTab] = useState("collections");
  const [recentItems, setRecentItems] = useState<ZoteroItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentLoaded, setRecentLoaded] = useState(false);

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const res = await zoteroApi.listItems({
        sort: "dateAdded",
        direction: "desc",
        limit: 20,
      });
      setRecentItems(res.items);
      setRecentLoaded(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không tải được tài liệu mới",
      );
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "recent" && !recentLoaded && connection) {
      void loadRecent();
    }
  }, [tab, recentLoaded, connection, loadRecent]);

  const handleSync = async (body: Parameters<typeof zoteroApi.sync>[1]) => {
    await zoteroApi.sync(projectId, body);
    // Backend rewrote `body.targetBibPath` on disk — pull the fresh content
    // into the editor store so the open .bib tab updates immediately and
    // the next preview compile sees the new entries (otherwise the user
    // has to manually switch tabs and the preview shows "no bibliography"
    // after F5).
    await useEditorStore
      .getState()
      .reloadFileFromServer(body.targetBibPath)
      .catch((err) =>
        console.warn("[ZoteroPanel] post-sync reload failed:", err),
      );
  };

  const handleOpenSyncDialog = (itemKeys: string[]) => {
    setItemsToSync(itemKeys);
    setSyncDialogOpen(true);
  };

  /**
   * "Chèn" flow: sync the single Zotero item into the project's default .bib
   * file, then insert `#cite(<citationKey>)` using the key the backend
   * actually wrote. Without this round-trip the cite tag would reference a
   * Zotero item key like `2QVIFTZ5` that does not exist in any .bib entry
   * (backend generates keys like `Clark1988Errorcorrection`), and the next
   * Typst compile would fail with "Key X does not exist in the bibliography".
   */
  const handleInsertCitation = async (item: ZoteroItem) => {
    // Bail before the network round-trip if the user has no Typst file open
    // — we can't insert anywhere, and we'd still pollute the .bib.
    if (!useEditorStore.getState().editorViewRef.current) {
      toast.error("Vui lòng mở một file Typst để chèn trích dẫn.");
      return;
    }
    try {
      const result = await zoteroApi.sync(projectId, {
        itemKeys: [item.key],
        targetBibPath: suggestedPath,
        syncType: "incremental",
      });
      const mapping = result.entries.find(
        (e) => e.zoteroItemKey === item.key,
      );
      if (!mapping) {
        toast.error("Không nhận được khóa trích dẫn từ máy chủ.");
        return;
      }
      // Refresh the open .bib tab so the new entry is visible and the next
      // preview compile picks it up (same rationale as handleSync above).
      await useEditorStore
        .getState()
        .reloadFileFromServer(suggestedPath)
        .catch((err) =>
          console.warn("[ZoteroPanel] post-insert reload failed:", err),
        );
      const ok = insertCitation(mapping.citationKey);
      if (ok) {
        toast.success(`Đã chèn trích dẫn: ${mapping.citationKey}`);
      } else {
        toast.error("Không thể chèn trích dẫn. Vui lòng mở một file Typst.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chèn trích dẫn thất bại";
      toast.error(message);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success("Đã ngắt kết nối Zotero");
    } catch (err) {
      toast.error("Không thể ngắt kết nối");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-slate-500">Đang tải...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => refetch()}
          className="text-sm text-[#007bff] hover:underline"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!connection) {
    return (
      <ZoteroConnectionForm
        onConnected={refetch}
        onVerify={verify}
        onConnect={connect}
      />
    );
  }

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col">
        <header className="px-3 py-2 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="text-xs text-slate-600 truncate">
            {connection.libraryType === "user" ? "Người dùng" : "Nhóm"} #{connection.libraryId}
          </div>
          <button
            onClick={handleDisconnect}
            className="text-xs text-red-500 hover:underline focus:outline-none"
          >
            Ngắt kết nối
          </button>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="mx-3 mt-2 shrink-0">
            <TabsTrigger value="collections">Bộ sưu tập</TabsTrigger>
            <TabsTrigger value="items">Tài liệu</TabsTrigger>
            <TabsTrigger value="recent">Mới thêm</TabsTrigger>
          </TabsList>

          <TabsContent value="collections" className="flex-1 min-h-0 mt-2 flex flex-col">
            {collectionsLoading ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-sm text-slate-500">Đang tải bộ sưu tập...</p>
              </div>
            ) : (
              <ZoteroCollectionTree
                collections={collections}
                onSelect={setSelectedCollectionKey}
                selectedKey={selectedCollectionKey}
              />
            )}
          </TabsContent>

          <TabsContent value="items" className="flex-1 min-h-0 mt-2 flex flex-col">
            {!selectedCollectionKey ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-sm text-slate-500">
                  Chọn một bộ sưu tập để xem tài liệu
                </p>
              </div>
            ) : (
              <ZoteroItemList
                items={items}
                total={total}
                page={page}
                loading={itemsLoading}
                onPageChange={setPage}
                onSync={handleOpenSyncDialog}
                onInsert={handleInsertCitation}
              />
            )}
          </TabsContent>

          <TabsContent value="recent" className="flex-1 min-h-0 mt-2 flex flex-col">
            <div className="px-3 pb-2 space-y-1 shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-slate-600">
                  Mới lưu từ Zotero Connector
                </p>
                <button
                  type="button"
                  onClick={() => void loadRecent()}
                  disabled={recentLoading}
                  className="text-[11px] text-[#007bff] hover:underline focus:outline-none disabled:opacity-50"
                >
                  {recentLoading ? "Đang tải..." : "Làm mới"}
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Lưu bài báo đang đọc bằng{" "}
                <a
                  href="https://www.zotero.org/download/connectors"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#007bff] hover:underline"
                >
                  Zotero Connector
                </a>{" "}
                rồi bấm Làm mới để trích dẫn vào dự án.
              </p>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <ZoteroItemList
                items={recentItems}
                total={recentItems.length}
                page={0}
                loading={recentLoading}
                onPageChange={() => {}}
                onSync={handleOpenSyncDialog}
                onInsert={handleInsertCitation}
                emptyMessage="Chưa có tài liệu mới. Dùng Zotero Connector lưu một bài báo trên web, sau đó bấm Làm mới."
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ZoteroSyncDialog
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
        itemKeys={itemsToSync}
        onSync={handleSync}
      />
    </>
  );
}
