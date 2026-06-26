import { AlertTriangle, Languages, Type } from "lucide-react";
import { HelpLayout, type HelpSection } from "../components/HelpLayout";
import { Callout } from "../components/Callout";

const SECTIONS: HelpSection[] = [
  {
    id: "loi-tieng-viet",
    label: "Tiếng Việt & font",
    icon: Languages,
    content: (
      <div className="space-y-3">
        <Callout tone="warning" title="Chữ mất dấu hoặc hiện ô vuông (□)">
          Font đang dùng không có ký tự tiếng Việt. Đổi sang font hỗ trợ tiếng Việt bằng{" "}
          <code>#set text(font: "...")</code> (ví dụ &quot;Libertinus Serif&quot;, &quot;Noto
          Serif&quot;). Nếu dùng font riêng, hãy tải file <code>.ttf</code> vào project trước.
        </Callout>
        <Callout tone="tip" title="Ngắt từ / nhãn không đúng tiếng Việt">
          Thêm <code>#set text(lang: "vi", region: "VN")</code> ở đầu tài liệu để bật ngắt từ tiếng
          Việt và tự dịch nhãn (Hình, Bảng…).
        </Callout>
      </div>
    ),
  },
  {
    id: "loi-cu-phap",
    label: "Cú pháp & công thức",
    icon: Type,
    content: (
      <div className="space-y-3">
        <Callout tone="warning" title="Lỗi khi gõ dấu # * _ trong văn bản">
          Đây là ký tự đặc biệt. Thêm dấu <code>\</code> phía trước để gõ nguyên văn: <code>\#</code>,{" "}
          <code>\*</code>, <code>\_</code>.
        </Callout>
        <Callout tone="warning" title="Công thức toán không hiển thị đúng">
          Kiểm tra đã đặt công thức giữa hai dấu <code>$</code>. Công thức khối cần có khoảng trắng:{" "}
          <code>$ ... $</code>.
        </Callout>
      </div>
    ),
  },
  {
    id: "loi-bien-dich",
    label: "Biên dịch & tệp",
    icon: AlertTriangle,
    content: (
      <div className="space-y-3">
        <Callout tone="warning" title="Lỗi 'file not found' cho ảnh hoặc .bib">
          Đường dẫn không khớp vị trí thật trong cây thư mục (phân biệt hoa/thường). Kiểm tra lại
          đường dẫn tương đối tới file trong project.
        </Callout>
        <Callout tone="tip" title="Tài liệu lớn biên dịch chậm">
          Tiếp tục soạn thảo với Preview nhanh, chỉ dùng <strong>Xuất PDF</strong> (biên dịch phía
          máy chủ) khi cần bản hoàn chỉnh cuối cùng.
        </Callout>
        <Callout tone="info" title="Xem lỗi ở đâu?">
          Mở bảng <strong>Lỗi biên dịch (Issues)</strong> trong workspace để xem danh sách cảnh báo
          và lỗi kèm vị trí dòng để sửa nhanh.
        </Callout>
      </div>
    ),
  },
];

export function Troubleshooting() {
  return (
    <HelpLayout
      title="Lỗi thường gặp & câu hỏi"
      description="Cách khắc phục các sự cố phổ biến khi soạn thảo và biên dịch tài liệu Typst."
      sections={SECTIONS}
    />
  );
}
