import { Link } from "react-router";
import type { ReactNode } from "react";
import {
  Braces,
  ExternalLink,
  Hash,
  Image as ImageIcon,
  Languages,
  LayoutPanelTop,
  Rocket,
  Sigma,
  Type,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { HelpLayout, type HelpSection } from "../components/HelpLayout";
import { CodeBlock } from "../components/CodeBlock";
import { Example, PreviewImage } from "../components/Example";
import { Callout } from "../components/Callout";
import { VersionBadge } from "../components/VersionBadge";
import { CheatTable, type CheatRow } from "../components/CheatTable";
import { SYMBOL_BASE_TOTAL, SYMBOL_TOTAL } from "../reference/symbolMeta";
import { FnChips } from "../components/ParamPreview";
import { TYPST_DOCS_URL } from "../typstVersion";

/** Mã nội dòng. */
function C({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px] text-slate-800">
      {children}
    </code>
  );
}

/** Liên kết tới tài liệu gốc trên typst.app. */
function Src({ href, children }: { href: string; children?: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-[#007bff] hover:underline"
    >
      <ExternalLink className="w-3 h-3" />
      {children ?? "Tài liệu gốc"}
    </a>
  );
}

/** Bảng tra cứu dạng [cú pháp, ý nghĩa]. */
function RefTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-500">
            <th className="px-4 py-2.5 font-semibold w-2/5">Cú pháp</th>
            <th className="px-4 py-2.5 font-semibold">Ý nghĩa</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(([syntax, meaning]) => (
            <tr key={syntax} className="hover:bg-slate-50/60 align-top">
              <td className="px-4 py-2.5">
                <code className="font-mono text-[13px] text-slate-800 whitespace-pre-wrap">{syntax}</code>
              </td>
              <td className="px-4 py-2.5 text-slate-600">{meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const MARKUP_ROWS: CheatRow[] = [
  { syntax: "(dòng trống)", meaning: "Ngắt đoạn văn (paragraph break)", ref: { category: "model", fn: "parbreak" } },
  { syntax: "= Tiêu đề", meaning: "Tiêu đề cấp 1; dùng ==, ===, ... cho cấp sâu hơn", ref: { category: "model", fn: "heading" } },
  { syntax: "*văn bản*", meaning: "In đậm (strong)", ref: { category: "model", fn: "strong" } },
  { syntax: "_văn bản_", meaning: "In nghiêng (emphasis)", ref: { category: "model", fn: "emph" } },
  { syntax: "`mã`", meaning: "Mã nội dòng (raw, phông chữ đơn cách)", ref: { category: "text", fn: "raw" } },
  { syntax: "```rust ... ```", meaning: "Khối mã có tô màu cú pháp theo ngôn ngữ", ref: { category: "text", fn: "raw" } },
  { syntax: "https://...", meaning: "Tự động thành liên kết", ref: { category: "model", fn: "link" } },
  { syntax: '#link("https://...")[Chữ]', meaning: "Liên kết có nhãn tuỳ chỉnh", ref: { category: "model", fn: "link" } },
  { syntax: "<nhan>", meaning: "Đặt nhãn cho phần tử phía trước" },
  { syntax: "@nhan", meaning: "Tham chiếu chéo tới nhãn / nguồn trích dẫn", ref: { category: "model", fn: "ref" } },
  { syntax: "- mục", meaning: "Danh sách không thứ tự", ref: { category: "model", fn: "list" } },
  { syntax: "+ mục", meaning: "Danh sách có đánh số", ref: { category: "model", fn: "enum" } },
  { syntax: "1. mục", meaning: "Danh sách đánh số theo số cụ thể", ref: { category: "model", fn: "enum" } },
  { syntax: "/ Thuật ngữ: mô tả", meaning: "Danh sách định nghĩa", ref: { category: "model", fn: "terms" } },
  { syntax: "$x^2$", meaning: "Công thức toán (chế độ Math)", ref: { category: "math", fn: "equation" } },
  { syntax: '"..."  \'...\'', meaning: "Dấu nháy thông minh (cong) theo ngôn ngữ", ref: { category: "text", fn: "smartquote" } },
  { syntax: "~", meaning: "Khoảng trắng không ngắt dòng" },
  { syntax: "---  --", meaning: "Gạch ngang dài (—) và gạch nối trung (–)" },
  { syntax: "\\#  \\*  \\_  \\$", meaning: "Thoát ký tự đặc biệt để gõ nguyên văn" },
  { syntax: "\\u{1F600}", meaning: "Chèn ký tự Unicode theo mã" },
  { syntax: "//  /* ... */", meaning: "Ghi chú một dòng / nhiều dòng (không in ra)" },
  { syntax: "#expr", meaning: "Chèn biểu thức code vào văn bản (chế độ Code)" },
];

const MATH_SYMBOLS: [string, string][] = [
  ["alpha beta gamma ... omega", "Chữ Hy Lạp thường: α β γ … ω"],
  ["Alpha Beta ... Omega", "Chữ Hy Lạp hoa: Α Β … Ω"],
  ["pi  tau  phi  epsilon  theta", "π τ φ ε θ"],
  ["RR  NN  ZZ  QQ  CC", "Tập số: ℝ ℕ ℤ ℚ ℂ"],
  ["sum  product  integral", "∑ ∏ ∫ (kèm cận: sum_(i=1)^n)"],
  ["infinity (oo)  partial  nabla  diff", "∞ ∂ ∇ (vô cực / đạo hàm / gradient)"],
  ["plus.minus  minus.plus  times  div  ast", "± ∓ × ÷ ∗"],
  ["dot  dot.c  star  circle  bullet", "⋅ · ⋆ ∘ •"],
  ["lt.eq  gt.eq  eq.not  approx  equiv", "≤ ≥ ≠ ≈ ≡"],
  ["prec  succ  prop  tilde  asymp", "≺ ≻ ∝ ∼ ≍"],
  ["in  in.not  subset  subset.eq  supset", "∈ ∉ ⊂ ⊆ ⊃"],
  ["union  sect  union.big  sect.big  emptyset", "∪ ∩ ⋃ ⋂ ∅"],
  ["forall  exists  exists.not  not", "∀ ∃ ∄ ¬"],
  ["and  or  therefore  because  models", "∧ ∨ ∴ ∵ ⊧"],
  ["arrow.r  arrow.l  arrow.t  arrow.b  arrow.l.r", "→ ← ↑ ↓ ↔"],
  ["arrow.r.double  arrow.r.bar  arrow.r.long", "⇒ ↦ ⟶"],
  ["angle  degree  perp  parallel  triangle", "∠ ° ⟂ ∥ △"],
  ["prime  dots.h  dots.v  dots.down  checkmark", "′ … ⋮ ⋱ ✓"],
  ["ell  Im  Re  planck  aleph", "ℓ ℑ ℜ ħ א (ký hiệu chữ)"],
  ["plus.circle  times.circle  dot.circle  union.sq", "⊕ ⊗ ⊙ ⊔"],
];

// Shorthand chế độ Math — ĐẦY ĐỦ (Typst v0.14.2). Mỗi cặp shorthand↔glyph đã được
// đối chiếu bằng chính trình biên dịch (backend/scripts/verify-shorthands.mjs).
const MATH_SHORTHANDS: [string, string][] = [
  ["<=  >=  !=", "≤ ≥ ≠  — lt.eq, gt.eq, eq.not"],
  ["<<  >>", "≪ ≫  — lt.double, gt.double (nhỏ/lớn hơn nhiều)"],
  ["<<<  >>>", "⋘ ⋙  — lt.triple, gt.triple"],
  [":=  =:  ::=", "≔ ≕ ⩴  — colon.eq, eq.colon, colon.double.eq (gán / định nghĩa)"],
  ["->  <-  <->", "→ ← ↔  — arrow.r, arrow.l, arrow.l.r"],
  ["-->  <--  <-->", "⟶ ⟵ ⟷  — mũi tên dài (arrow.r.long…)"],
  ["=>  <=>", "⇒ ⇔  — arrow.r.double, arrow.l.r.double"],
  ["==>  <==  <==>", "⟹ ⟸ ⟺  — mũi tên đôi dài"],
  ["|->  |=>", "↦ ⤇  — arrow.r.bar, arrow.r.double.bar (ánh xạ tới)"],
  [">->  ->>", "↣ ↠  — arrow.r.tail, arrow.r.twohead"],
  ["<-<  <<-", "↢ ↞  — arrow.l.tail, arrow.l.twohead"],
  ["~>  <~", "⇝ ⇜  — arrow.r.squiggly, arrow.l.squiggly (mũi tên lượn)"],
  ["~~>  <~~", "⟿ ⬳  — mũi tên lượn dài"],
  ["[|  |]", "⟦ ⟧  — bracket.l.double, bracket.r.double"],
  ["||", "‖  — bar.v.double (chuẩn / song song)"],
  ["*  ~  -  ...", "∗ ∼ − …  — ast, tilde, minus, dots.h"],
];

// Shorthand chế độ Markup (ngoài công thức) — đã kiểm chứng bằng compiler.
const MARKUP_SHORTHANDS: [string, string][] = [
  ["---", "— (gạch dài, em dash)"],
  ["--", "– (gạch vừa, en dash)"],
  ["...", "… (dấu ba chấm)"],
  ["~", "khoảng trắng không ngắt dòng (nbsp) — giữ hai từ trên cùng một dòng"],
  ["-?", "dấu nối mềm (soft hyphen) — chỉ hiện khi cần ngắt dòng"],
];

const MATH_FUNCS: CheatRow[] = [
  { syntax: "a/b  hoặc  frac(a, b)", meaning: "Phân số", ref: { category: "math", fn: "frac" } },
  { syntax: "x^2   x_i   x_i^2", meaning: "Số mũ trên / chỉ số dưới / cả hai", ref: { category: "math", fn: "attach" } },
  { syntax: "sqrt(x)   root(3, x)", meaning: "Căn bậc hai / căn bậc n", ref: { category: "math", fn: "root" } },
  { syntax: "sum_(i=1)^n   integral_a^b", meaning: "Tổng / tích phân có cận" },
  { syntax: "lim_(x -> 0)", meaning: "Giới hạn", ref: { category: "math", fn: "op" } },
  { syntax: "mat(1, 2; 3, 4)", meaning: "Ma trận (dấu ; để xuống hàng)", ref: { category: "math", fn: "mat" } },
  { syntax: "vec(1, 2, 3)", meaning: "Vector cột", ref: { category: "math", fn: "vec" } },
  { syntax: "cases(...)", meaning: "Hệ phương trình / định nghĩa theo trường hợp", ref: { category: "math", fn: "cases" } },
  { syntax: "abs(x)  norm(x)  floor(x)  ceil(x)", meaning: "|x|, ‖x‖, ⌊x⌋, ⌈x⌉", ref: { category: "math", fn: "lr" } },
  { syntax: "hat(x)  bar(x)  arrow(x)  dot(x)  tilde(x)", meaning: "Dấu phụ trên ký hiệu", ref: { category: "math", fn: "accent" } },
  { syntax: "bold(x)  italic(x)  upright(d)", meaning: "Đậm / nghiêng / đứng", ref: { category: "math", fn: "variants" } },
  { syntax: "cal(A)  frak(g)  bb(R)", meaning: "Kiểu chữ: hoa mỹ, Fraktur, bảng đen", ref: { category: "math", fn: "variants" } },
];

const SECTIONS: HelpSection[] = [
  {
    id: "gioi-thieu",
    label: "Giới thiệu & ba chế độ",
    icon: Rocket,
    content: (
      <>
        <p>
          Typst là ngôn ngữ soạn thảo văn bản hiện đại. Bạn gõ mã đánh dấu ở khung soạn thảo, hệ
          thống biên dịch và hiển thị bản PDF ở khung Preview. Cú pháp Typst chia làm{" "}
          <strong>ba chế độ</strong>:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
          <li>
            <strong>Markup</strong> (mặc định): gõ văn bản như bình thường, dùng ký hiệu ngắn để
            định dạng (<C>= tiêu đề</C>, <C>*đậm*</C>, <C>- danh sách</C>).
          </li>
          <li>
            <strong>Math</strong>: đặt giữa hai dấu <C>$</C> để soạn công thức (<C>$x^2$</C>).
          </li>
          <li>
            <strong>Code</strong>: bắt đầu bằng <C>#</C> để gọi hàm, dùng biến, tính toán
            (<C>#image("anh.png")</C>).
          </li>
        </ul>
        <Callout tone="tip" title="Quy ước chung">
          Mỗi project có file chính <C>main.typ</C> làm điểm biên dịch. Tên định danh (biến/hàm)
          dùng chữ cái, số, <C>-</C> và <C>_</C>; khuyến nghị kiểu kebab-case (<C>tac-gia</C>).
        </Callout>
        <Src href="https://typst.app/docs/reference/syntax/">typst.app/docs/reference/syntax</Src>
      </>
    ),
  },
  {
    id: "go-tieng-viet",
    label: "Gõ tiếng Việt có dấu",
    icon: Languages,
    content: (
      <>
        <p>
          Typst dùng mã hoá Unicode (UTF-8) nên bạn gõ tiếng Việt trực tiếp như trong Word, dùng bộ
          gõ quen thuộc (Unikey / EVKey) theo kiểu Telex hoặc VNI. Không cần khai báo gì để ký tự
          hiển thị.
        </p>
        <Callout tone="warning" title="Quan trọng nhất: chọn đúng font">
          Nếu chữ bị mất dấu hoặc hiện ô vuông trống (□ — gọi là &quot;tofu&quot;), nghĩa là font
          đang dùng <strong>thiếu ký tự tiếng Việt</strong>. Hãy đổi sang một font có hỗ trợ đầy đủ
          chữ Việt.
        </Callout>

        <p className="font-medium text-slate-800">1. Khai báo ngôn ngữ tiếng Việt</p>
        <CodeBlock
          code={`#set text(lang: "vi", region: "VN")`}
          caption='Bật ngắt từ (hyphenation) tiếng Việt và tự dịch nhãn mặc định: "Figure" → "Hình", "Table" → "Bảng", mục lục → "Mục lục".'
        />

        <p className="font-medium text-slate-800">2. Chọn font hỗ trợ tiếng Việt</p>
        <CodeBlock
          code={`#set text(font: "Times New Roman", size: 13pt, lang: "vi")`}
          caption='Font có sẵn hỗ trợ tốt tiếng Việt: "Libertinus Serif", "New Computer Modern" (mặc định), "Noto Serif". Cần đúng quy định đồ án (Times New Roman 13–14pt) thì tải file .ttf vào project rồi đặt đúng tên font.'
        />

        <p className="font-medium text-slate-800">3. Một tài liệu tiếng Việt tối thiểu</p>
        <Example
          code={`#set text(font: "Times New Roman", size: 13pt, lang: "vi", region: "VN")
#set par(justify: true, first-line-indent: 1.25em)

= Lời mở đầu
Đây là đoạn văn tiếng Việt đầy đủ dấu: ăn, ấm, ờ, ữ, ặ, ỹ.
Phương pháp nghiên cứu khoa học và ứng dụng thực tiễn trong đồ án tốt nghiệp.`}
        >
          <PreviewImage id="vietnamese" alt="Kết quả: đoạn văn tiếng Việt đầy đủ dấu, render bằng Times New Roman" />
        </Example>
        <FnChips
          refs={[
            { category: "text", fn: "text" },
            { category: "model", fn: "par" },
          ]}
        />

        <Callout tone="info" title="Dấu nháy thông minh">
          Typst tự đổi <C>&quot;...&quot;</C> thành dấu nháy cong theo ngôn ngữ. Muốn giữ nháy thẳng,
          thêm <C>#set smartquote(enabled: false)</C> ở đầu tài liệu.
        </Callout>
      </>
    ),
  },
  {
    id: "che-do-markup",
    label: "Chế độ Markup (văn bản)",
    icon: Type,
    content: (
      <>
        <p>
          Đây là chế độ mặc định khi gõ văn bản. Bảng dưới liệt kê đầy đủ các ký hiệu đánh dấu.
        </p>
        <CheatTable rows={MARKUP_ROWS} />

        <p className="font-medium text-slate-800 pt-1">Ví dụ và kết quả</p>
        <Example
          code={`= Chương 1: Giới thiệu
Đoạn văn có chữ *in đậm* và _in nghiêng_.

- Mục thứ nhất
- Mục thứ hai

+ Bước một
+ Bước hai`}
        >
          <PreviewImage id="markup" alt="Kết quả: tiêu đề chương, chữ đậm/nghiêng và danh sách" />
        </Example>

        <p className="font-medium text-slate-800 pt-1">Ngắt dòng, thoát ký tự, ghi chú</p>
        <CodeBlock
          code={String.raw`Dòng một \
Dòng hai (ngắt dòng thủ công bằng dấu \).

Gõ nguyên văn ký tự đặc biệt: \# \* \_ \$
Ký tự Unicode theo mã: \u{1F600}

// Đây là ghi chú, không xuất hiện trong PDF
/* Ghi chú
   nhiều dòng */`}
        />

        <p className="font-medium text-slate-800 pt-1">Ký hiệu viết tắt (shorthand) trong Markup</p>
        <RefTable rows={MARKUP_SHORTHANDS} />

        <Src href="https://typst.app/docs/reference/syntax/#markup">typst.app/docs/reference/syntax — Markup</Src>
      </>
    ),
  },
  {
    id: "che-do-toan",
    label: "Chế độ Math (công thức)",
    icon: Sigma,
    content: (
      <>
        <p>
          Đặt công thức giữa hai dấu <C>$</C>. Viết liền <C>$...$</C> cho công thức nội dòng; thêm
          khoảng trắng <C>$ ... $</C> để công thức tách thành khối riêng, căn giữa. Trong chế độ
          Math, một chữ cái là biến; nhiều chữ cái liền nhau được hiểu là <em>tên hàm/ký hiệu</em>,
          muốn hiển thị nguyên văn thì đặt trong nháy <C>&quot;...&quot;</C>.
        </p>
        <Example
          code={`$ a^2 + b^2 = c^2 $

$ "diện tích" = pi r^2 $

$ sum_(i=1)^n i = (n (n + 1)) / 2 $`}
        >
          <PreviewImage id="math-basic" alt="Kết quả: các công thức toán cơ bản và tổng dạng phân số" />
        </Example>

        <p className="font-medium text-slate-800">Hàm và cấu trúc thường dùng</p>
        <CheatTable rows={MATH_FUNCS} />

        <p className="font-medium text-slate-800 pt-1">Ma trận, hệ điều kiện, căn chỉnh</p>
        <Example
          code={String.raw`$ A = mat(1, 2; 3, 4) $

$ f(x) = cases(
  x\,    &"nếu" x >= 0,
  -x\,   &"nếu" x < 0,
) $

$ sum_(k=0)^n k &= 1 + 2 + ... + n \
              &= (n (n + 1)) / 2 $`}
          caption="Dấu ; xuống hàng trong ma trận; \\, chèn dấu phẩy nguyên văn; & là điểm căn chỉnh; \\ ngắt dòng."
        >
          <PreviewImage id="math-matrix" alt="Kết quả: ma trận, hệ điều kiện và tổng căn chỉnh nhiều dòng" />
        </Example>

        <p className="font-medium text-slate-800 pt-1">Tên ký hiệu thường dùng</p>
        <p className="text-sm text-slate-500 -mt-1">
          Bảng tóm tắt nhanh dưới đây chỉ là phần hay dùng. Toàn bộ{" "}
          <strong className="text-slate-700">{SYMBOL_TOTAL}</strong> ký hiệu (từ {SYMBOL_BASE_TOTAL}{" "}
          tên gốc, gồm mọi biến thể) có trong{" "}
          <Link to="/huong-dan/tra-cuu/symbols" className="font-medium text-[#007bff] hover:underline">
            Bộ ký hiệu đầy đủ
          </Link>
          .
        </p>
        <RefTable rows={MATH_SYMBOLS} />

        <p className="font-medium text-slate-800 pt-1">Ký hiệu viết tắt (shorthand) trong Math</p>
        <p className="text-sm text-slate-500 -mt-1">
          Gõ các tổ hợp này trong công thức, Typst tự đổi thành ký hiệu tương ứng.
        </p>
        <RefTable rows={MATH_SHORTHANDS} />

        <Callout tone="tip">
          Mỗi ký hiệu còn nhiều biến thể qua hậu tố: <C>arrow.r.double</C>, <C>eq.not</C>,{" "}
          <C>lt.eq.slant</C>… Xem và tìm kiếm{" "}
          <Link to="/huong-dan/tra-cuu/symbols" className="font-medium text-[#007bff] hover:underline">
            toàn bộ {SYMBOL_TOTAL} ký hiệu
          </Link>{" "}
          (bấm để sao chép tên), hoặc tra{" "}
          <a
            href="https://typst.app/docs/reference/symbols/sym/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#007bff] hover:underline"
          >
            trang Symbols của Typst
          </a>
          .
        </Callout>
        <Src href="https://typst.app/docs/reference/math/">typst.app/docs/reference/math</Src>
      </>
    ),
  },
  {
    id: "che-do-code",
    label: "Chế độ Code (scripting)",
    icon: Braces,
    content: (
      <>
        <p>
          Bắt đầu bằng <C>#</C> để chèn một biểu thức code vào văn bản; hoặc dùng khối code{" "}
          <C>{"#{ ... }"}</C> (nhiều câu lệnh) và khối nội dung <C>[ ... ]</C> (markup như một giá
          trị). Với phép toán hai ngôi trong văn bản, bọc trong ngoặc: <C>#(1 + 2)</C>.
        </p>

        <p className="font-medium text-slate-800">Biến & hàm</p>
        <CodeBlock
          code={`#let tenTruong = "Đại học Thủy Lợi"
Trường: #tenTruong

#let cong(a, b) = a + b
Tổng: #cong(2, 3)

// Hàm ẩn danh (lambda)
#let binhPhuong = x => x * x`}
        />

        <p className="font-medium text-slate-800">Rẽ nhánh & vòng lặp</p>
        <CodeBlock
          code={String.raw`#if 1 < 2 [Đúng] else [Sai]

#for c in "ABC" [ #c là một chữ cái. ]

#for (khoa, giaTri) in (a: 1, b: 2) [
  #khoa = #giaTri \
]

#let n = 1
#while n < 100 { n = n * 2 }`}
        />

        <p className="font-medium text-slate-800">Trường, phương thức, mảng & từ điển</p>
        <CodeBlock
          code={`#let diem = (mssv: "A1", gioiTinh: "Nam")
#diem.mssv

#("a, b, c").split(", ").join(" | ")

#let danhSach = (1, 2, 3)
#danhSach.len()       // 3
#danhSach.at(0)       // 1`}
        />

        <p className="font-medium text-slate-800">Kiểu giá trị</p>
        <RefTable
          rows={[
            ["none  auto", "Giá trị rỗng / tự động"],
            ["true  false", "Luận lý (boolean)"],
            ["10   0xff   3.14   1e5", "Số nguyên / số thực"],
            ["2pt 3mm 1em 90deg 50% 2fr", "Độ dài, góc, tỉ lệ, phần linh hoạt"],
            ['"chuỗi"', "Chuỗi ký tự (string)"],
            ["(1, 2, 3)", "Mảng (array)"],
            ["(ten: \"A\", tuoi: 20)", "Từ điển (dictionary)"],
            ["[ *nội dung* ]", "Khối nội dung (content)"],
          ]}
        />

        <p className="font-medium text-slate-800 pt-1">Nhập module & package</p>
        <CodeBlock
          code={`#import "phu-luc.typ": tieu-de, bang-bieu
#include "chuong-1.typ"

// Gói từ Typst Universe
#import "@preview/cetz:0.3.1": canvas`}
        />
        <Callout tone="info" title="Toán tử">
          Số học <C>+ - * /</C>; so sánh <C>== != &lt; &lt;= &gt; &gt;=</C>; luận lý{" "}
          <C>not and or</C>; tập hợp <C>in</C>, <C>not in</C>; gán <C>= += -= *= /=</C>.
        </Callout>
        <Src href="https://typst.app/docs/reference/scripting/">typst.app/docs/reference/scripting</Src>
      </>
    ),
  },
  {
    id: "bo-cuc",
    label: "Bố cục trang & định dạng",
    icon: LayoutPanelTop,
    content: (
      <>
        <p>
          Dùng quy tắc <C>#set</C> ở đầu tài liệu để thiết lập khổ giấy, lề, giãn dòng, đánh số tiêu
          đề và mục lục cho toàn bộ văn bản phía sau.
        </p>
        <CodeBlock
          code={`#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 3cm, right: 2cm),
  numbering: "1",
)
#set par(justify: true, first-line-indent: 1.25em, leading: 1em)
#set heading(numbering: "1.1.1")

#outline(title: "Mục lục")
#align(center)[#text(size: 18pt, weight: "bold")[ĐỒ ÁN TỐT NGHIỆP]]
#pagebreak()`}
          caption="Khổ A4, lề theo quy định, căn đều hai bên, thụt đầu dòng, tiêu đề đánh số tự động, có mục lục và ngắt sang trang mới."
        />
        <FnChips
          refs={[
            { category: "layout", fn: "page" },
            { category: "model", fn: "par" },
            { category: "model", fn: "heading" },
            { category: "model", fn: "outline" },
            { category: "layout", fn: "align" },
          ]}
        />
        <Callout tone="info">
          Đầy đủ các hàm bố cục (<C>grid</C>, <C>columns</C>, <C>stack</C>, <C>place</C>, <C>h</C>,{" "}
          <C>v</C>…) và định dạng chữ (<C>text</C>) xem ở{" "}
          <Link to="/huong-dan/tra-cuu-typst" className="font-medium text-[#007bff] hover:underline">
            Tra cứu hàm &amp; phần tử Typst
          </Link>
          .
        </Callout>
      </>
    ),
  },
  {
    id: "hinh-bang",
    label: "Hình ảnh, bảng & trích dẫn",
    icon: ImageIcon,
    content: (
      <>
        <p>
          Dùng <C>#figure()</C> để chèn hình hoặc bảng kèm chú thích và đánh số tự động. Gắn nhãn{" "}
          <C>&lt;...&gt;</C> để tham chiếu chéo bằng <C>@...</C>.
        </p>
        <Example
          code={`#figure(
  image("hinh/kien-truc.png", width: 70%),
  caption: [Sơ đồ kiến trúc hệ thống],
) <fig-kientruc>

Xem chi tiết ở @fig-kientruc.

#figure(
  table(
    columns: 3,
    table.header[STT][Họ và tên][Điểm],
    [1], [Nguyễn Văn A], [9.0],
    [2], [Trần Thị B],   [8.5],
  ),
  caption: [Bảng điểm sinh viên],
)`}
          caption='Khi đã đặt lang: "vi", chú thích tự hiển thị "Hình 1", "Bảng 1".'
        >
          <PreviewImage id="figure-table" alt="Kết quả: hình có chú thích 'Hình 1' và bảng điểm có chú thích 'Bảng 1'" />
        </Example>
        <FnChips
          refs={[
            { category: "model", fn: "figure" },
            { category: "visualize", fn: "image" },
            { category: "model", fn: "table" },
            { category: "model", fn: "ref" },
          ]}
        />
        <Callout tone="info" title="Xem thêm">
          <Link to="/huong-dan/trich-dan" className="font-medium text-[#007bff] hover:underline">
            Trích dẫn &amp; tài liệu tham khảo
          </Link>
          {" · "}
          <Link to="/huong-dan/tra-cuu-typst" className="font-medium text-[#007bff] hover:underline">
            Tra cứu hàm &amp; phần tử
          </Link>
          {" · "}
          <Link to="/huong-dan/loi-thuong-gap" className="font-medium text-[#007bff] hover:underline">
            Lỗi thường gặp
          </Link>
        </Callout>
      </>
    ),
  },
  {
    id: "ky-hieu",
    label: "Ký tự đặc biệt & Unicode",
    icon: Hash,
    content: (
      <>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
          <li>
            <C>#</C>, <C>*</C>, <C>_</C>, <C>$</C>, <C>@</C>, <C>&lt;</C>, <C>`</C> là ký tự đặc biệt
            — thêm dấu <C>\</C> phía trước để gõ nguyên văn: <C>\#</C>, <C>\*</C>, <C>\$</C>.
          </li>
          <li>
            Chèn ký tự Unicode theo mã: <C>\u{"{1F600}"}</C> (😀). Khoảng trắng không ngắt: <C>~</C>.
          </li>
          <li>
            Gạch ngang: <C>--</C> → – (en dash), <C>---</C> → — (em dash); ba chấm <C>...</C> → …
          </li>
        </ul>
        <Src href="https://typst.app/docs/reference/symbols/">typst.app/docs/reference/symbols</Src>
      </>
    ),
  },
];

export function TypstSyntax() {
  return (
    <HelpLayout
      title="Cú pháp Typst & gõ tiếng Việt"
      description="Tham chiếu cú pháp Typst đầy đủ (ba chế độ Markup / Math / Code) và cách gõ tiếng Việt có dấu — đúng phiên bản trình soạn thảo đang dùng, biên soạn theo tài liệu chính thức của Typst."
      badge={<VersionBadge />}
      action={
        <Button asChild className="bg-[#007bff] hover:bg-[#0056b3] text-white">
          <a href={`${TYPST_DOCS_URL}reference/`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            Tra cứu Typst
          </a>
        </Button>
      }
      sections={SECTIONS}
    />
  );
}
