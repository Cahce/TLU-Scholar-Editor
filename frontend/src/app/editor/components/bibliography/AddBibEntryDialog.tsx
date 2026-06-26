/**
 * AddBibEntryDialog
 *
 * Add/edit BibTeX entries without bypassing CodeMirror undo/autosave.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ParsedBibEntry } from "../../services/BibDuplicateService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";

type EntryType = "article" | "book" | "inproceedings" | "phdthesis" | "misc";

const ENTRY_TYPES: Array<{
  value: EntryType;
  label: string;
  venueField: string;
  venueLabel: string;
}> = [
  { value: "article", label: "Bài báo (article)", venueField: "journal", venueLabel: "Tạp chí" },
  { value: "book", label: "Sách (book)", venueField: "publisher", venueLabel: "Nhà xuất bản" },
  { value: "inproceedings", label: "Kỷ yếu hội thảo", venueField: "booktitle", venueLabel: "Tên hội thảo" },
  { value: "phdthesis", label: "Luận văn / luận án", venueField: "school", venueLabel: "Cơ sở đào tạo" },
  { value: "misc", label: "Khác (misc)", venueField: "howpublished", venueLabel: "Nguồn" },
];

interface AddBibEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entrySource: string) => void;
  initialEntry?: ParsedBibEntry | null;
}

function slugifyKey(author: string, year: string): string {
  const firstAuthor = author.split(/[,;&]|\sand\s/i)[0]?.trim() ?? "";
  const lastName = firstAuthor.split(/\s+/).pop() ?? "";
  const cleaned = lastName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
  const yearMatch = year.match(/\d{4}/);
  if (!cleaned || !yearMatch) return "";
  return `${cleaned}${yearMatch[0]}`;
}

function buildEntrySource(opts: {
  type: EntryType;
  key: string;
  author: string;
  title: string;
  year: string;
  venue: string;
  pages: string;
  extraFields?: Record<string, string>;
}): string {
  const venueField = ENTRY_TYPES.find((t) => t.value === opts.type)!.venueField;
  const fields: Record<string, string> = { ...(opts.extraFields ?? {}) };

  fields.author = opts.author.trim();
  fields.title = opts.title.trim();
  if (opts.year.trim()) fields.year = opts.year.trim();
  else delete fields.year;
  if (opts.venue.trim()) fields[venueField] = opts.venue.trim();
  else delete fields[venueField];
  if (opts.pages.trim()) fields.pages = opts.pages.trim();
  else delete fields.pages;

  const ordered = Object.entries(fields).filter(([, value]) => value.trim());
  const maxKeyLen = ordered.reduce((m, [k]) => Math.max(m, k.length), 0);
  const body = ordered
    .map(([k, v], i) => {
      const pad = " ".repeat(maxKeyLen - k.length);
      const comma = i === ordered.length - 1 ? "" : ",";
      return `  ${k}${pad} = {${v.trim()}}${comma}`;
    })
    .join("\n");

  return `@${opts.type}{${opts.key.trim()},\n${body}\n}`;
}

export function AddBibEntryDialog({
  open,
  onOpenChange,
  onSubmit,
  initialEntry = null,
}: AddBibEntryDialogProps): JSX.Element {
  const [type, setType] = useState<EntryType>("article");
  const [key, setKey] = useState("");
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [venue, setVenue] = useState("");
  const [pages, setPages] = useState("");

  const autoKey = slugifyKey(author, year);
  const effectiveKey = key.trim() || autoKey;
  const typeConfig = ENTRY_TYPES.find((t) => t.value === type)!;
  const isEditing = Boolean(initialEntry);

  const resetForm = () => {
    setType("article");
    setKey("");
    setAuthor("");
    setTitle("");
    setYear("");
    setVenue("");
    setPages("");
  };

  useEffect(() => {
    if (!open) return;
    if (!initialEntry) {
      resetForm();
      return;
    }

    const nextType = normalizeEntryType(initialEntry.type);
    const nextConfig = ENTRY_TYPES.find((t) => t.value === nextType)!;
    setType(nextType);
    setKey(initialEntry.key);
    setAuthor(initialEntry.fields.author ?? "");
    setTitle(initialEntry.fields.title ?? "");
    setYear(initialEntry.fields.year ?? "");
    setVenue(initialEntry.fields[nextConfig.venueField] ?? "");
    setPages(initialEntry.fields.pages ?? "");
  }, [open, initialEntry]);

  const handleSubmit = () => {
    if (!effectiveKey) {
      toast.error("Cần nhập citation key hoặc tác giả + năm");
      return;
    }
    if (!author.trim() || !title.trim()) {
      toast.error("Vui lòng nhập tác giả và tiêu đề");
      return;
    }
    if (/[\s<>{}]/.test(effectiveKey)) {
      toast.error("Citation key không được chứa khoảng trắng hoặc < > { }");
      return;
    }

    onSubmit(
      buildEntrySource({
        type,
        key: effectiveKey,
        author,
        title,
        year,
        venue,
        pages,
        extraFields: initialEntry?.fields,
      })
    );
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Sửa tài liệu tham khảo" : "Thêm tài liệu tham khảo"}
          </DialogTitle>
          <DialogDescription>
            Lưu thay đổi qua trình soạn thảo để giữ hoàn tác và tự động lưu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="bibentry-type">Loại tài liệu</Label>
            <Select value={type} onValueChange={(v) => setType(v as EntryType)}>
              <SelectTrigger id="bibentry-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTRY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bibentry-key">
              Citation key
              {!key && autoKey && (
                <span className="ml-1 text-xs text-slate-400">({autoKey})</span>
              )}
            </Label>
            <Input
              id="bibentry-key"
              value={key}
              placeholder={autoKey || "vd: nguyen2024"}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bibentry-author">Tác giả</Label>
            <Input
              id="bibentry-author"
              value={author}
              placeholder="Nguyễn Văn A and Trần Thị B"
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bibentry-title">Tiêu đề</Label>
            <Input
              id="bibentry-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bibentry-year">Năm</Label>
              <Input
                id="bibentry-year"
                value={year}
                placeholder="2024"
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bibentry-pages">Trang</Label>
              <Input
                id="bibentry-pages"
                value={pages}
                placeholder="1--10"
                onChange={(e) => setPages(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bibentry-venue">{typeConfig.venueLabel}</Label>
            <Input
              id="bibentry-venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit}>
            {isEditing ? "Lưu thay đổi" : "Thêm tài liệu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function normalizeEntryType(type: string): EntryType {
  if (
    type === "book" ||
    type === "inproceedings" ||
    type === "phdthesis" ||
    type === "misc"
  ) {
    return type;
  }
  if (type === "mastersthesis" || type === "thesis") {
    return "phdthesis";
  }
  return "article";
}
