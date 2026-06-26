import { Link } from "react-router";
import { BookUser, GraduationCap, LogIn, ShieldCheck } from "lucide-react";
import { HelpLayout, type HelpSection } from "../components/HelpLayout";
import { Callout } from "../components/Callout";

const Code = ({ children }: { children: string }) => (
  <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px] text-slate-800">
    {children}
  </code>
);

const SECTIONS: HelpSection[] = [
  {
    id: "dang-nhap",
    label: "Đăng nhập & tài khoản",
    icon: LogIn,
    content: (
      <>
        <p>
          Tài khoản do quản trị viên cấp. Truy cập trang đăng nhập, nhập <strong>email</strong> và{" "}
          <strong>mật khẩu</strong> được cấp để vào hệ thống.
        </p>
        <ol className="list-decimal pl-5 space-y-1.5 marker:text-slate-400">
          <li>Đăng nhập tại trang chủ bằng email và mật khẩu.</li>
          <li>
            Lần đầu đăng nhập, hệ thống yêu cầu <strong>đổi mật khẩu bắt buộc</strong> (trang{" "}
            <Code>/doi-mat-khau</Code>) trước khi dùng các chức năng khác.
          </li>
          <li>Sau khi đổi mật khẩu, bạn được đưa tới bảng điều khiển theo vai trò.</li>
        </ol>
        <Callout tone="tip" title="Hồ sơ & đổi mật khẩu">
          Mở menu người dùng ở góc phải Header: <strong>Hồ sơ cá nhân</strong> để xem thông tin,
          nút <strong>Đổi mật khẩu</strong> để cập nhật mật khẩu bất cứ lúc nào.
        </Callout>
        <Callout tone="warning" title="Quên mật khẩu / tài khoản bị khoá">
          Hệ thống không tự đặt lại mật khẩu. Hãy liên hệ <strong>quản trị viên</strong> để được
          cấp lại mật khẩu hoặc mở khoá tài khoản.
        </Callout>
      </>
    ),
  },
  {
    id: "sinh-vien",
    label: "Dành cho sinh viên",
    icon: GraduationCap,
    content: (
      <>
        <p>
          Sau khi đăng nhập, sinh viên vào bảng điều khiển <Code>/student</Code> để quản lý và soạn
          thảo tài liệu của mình.
        </p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
          <li>
            <strong>Tạo project mới</strong>: bắt đầu một tài liệu trống hoặc chọn một{" "}
            <strong>Template</strong> (đồ án, báo cáo, đề cương…).
          </li>
          <li>
            <strong>Import project</strong>: tải lên một project Typst dạng <Code>.zip</Code> đã có
            sẵn từ máy.
          </li>
          <li>
            <strong>Mở workspace</strong>: nhấp vào một project để vào trình soạn thảo{" "}
            <Code>/workspace/:id</Code> và bắt đầu viết.
          </li>
          <li>
            Theo dõi <strong>project gần đây</strong> và <strong>project được chia sẻ</strong> với
            bạn (mục <Code>/student/shared</Code>).
          </li>
        </ul>
        <Callout tone="info">
          Cách dùng chi tiết trình soạn thảo xem ở{" "}
          <Link to="/huong-dan/trinh-soan-thao" className="font-medium text-[#007bff] hover:underline">
            Trình soạn thảo (editor)
          </Link>
          .
        </Callout>
      </>
    ),
  },
  {
    id: "giang-vien",
    label: "Dành cho giảng viên",
    icon: BookUser,
    content: (
      <>
        <p>
          Giảng viên vào bảng điều khiển <Code>/teacher</Code> với các khu vực quản lý project và
          theo dõi sinh viên hướng dẫn.
        </p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
          <li>
            <strong>Project của tôi</strong>, <strong>Tất cả project</strong> (<Code>/teacher/all</Code>)
            và <strong>Project được chia sẻ</strong> (<Code>/teacher/shared</Code>).
          </li>
          <li>Tạo project mới hoặc mở workspace để biên soạn, góp ý tài liệu.</li>
          <li>
            Cập nhật <strong>Hồ sơ cá nhân</strong> tại <Code>/teacher/profile</Code> (học hàm, học
            vị, bộ môn…).
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "quan-tri",
    label: "Dành cho quản trị viên",
    icon: ShieldCheck,
    content: (
      <>
        <p>
          Quản trị viên dùng khu vực <Code>/admin</Code> để vận hành hệ thống. Sidebar trái liệt kê
          đầy đủ các mục quản trị.
        </p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
          <li>
            <strong>Quản lý tài khoản</strong> (<Code>/admin/accounts</Code>), <strong>Sinh viên</strong>,{" "}
            <strong>Giảng viên</strong> — tạo, sửa, cấp lại mật khẩu, khoá/mở tài khoản.
          </li>
          <li>
            <strong>Cấu trúc học thuật</strong>: Khoa, Bộ môn, Ngành, Lớp — mỗi danh mục hỗ trợ
            nhập hàng loạt từ file XLSX/CSV.
          </li>
          <li>
            <strong>Quản lý dự án</strong> (<Code>/admin/projects</Code>): giám sát, xem chi tiết,
            thống kê và xuất dữ liệu project toàn hệ thống.
          </li>
          <li>
            <strong>Mẫu tài liệu</strong> (<Code>/admin/templates</Code>): tạo và xuất bản các
            Template; có thể mở workspace để biên soạn nội dung mẫu.
          </li>
        </ul>
      </>
    ),
  },
];

export function GettingStarted() {
  return (
    <HelpLayout
      title="Bắt đầu nhanh & theo vai trò"
      description="Các bước sử dụng TLU Scholar Editor cho từng vai trò: đăng nhập, tạo/quản lý project và mở trình soạn thảo."
      sections={SECTIONS}
    />
  );
}
