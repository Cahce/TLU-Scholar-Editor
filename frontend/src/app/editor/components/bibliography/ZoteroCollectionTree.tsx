/**
 * ZoteroCollectionTree Component
 * 
 * Displays Zotero collections in a tree structure.
 */

import { ChevronRight, ChevronDown, Folder } from "lucide-react";
import { useState } from "react";
import type { ZoteroCollection } from "../../../types/bibliography";

interface ZoteroCollectionTreeProps {
  collections: ZoteroCollection[];
  onSelect: (key: string) => void;
  selectedKey: string | null;
}

export function ZoteroCollectionTree({
  collections,
  onSelect,
  selectedKey,
}: ZoteroCollectionTreeProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // Build tree structure
  const rootCollections = collections.filter((c) => !c.parentKey);
  const childrenMap = new Map<string, ZoteroCollection[]>();
  
  collections.forEach((c) => {
    if (c.parentKey) {
      const children = childrenMap.get(c.parentKey) || [];
      children.push(c);
      childrenMap.set(c.parentKey, children);
    }
  });

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const renderCollection = (collection: ZoteroCollection, level: number = 0) => {
    const children = childrenMap.get(collection.key) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedKeys.has(collection.key);
    const isSelected = selectedKey === collection.key;

    return (
      <div key={collection.key}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpand(collection.key);
            }
            onSelect(collection.key);
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
            isSelected
              ? "bg-blue-50 text-[#007bff] font-medium"
              : "hover:bg-slate-100 text-slate-700"
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 shrink-0" />
            )
          ) : (
            <div className="w-4 shrink-0" />
          )}
          <Folder className="w-4 h-4 shrink-0 text-amber-500" />
          <span className="flex-1 truncate">{collection.name}</span>
          <span className="text-xs text-slate-500">{collection.numItems}</span>
        </button>
        {hasChildren && isExpanded && (
          <div>
            {children.map((child) => renderCollection(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (collections.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-slate-500">Không có bộ sưu tập nào</p>
      </div>
    );
  }

  return (
    // Plain overflow-y-auto — see OpenAlexResultList for why we ditched
    // Radix ScrollArea in these nested-flex bibliography panels.
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="py-2">
        {rootCollections.map((collection) => renderCollection(collection))}
      </div>
    </div>
  );
}
