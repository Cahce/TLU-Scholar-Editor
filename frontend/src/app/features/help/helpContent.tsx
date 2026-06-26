import type { ComponentType } from "react";
import {
  AlertTriangle,
  BookMarked,
  ExternalLink,
  FileCode,
  Globe,
  Library,
  PanelsTopLeft,
  Quote,
  Rocket,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { GettingStarted } from "./topics/GettingStarted";
import { EditorGuide } from "./topics/EditorGuide";
import { TypstSyntax } from "./topics/TypstSyntax";
import { TypstReference } from "./topics/TypstReference";
import { CitationQuickstart } from "./topics/CitationQuickstart";
import { Citations } from "./topics/Citations";
import { Zotero } from "./topics/Zotero";
import { OpenAlex } from "./topics/OpenAlex";
import { WebCapture } from "./topics/WebCapture";
import { Troubleshooting } from "./topics/Troubleshooting";
import { Resources } from "./topics/Resources";

export interface HelpTopic {
  /** Dùng cho route /huong-dan/:topic */
  slug: string;
  title: string;
  /** Mô tả ngắn cho card và kết quả tìm kiếm */
  summary: string;
  icon: LucideIcon;
  /** Từ khoá hỗ trợ tìm kiếm */
  keywords: string[];
  /** Nội dung dạng text để tìm kiếm toàn văn */
  searchText: string;
  Component: ComponentType;
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    slug: "bat-dau",
    title: "Bắt đầu nhanh & theo vai trò",
    summary: "Đăng nhập, đổi mật khẩu, tạo/quản lý project theo vai trò sinh viên, giảng viên, admin.",
    icon: Rocket,
    keywords: ["đăng nhập", "mật khẩu", "vai trò", "sinh viên", "giảng viên", "admin", "tạo project", "import"],
    searchText:
      "Đăng nhập email mật khẩu đổi mật khẩu bắt buộc hồ sơ cá nhân. Sinh viên tạo project mới import zip chọn template mở workspace project được chia sẻ. Giảng viên project của tôi tất cả project. Quản trị viên quản lý tài khoản sinh viên giảng viên khoa bộ môn ngành lớp quản lý dự án mẫu tài liệu template.",
    Component: GettingStarted,
  },
  {
    slug: "trinh-soan-thao",
    title: "Trình soạn thảo (editor)",
    summary: "Quản lý tệp, soạn thảo, biên dịch & Preview, Xuất PDF và các công cụ hỗ trợ.",
    icon: PanelsTopLeft,
    keywords: ["editor", "workspace", "biên dịch", "preview", "xuất pdf", "tệp", "tab", "outline", "tìm kiếm", "lỗi"],
    searchText:
      "Trình soạn thảo workspace giao diện panel tệp cây thư mục upload ảnh font. Nhiều tab thanh chèn nhanh toán hình bảng màu. Tự động lưu autosave trạng thái lưu. Biên dịch preview xuất pdf cửa sổ preview tách rời. Mục lục tìm và thay thế regex lỗi biên dịch issues thiết lập.",
    Component: EditorGuide,
  },
  {
    slug: "cu-phap-typst",
    title: "Cú pháp Typst & gõ tiếng Việt",
    summary: "Cú pháp Typst cốt lõi và cách gõ tiếng Việt có dấu, đúng phiên bản đang dùng.",
    icon: FileCode,
    keywords: ["typst", "cú pháp", "tiếng việt", "font", "unicode", "tiêu đề", "đậm", "nghiêng", "toán", "bảng", "hình"],
    searchText:
      "Cú pháp Typst gõ tiếng Việt có dấu unicode utf-8 unikey telex vni font tofu ô vuông lang vi region VN smartquote. Ba chế độ markup math code. Tiêu đề đậm nghiêng danh sách liên kết nhãn ngắt dòng ghi chú thoát ký tự. Công thức toán phân số ma trận căn ký hiệu shorthand. Hình ảnh bảng figure caption tham chiếu. Hàm biến let for while if import package universe.",
    Component: TypstSyntax,
  },
  {
    slug: "tra-cuu-typst",
    title: "Tra cứu hàm & phần tử Typst",
    summary: "Dịch tiếng Việt phần Reference: Set/Show, text(), Model, Layout, trực quan & dữ liệu.",
    icon: BookMarked,
    keywords: ["reference", "tra cứu", "hàm", "set", "show", "text", "page", "table", "figure", "grid", "outline", "align", "calc", "counter", "state", "context"],
    searchText:
      "Tra cứu hàm phần tử Typst reference. Quy tắc set show rule show-set selector where regex everything. Định dạng chữ text font size fill weight style tracking lang region. Phần tử model heading list enum terms table figure image link ref cite bibliography outline quote numbering strong emph. Bố cục layout page par align pad block box columns grid stack place move rotate scale repeat h v pagebreak colbreak. Nền tảng foundations kiểu dữ liệu calc luỹ thừa căn làm tròn chuỗi mảng từ điển phương thức map filter sorted fold join. Tự quan sát introspection counter bộ đếm state trạng thái here locate query context. Trực quan rect circle line polygon image. Dữ liệu read csv json yaml xml toml.",
    Component: TypstReference,
  },
  {
    slug: "bat-dau-trich-dan",
    title: "Bắt đầu với công cụ trích dẫn",
    summary: "Đường ngắn nhất để có trích dẫn đầu tiên: chọn Zotero / OpenAlex / Thu thập từ web và làm theo 3 bước.",
    icon: Sparkles,
    keywords: ["bắt đầu", "quickstart", "trích dẫn", "zotero", "openalex", "web capture", "bib", "hướng dẫn nhanh"],
    searchText:
      "Bắt đầu với công cụ trích dẫn quickstart đường ngắn nhất trích dẫn đầu tiên. Trước khi bắt đầu dự án file bib refs.bib bảng tài liệu tham khảo tài khoản zotero. Dùng công cụ nào Zotero OpenAlex Thu thập từ web. Zotero 3 bước API key kết nối đồng bộ. OpenAlex không cần tài khoản tìm chọn lưu vào bib. Thu thập từ web dán DOI URL. Trích dẫn lần đầu @key bibliography style ieee.",
    Component: CitationQuickstart,
  },
  {
    slug: "trich-dan",
    title: "Trích dẫn & tài liệu tham khảo",
    summary: "Tạo file .bib, trích dẫn trong Typst và dùng công cụ Zotero / OpenAlex / web capture.",
    icon: Quote,
    keywords: ["trích dẫn", "tài liệu tham khảo", "bib", "bibliography", "zotero", "openalex", "cite", "citation"],
    searchText:
      "Trích dẫn tài liệu tham khảo file bib bibtex khoá trích dẫn citation key. Cú pháp at key cite bibliography style ieee apa. Công cụ Zotero OpenAlex web capture web to cite lưu vào bib tránh trùng.",
    Component: Citations,
  },
  {
    slug: "zotero",
    title: "Kết nối & đồng bộ Zotero",
    summary: "Kết nối thư viện Zotero bằng API key và đồng bộ tài liệu vào .bib; dùng Zotero Connector lưu bài từ web.",
    icon: Library,
    keywords: ["zotero", "api key", "kết nối", "đồng bộ", "sync", "thư viện", "group", "connector", "bib"],
    searchText:
      "Kết nối đồng bộ Zotero API key zotero.org settings keys allow library access write access bảo mật mã hoá. Chọn thư viện cá nhân user nhóm group. Ngắt kết nối. Bộ sưu tập tài liệu mới thêm đồng bộ toàn bộ incremental conflict bỏ qua ghi đè đổi tên bib yml hayagriva. Zotero Connector tiện ích trình duyệt làm mới. Khắc phục lỗi api key sai quyền ghi rate limit.",
    Component: Zotero,
  },
  {
    slug: "openalex",
    title: "Tìm & nhập tài liệu (OpenAlex)",
    summary: "Tìm bài báo học thuật mở và lưu trực tiếp vào .bib — không cần tài khoản hay API key.",
    icon: Search,
    keywords: ["openalex", "tìm kiếm", "bài báo", "doi", "open access", "trích dẫn", "nhập", "bib"],
    searchText:
      "Tìm nhập tài liệu OpenAlex cơ sở dữ liệu học thuật mở miễn phí không cần tài khoản api key. Tìm kiếm từ khoá bộ lọc khoảng năm loại bài báo sách chương sách luận án bài hội nghị open access. Đọc kết quả doi năm tạp chí số lượt trích dẫn tóm tắt. Lưu vào bib đường dẫn conflict đã nhập trùng thất bại chống trùng lặp.",
    Component: OpenAlex,
  },
  {
    slug: "web-capture",
    title: "Tải trích dẫn từ web (Zotero connector)",
    summary: "Dán URL hoặc DOI/arXiv/PMID/ISBN để tạo trích dẫn ngay; DOI/arXiv chạy kể cả khi connector tắt.",
    icon: Globe,
    keywords: ["web capture", "thu thập từ web", "connector", "translation server", "doi", "arxiv", "pmid", "isbn", "url"],
    searchText:
      "Tải trích dẫn từ web thu thập web to cite connector translation server. Dán URL DOI arXiv PMID ISBN xem trước lưu vào bib lưu vào zotero. DOI arXiv không cần connector fallback OpenAlex. URL PMID ISBN cần connector. Khi connector chưa sẵn sàng dùng doi openalex thêm thủ công. Dành cho quản trị tự khởi động. Quyền ghi zotero.",
    Component: WebCapture,
  },
  {
    slug: "loi-thuong-gap",
    title: "Lỗi thường gặp & câu hỏi",
    summary: "Khắc phục sự cố phổ biến: mất dấu/font, ký tự đặc biệt, file not found, biên dịch chậm.",
    icon: AlertTriangle,
    keywords: ["lỗi", "tofu", "mất dấu", "font", "file not found", "biên dịch chậm", "câu hỏi", "faq"],
    searchText:
      "Lỗi thường gặp câu hỏi chữ mất dấu ô vuông tofu đổi font. Gõ ký tự đặc biệt # * _ escape. Công thức toán không hiển thị. File not found ảnh bib đường dẫn. Tài liệu lớn biên dịch chậm dùng xuất pdf. Bảng lỗi issues.",
    Component: Troubleshooting,
  },
  {
    slug: "tai-nguyen",
    title: "Tài nguyên Typst",
    summary: "Liên kết tới tài liệu Typst chính thức để tra cứu chuyên sâu.",
    icon: ExternalLink,
    keywords: ["tài nguyên", "typst docs", "tutorial", "reference", "symbols", "universe", "liên kết"],
    searchText:
      "Tài nguyên Typst liên kết chính thức tài liệu docs hướng dẫn tutorial tra cứu cú pháp reference danh sách ký hiệu symbols kho gói universe.",
    Component: Resources,
  },
];

export function getTopic(slug: string | undefined): HelpTopic | undefined {
  if (!slug) return undefined;
  return HELP_TOPICS.find((topic) => topic.slug === slug);
}

/** Bỏ dấu tiếng Việt + lowercase để so khớp tìm kiếm không phân biệt dấu. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/** Tìm các chủ đề khớp truy vấn (so khớp tiêu đề + tóm tắt + từ khoá + nội dung). */
export function searchTopics(query: string): HelpTopic[] {
  const q = normalizeText(query);
  if (!q) return [];
  return HELP_TOPICS.filter((topic) => {
    const haystack = normalizeText(
      [topic.title, topic.summary, topic.keywords.join(" "), topic.searchText].join(" "),
    );
    return haystack.includes(q);
  });
}
