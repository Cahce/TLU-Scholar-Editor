import { describe, it, expect } from "vitest";
import { escapeTypstText, htmlToTypst } from "../html-to-typst";

describe("escapeTypstText", () => {
  it("escapes Typst markup trigger characters", () => {
    expect(escapeTypstText("a #b *c* _d_ $e$ `f` @g <h> i\\j")).toBe(
      "a \\#b \\*c\\* \\_d\\_ \\$e\\$ \\`f\\` \\@g \\<h\\> i\\\\j",
    );
  });
});

describe("htmlToTypst", () => {
  it("converts headings, bold, italic, underline, strike", () => {
    const out = htmlToTypst(
      "<h2>Tiêu đề</h2><p><b>đậm</b> và <em>nghiêng</em>, " +
        "<u>gạch chân</u>, <s>gạch ngang</s></p>",
    );
    expect(out).toContain("== Tiêu đề");
    expect(out).toContain("*đậm*");
    expect(out).toContain("_nghiêng_");
    expect(out).toContain("#underline[gạch chân]");
    expect(out).toContain("#strike[gạch ngang]");
  });

  it("converts links and drops unsafe schemes", () => {
    const out = htmlToTypst(
      '<p><a href="https://typst.app">Typst</a> ' +
        '<a href="javascript:alert(1)">xấu</a></p>',
    );
    expect(out).toContain('#link("https://typst.app")[Typst]');
    expect(out).not.toContain("javascript:");
    expect(out).toContain("xấu");
  });

  it("converts unordered + nested lists with indentation", () => {
    const out = htmlToTypst(
      "<ul><li>Một</li><li>Hai<ul><li>Hai.a</li></ul></li></ul>",
    );
    expect(out).toContain("- Một");
    expect(out).toContain("- Hai");
    expect(out).toContain("  - Hai.a");
  });

  it("converts ordered lists to + markers", () => {
    const out = htmlToTypst("<ol><li>a</li><li>b</li></ol>");
    expect(out).toContain("+ a");
    expect(out).toContain("+ b");
  });

  it("converts a table with th header row to #table + table.header", () => {
    const out = htmlToTypst(
      "<table><tr><th>H1</th><th>H2</th></tr>" +
        "<tr><td>a</td><td>b</td></tr></table>",
    );
    expect(out).toContain("#table(");
    expect(out).toContain("columns: 2,");
    expect(out).toContain("table.header([H1], [H2]),");
    expect(out).toContain("[a], [b],");
  });

  it("pads short table rows to the column count", () => {
    const out = htmlToTypst(
      "<table><tr><td>a</td><td>b</td></tr><tr><td>c</td></tr></table>",
    );
    expect(out).toContain("[c], [],");
  });

  it("converts pre to a fenced block and inline code to backticks", () => {
    const out = htmlToTypst(
      "<p>dùng <code>let x</code></p><pre>fn main() {}</pre>",
    );
    expect(out).toContain("`let x`");
    expect(out).toContain("```\nfn main() {}\n```");
  });

  it("escapes Typst special characters in text", () => {
    const out = htmlToTypst("<p>giá #1 *quan trọng* a@b</p>");
    expect(out).toContain("\\#1");
    expect(out).toContain("\\*quan trọng\\*");
    expect(out).toContain("a\\@b");
  });

  it("treats Word/Google-Docs wrapper soup as transparent", () => {
    const out = htmlToTypst(
      '<div class="WordSection1"><p class="MsoNormal">' +
        '<span style="mso-bidi-font-size:11.0pt"><b>Kết quả</b> tốt</span>' +
        "</p></div>",
    );
    expect(out).toBe("*Kết quả* tốt");
  });

  it("skips images, scripts and styles", () => {
    const out = htmlToTypst(
      '<p>văn bản<img src="x.png"><script>alert(1)</script>' +
        "<style>p{color:red}</style></p>",
    );
    expect(out).toBe("văn bản");
  });

  it("returns null for empty/unusable HTML", () => {
    expect(htmlToTypst("<div>   </div>")).toBeNull();
    expect(htmlToTypst("")).toBeNull();
  });

  it("escapes a leading list marker so paste can't fake a list", () => {
    const out = htmlToTypst("<p>- không phải list</p>");
    expect(out).toBe("\\- không phải list");
  });
});
