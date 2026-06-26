import { describe, it, expect } from "vitest";
import {
  contentHash,
  planSessionUpdate,
} from "../workerSessionState";

describe("contentHash", () => {
  it("is stable for equal strings and differs on edits", () => {
    expect(contentHash("= Chương 1")).toBe(contentHash("= Chương 1"));
    expect(contentHash("= Chương 1")).not.toBe(contentHash("= Chương 2"));
  });

  it("distinguishes same-length different content", () => {
    expect(contentHash("aaab")).not.toBe(contentHash("aaba"));
  });

  it("fingerprints binaries by length + head/tail bytes", () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 4]);
    const c = new Uint8Array([1, 2, 3, 5]);
    expect(contentHash(a)).toBe(contentHash(b));
    expect(contentHash(a)).not.toBe(contentHash(c));
    expect(contentHash(a)).not.toBe(contentHash(new Uint8Array([1, 2, 3])));
  });
});

describe("planSessionUpdate", () => {
  const files = (over: Record<string, string> = {}) => ({
    "main.typ": "= Tiêu đề\nNội dung",
    "chapters/c1.typ": "== Chương 1",
    ...over,
  });

  it("plans full when there is no live session", () => {
    const plan = planSessionUpdate(null, null, files(), "/");
    expect(plan.action).toBe("full");
    expect(plan.changed.sort()).toEqual(["chapters/c1.typ", "main.typ"]);
  });

  it("plans incremental with only the edited file", () => {
    const first = planSessionUpdate(null, null, files(), "/");
    const second = planSessionUpdate(
      first.nextFiles,
      "/",
      files({ "main.typ": "= Tiêu đề\nNội dung MỚI" }),
      "/",
    );
    expect(second.action).toBe("incremental");
    expect(second.changed).toEqual(["main.typ"]);
  });

  it("plans empty incremental when nothing changed", () => {
    const first = planSessionUpdate(null, null, files(), "/");
    const second = planSessionUpdate(first.nextFiles, "/", files(), "/");
    expect(second.action).toBe("incremental");
    expect(second.changed).toEqual([]);
  });

  it("falls back to full when a file disappears (delete/rename)", () => {
    const first = planSessionUpdate(null, null, files(), "/");
    const { "chapters/c1.typ": _gone, ...rest } = files();
    const second = planSessionUpdate(first.nextFiles, "/", rest, "/");
    expect(second.action).toBe("full");
  });

  it("treats a NEW file as incremental (additions can't go stale)", () => {
    const first = planSessionUpdate(null, null, files(), "/");
    const second = planSessionUpdate(
      first.nextFiles,
      "/",
      files({ "refs.bib": "@book{k}" }),
      "/",
    );
    expect(second.action).toBe("incremental");
    expect(second.changed).toEqual(["refs.bib"]);
  });

  it("falls back to full when root changes", () => {
    const first = planSessionUpdate(null, null, files(), "/");
    const second = planSessionUpdate(first.nextFiles, "/", files(), "/sub");
    expect(second.action).toBe("full");
  });

  it("detects binary content swaps", () => {
    const withImg = { ...files(), "images/a.png": new Uint8Array([9, 9, 9]) };
    const first = planSessionUpdate(null, null, withImg, "/");
    const second = planSessionUpdate(first.nextFiles, "/", {
      ...files(),
      "images/a.png": new Uint8Array([9, 9, 8]),
    }, "/");
    expect(second.action).toBe("incremental");
    expect(second.changed).toEqual(["images/a.png"]);
  });
});
