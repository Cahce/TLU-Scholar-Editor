import { useState } from "react";
import { FileText } from "lucide-react";
import { cn } from "./ui/utils";

/**
 * Logo thương hiệu dùng chung. Ưu tiên hiển thị file logo trường đặt tại
 * `public/logo-tlu.svg` (hoặc `.png`). Nếu chưa có file, tự rơi về icon ô vuông
 * như cũ — không bao giờ hiện ảnh vỡ. Đặt file logo vào `public/` là hiện ngay
 * ở mọi nơi (header, đăng nhập, đổi mật khẩu, About...).
 */
const SOURCES = ["/logo-tlu.svg", "/logo-tlu.png"];

interface BrandLogoProps {
  /** Cạnh (px) của logo, hình vuông. */
  size?: number;
  /** "brand" = ô xanh + icon trắng (nền sáng); "onColor" = ô trắng mờ (nền màu). */
  tone?: "brand" | "onColor";
  /** Bo góc cho ô dự phòng (khi chưa có file logo). */
  rounded?: string;
  className?: string;
}

export function BrandLogo({
  size = 36,
  tone = "brand",
  rounded = "rounded-xl",
  className,
}: BrandLogoProps) {
  const [idx, setIdx] = useState(0);
  const box = { width: size, height: size };

  if (idx < SOURCES.length) {
    return (
      <img
        src={SOURCES[idx]}
        alt="Trường Đại học Thủy Lợi"
        style={box}
        onError={() => setIdx((i) => i + 1)}
        className={cn("shrink-0 object-contain", className)}
      />
    );
  }

  return (
    <span
      style={box}
      className={cn(
        "flex shrink-0 items-center justify-center text-white",
        tone === "onColor" ? "bg-white/20 backdrop-blur-sm" : "bg-[#007bff]",
        rounded,
        className,
      )}
    >
      <FileText size={Math.round(size * 0.5)} />
    </span>
  );
}
