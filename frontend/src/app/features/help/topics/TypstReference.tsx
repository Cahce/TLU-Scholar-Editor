import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  Calculator,
  ExternalLink,
  Hash,
  LayoutPanelTop,
  ListTree,
  Settings2,
  Shapes,
  Type,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { HelpLayout, type HelpSection } from "../components/HelpLayout";
import { CodeBlock } from "../components/CodeBlock";
import { Example, PreviewImage } from "../components/Example";
import { Callout } from "../components/Callout";
import { VersionBadge } from "../components/VersionBadge";
import { TYPST_DOCS_URL } from "../typstVersion";

function C({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px] text-slate-800">
      {children}
    </code>
  );
}

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

/** Bảng 2 cột: hàm/cú pháp + mô tả. */
function Table2({ rows }: { rows: [string, string][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-500">
            <th className="px-4 py-2.5 font-semibold w-2/5">Hàm / cú pháp</th>
            <th className="px-4 py-2.5 font-semibold">Mô tả</th>
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

/** Bảng 4 cột cho tham số hàm. */
function ParamTable({ rows }: { rows: [string, string, string, string][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-500">
            <th className="px-3 py-2.5 font-semibold">Tham số</th>
            <th className="px-3 py-2.5 font-semibold">Kiểu</th>
            <th className="px-3 py-2.5 font-semibold">Mặc định</th>
            <th className="px-3 py-2.5 font-semibold">Ý nghĩa</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(([name, type, def, meaning]) => (
            <tr key={name} className="hover:bg-slate-50/60 align-top">
              <td className="px-3 py-2.5">
                <code className="font-mono text-[13px] text-slate-800">{name}</code>
              </td>
              <td className="px-3 py-2.5 text-slate-500 font-mono text-[12px]">{type}</td>
              <td className="px-3 py-2.5 text-slate-500 font-mono text-[12px]">{def}</td>
              <td className="px-3 py-2.5 text-slate-600">{meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TEXT_PARAMS: [string, string, string, string][] = [
  ["font", "str / array", '"libertinus serif"', "Font hoặc danh sách ưu tiên"],
  ["size", "length", "11pt", "Cỡ chữ (cơ sở cho đơn vị em)"],
  ["fill", "color", "đen", "Màu chữ"],
  ["weight", "int / str", '"regular"', 'Độ đậm 100–900 hoặc "bold"'],
  ["style", "str", '"normal"', '"normal" / "italic" / "oblique"'],
  ["stretch", "ratio", "100%", "Co giãn bề ngang glyph"],
  ["tracking", "length", "0pt", "Khoảng cách giữa các ký tự"],
  ["spacing", "relative", "100%", "Khoảng cách giữa các từ"],
  ["lang", "str", '"en"', "Mã ngôn ngữ (ngắt từ, nháy thông minh)"],
  ["region", "str", "none", "Mã vùng (ISO 3166, vd VN)"],
  ["dir", "auto / dir", "auto", "Hướng chữ: ltr / rtl"],
  ["hyphenate", "auto / bool", "auto", "Bật/tắt ngắt từ khi xuống dòng"],
  ["fallback", "bool", "true", "Dự phòng font khi thiếu glyph"],
];

const MODEL_ROWS: [string, string][] = [
  ["= ...   /   heading(level, body)", "Tiêu đề mục (cấp theo số dấu =)"],
  ["- ...   /   list(..)", "Danh sách không thứ tự"],
  ["+ ...   /   enum(..)", "Danh sách có đánh số"],
  ["/ T: m   /   terms(..)", "Danh sách định nghĩa"],
  ["table(columns, ..)", "Bảng dữ liệu nhiều hàng/cột"],
  ["figure(body, caption)", "Hình/bảng có chú thích + đánh số tự động"],
  ["image(path, width, fit)", "Chèn ảnh từ file trong project"],
  ['link(dest)[body]', "Liên kết tới URL hoặc vị trí trong tài liệu"],
  ["@label   /   ref(label)", "Tham chiếu chéo tới nhãn"],
  ["@key   /   cite(key)", "Trích dẫn nguồn trong bibliography"],
  ['bibliography("refs.bib", style)', "In danh mục tài liệu tham khảo"],
  ["outline(title, depth)", "Mục lục / danh mục hình, bảng"],
  ["quote(attribution)[..]", "Trích dẫn khối kèm nguồn"],
  ['numbering("1.1", ..)', "Áp kiểu đánh số cho dãy số"],
  ["strong[..]  /  *..*", "In đậm"],
  ["emph[..]  /  _.._", "In nghiêng"],
];

const LAYOUT_ROWS: [string, string][] = [
  ["page(paper, margin, numbering)", "Khổ trang, lề, đánh số trang"],
  ["par(justify, leading, first-line-indent)", "Định dạng đoạn văn"],
  ["align(center)[..]", "Căn lề nội dung (left/center/right, top/horizon/bottom)"],
  ["pad(x, y)[..]", "Đệm khoảng trắng quanh nội dung"],
  ["block / box", "Khối cấp khối / hộp nội dòng có kích thước"],
  ["columns(n)[..]", "Chia vùng thành n cột bằng nhau"],
  ["grid(columns, rows, gutter)", "Lưới tổng quát"],
  ["stack(dir, spacing, ..)", "Xếp chồng phần tử có khoảng cách"],
  ["place(top + right, dx, dy)[..]", "Đặt vị trí tương đối, không chiếm chỗ"],
  ["move / rotate / scale", "Dịch / xoay / phóng to (không ảnh hưởng bố cục)"],
  ["repeat[..]", "Lặp nội dung lấp đầy khoảng trống"],
  ["h(amount)  /  v(amount)", "Khoảng trắng ngang / dọc (hỗ trợ fr)"],
  ["pagebreak()  /  colbreak()", "Ngắt sang trang / cột mới"],
];

const VISUAL_ROWS: [string, string][] = [
  ["image(path, width, height, fit)", "Chèn ảnh (PNG, JPG, SVG, GIF)"],
  ["rect / square", "Hình chữ nhật / vuông (fill, stroke, radius)"],
  ["circle / ellipse", "Hình tròn / elip"],
  ["line / path / curve / polygon", "Đường thẳng / cong / đa giác"],
  ['read("file")', "Đọc nội dung file dạng văn bản thô"],
  ["csv / json / yaml / xml / toml", "Nạp dữ liệu có cấu trúc thành mảng/từ điển"],
];

const FOUNDATION_ROWS: [string, string][] = [
  ["calc.abs  calc.pow(x, y)  calc.sqrt(x)", "Trị tuyệt đối / luỹ thừa / căn bậc hai"],
  ["calc.min  calc.max  calc.round(x, digits: 2)", "Nhỏ nhất / lớn nhất / làm tròn"],
  ["calc.floor  calc.ceil  calc.rem  calc.pi", "Làm tròn xuống/lên, phần dư, hằng π"],
  [".len  .upper  .lower  .split  .replace  .trim", "Phương thức chuỗi (str)"],
  [".at  .push  .pop  .map  .filter  .fold  .sorted  .rev  .join  .sum", "Phương thức mảng (array)"],
  [".keys  .values  .pairs  .insert  .remove", "Phương thức từ điển (dictionary)"],
  ["type(x)  repr(x)  assert(đk)  eval(\"...\")", "Kiểu, biểu diễn, kiểm tra, đánh giá chuỗi mã"],
];

const INTROSPECTION_ROWS: [string, string][] = [
  ['counter("tên")  .step()  .update(n)', "Tạo & thay đổi bộ đếm tuỳ biến"],
  [".get()  .at(vị-trí)  .display(định-dạng)", "Đọc & hiển thị giá trị đếm (cần context)"],
  ['state("khoá", giá-trị-đầu)  .update()  .get()', "Lưu & đọc trạng thái dùng chung"],
  ["here()  locate()  query(bộ-chọn)", "Vị trí hiện tại / tìm phần tử trong tài liệu"],
  ["context biểu-thức", "Truy cập giá trị phụ thuộc vị trí/ngữ cảnh"],
];

const SECTIONS: HelpSection[] = [
  {
    id: "set-show",
    label: "Quy tắc Set & Show",
    icon: Settings2,
    content: (
      <>
        <p>
          Hai cơ chế định kiểu mạnh nhất của Typst. <strong>Set</strong> đổi giá trị mặc định cho
          một loại phần tử; <strong>Show</strong> biến đổi cách hiển thị phần tử.
        </p>
        <CodeBlock
          code={`// SET — đổi mặc định, áp dụng tới hết file/khối hiện tại
#set text(font: "Libertinus Serif", size: 13pt, lang: "vi")
#set heading(numbering: "1.1")
#set par(justify: true)

// SET trong phạm vi giới hạn (chỉ ảnh hưởng khối)
#[
  #set list(marker: [--])
  - Mục dùng dấu gạch
]`}
        />
        <CodeBlock
          code={String.raw`// SHOW-SET — chỉ áp set cho phần tử được chọn
#show heading: set text(navy)

// SHOW biến đổi hoàn toàn (it là phần tử)
#show heading.where(level: 1): it => [
  Chương: #it.body
]

// SHOW trên văn bản và biểu thức chính quy (regex)
#show "TLU": smallcaps
#show regex("\d+"): it => text(blue, it.text)

// SHOW everything — bọc toàn bộ tài liệu
#show: doc => columns(2, doc)`}
          caption="it là phần tử được khớp; truy cập trường bằng it.body, it.level..."
        />
        <Example
          code={`#show heading: set text(navy)
#show heading.where(level: 1): it => [Chương: #it.body]
#show regex("\\d+"): set text(blue)

= Giới thiệu
Phiên bản 2024, cập nhật 12 lần.`}
        >
          <PreviewImage id="set-show" alt="Kết quả: tiêu đề màu xanh navy và các con số tô xanh qua regex" />
        </Example>
        <Src href="https://typst.app/docs/reference/styling/">typst.app/docs/reference/styling</Src>
      </>
    ),
  },
  {
    id: "dinh-dang-chu",
    label: "Định dạng chữ — text()",
    icon: Type,
    content: (
      <>
        <p>
          Hàm <C>text()</C> điều khiển toàn bộ thuộc tính chữ. Dùng qua <C>#set text(...)</C> cho
          toàn cục hoặc <C>#text(...)[...]</C> cho một đoạn.
        </p>
        <ParamTable rows={TEXT_PARAMS} />
        <Example
          code={`#set text(font: "Times New Roman", size: 13pt, lang: "vi", region: "VN")

#text(weight: "bold")[Đậm], #text(style: "italic")[nghiêng],
#text(size: 1.5em, fill: blue)[to và xanh],
#text(tracking: 1pt)[giãn ký tự].`}
        >
          <PreviewImage id="text-format" alt="Kết quả: chữ đậm, nghiêng, to màu xanh và giãn ký tự" />
        </Example>
        <Src href="https://typst.app/docs/reference/text/text/">typst.app/docs/reference/text/text</Src>
      </>
    ),
  },
  {
    id: "phan-tu-model",
    label: "Phần tử nội dung — Model",
    icon: ListTree,
    content: (
      <>
        <p>
          Nhóm phần tử cấu trúc tài liệu: tiêu đề, danh sách, bảng, hình, trích dẫn, mục lục. Nhiều
          phần tử có cả cú pháp ngắn (markup) lẫn dạng hàm.
        </p>
        <Table2 rows={MODEL_ROWS} />
        <Example
          code={`#heading(level: 2)[Phần mở đầu]

#figure(
  image("so-do.png", width: 60%),
  caption: [Sơ đồ tổng quan],
) <so-do>

#table(
  columns: 2,
  table.header[Tiêu chí][Giá trị],
  [Khổ giấy], [A4],
  [Cỡ chữ], [13pt],
)

Xem @so-do và #link("https://typst.app")[trang chủ Typst].`}
        >
          <PreviewImage id="model" alt="Kết quả: tiêu đề, hình có chú thích, bảng hai cột và liên kết" />
        </Example>
        <Src href="https://typst.app/docs/reference/model/">typst.app/docs/reference/model</Src>
      </>
    ),
  },
  {
    id: "bo-cuc-layout",
    label: "Bố cục — Layout",
    icon: LayoutPanelTop,
    content: (
      <>
        <p>Nhóm hàm sắp đặt vị trí, khoảng cách, cột, lưới và phân trang.</p>
        <Table2 rows={LAYOUT_ROWS} />
        <Example
          code={`#align(center)[#text(18pt, weight: "bold")[TIÊU ĐỀ]]

#grid(
  columns: (1fr, 1fr),
  gutter: 1em,
  [Cột trái], [Cột phải],
)

Văn bản #h(1fr) căn sang phải.`}
        >
          <PreviewImage id="layout" alt="Kết quả: tiêu đề căn giữa, lưới hai cột và đoạn căn sang phải" />
        </Example>
        <Src href="https://typst.app/docs/reference/layout/">typst.app/docs/reference/layout</Src>
      </>
    ),
  },
  {
    id: "foundations",
    label: "Nền tảng — Foundations",
    icon: Calculator,
    content: (
      <>
        <p>
          Nhóm nền tảng: kiểu dữ liệu, module <C>calc</C> (toán) và các phương thức cho chuỗi, mảng,
          từ điển.
        </p>
        <Table2 rows={FOUNDATION_ROWS} />
        <Example
          code={`#calc.pow(2, 10)               // 1024
#calc.round(3.14159, digits: 2) // 3.14
#(3, 1, 2).sorted()            // (1, 2, 3)
#(3, 1, 2).map(x => x * 2)     // (6, 2, 4)
#"a,b,c".split(",").len()      // 3`}
        >
          <PreviewImage id="foundations" alt="Kết quả tính toán: luỹ thừa, làm tròn, sắp xếp, nhân đôi, số phần tử" />
        </Example>
        <Src href="https://typst.app/docs/reference/foundations/">typst.app/docs/reference/foundations</Src>
      </>
    ),
  },
  {
    id: "introspection",
    label: "Tự quan sát — Introspection",
    icon: Hash,
    content: (
      <>
        <p>
          Cho phép các phần của tài liệu &quot;trao đổi&quot; với nhau: bộ đếm, trạng thái dùng
          chung và truy vấn phần tử. Hầu hết cần từ khoá <C>context</C>.
        </p>
        <Table2 rows={INTROSPECTION_ROWS} />
        <Example
          code={`// Bộ đếm tuỳ biến
#let dem = counter("muc")
#dem.update(1)
Mục số #context dem.get().first().

// Trạng thái dùng chung
#let ten = state("ten", "TLU")
#context ten.get()

// Số trang hiện tại
#context here().page()`}
        >
          <PreviewImage id="introspection" alt="Kết quả: bộ đếm = 1, trạng thái = TLU, số trang = 1" />
        </Example>
        <Callout tone="info">
          Các hàm tự quan sát chạy trong <C>context</C> vì giá trị phụ thuộc vị trí. Xem thêm{" "}
          <a
            href="https://typst.app/docs/reference/context/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#007bff] hover:underline"
          >
            tài liệu Context
          </a>
          .
        </Callout>
        <Src href="https://typst.app/docs/reference/introspection/">typst.app/docs/reference/introspection</Src>
      </>
    ),
  },
  {
    id: "truc-quan-du-lieu",
    label: "Trực quan & dữ liệu",
    icon: Shapes,
    content: (
      <>
        <p>
          Chèn ảnh, vẽ hình cơ bản và nạp dữ liệu từ file. Với sơ đồ phức tạp, dùng package từ Typst
          Universe (vd <C>cetz</C>, <C>fletcher</C>).
        </p>
        <Table2 rows={VISUAL_ROWS} />
        <Example
          code={`#rect(width: 4cm, height: 1.6cm, radius: 4pt,
      fill: blue.lighten(85%), stroke: blue)[Hộp]
#h(10pt)
#circle(radius: 0.8cm, fill: red.lighten(70%))`}
        >
          <PreviewImage id="visualize" alt="Kết quả: hộp bo góc nền xanh nhạt và hình tròn đỏ" />
        </Example>
        <CodeBlock
          code={`#let bang = csv("diem.csv")
Số dòng dữ liệu: #bang.len()`}
          caption="Nạp dữ liệu từ file .csv trong project (cần có file dữ liệu tương ứng)."
        />
        <Callout tone="info">
          Tra cứu đầy đủ các nhóm còn lại (Foundations, Introspection, Symbols…) tại{" "}
          <a
            href="https://typst.app/docs/reference/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#007bff] hover:underline"
          >
            trang Reference của Typst
          </a>
          .
        </Callout>
        <Src href="https://typst.app/docs/reference/visualize/">typst.app/docs/reference/visualize</Src>
      </>
    ),
  },
];

export function TypstReference() {
  return (
    <HelpLayout
      title="Tra cứu hàm & phần tử Typst"
      description={
        <>
          Bản dịch tiếng Việt phần Reference của Typst: quy tắc Set/Show, định dạng chữ, phần tử nội
          dung (Model), bố cục (Layout) và trực quan/dữ liệu — theo phiên bản đang dùng.{" "}
          <Link to="/huong-dan/tra-cuu" className="font-medium text-[#007bff] hover:underline">
            Mở bộ tra cứu đầy đủ tham số →
          </Link>
        </>
      }
      badge={<VersionBadge />}
      action={
        <Button asChild className="bg-[#007bff] hover:bg-[#0056b3] text-white">
          <a href={`${TYPST_DOCS_URL}reference/`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            Reference gốc
          </a>
        </Button>
      }
      sections={SECTIONS}
    />
  );
}
