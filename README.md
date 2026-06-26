# TLU Scholar Editor

Hệ thống soạn thảo luận văn trực tuyến sử dụng Typst cho Đại học Thủy Lợi.

## 📁 Cấu trúc dự án

```
TLU-Scholar-Editor/
├── backend/          # Backend API (Fastify + TypeScript + Prisma)
├── frontend/         # Frontend Web App (React + Vite + TypeScript)
└── README.md
```

## 🚀 Backend

### Công nghệ
- **Framework**: Fastify 5
- **Language**: TypeScript (ESM)
- **Database**: PostgreSQL
- **ORM**: Prisma 7
- **Auth**: JWT
- **Architecture**: Clean Architecture (Modular Monolith)

### Cài đặt

```bash
cd backend
npm install
```

### Cấu hình

Tạo file `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/tlu_scholar"
JWT_SECRET="your-secret-key"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="7d"
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN="http://localhost:5173"
```

### Chạy Migration

```bash
cd backend
npx prisma migrate dev
```

### Khởi động Development Server

```bash
cd backend
npm run dev
```

Server sẽ chạy tại: http://localhost:3000

### API Documentation

Swagger UI: http://localhost:3000/docs

## 🎨 Frontend

### Công nghệ
- **Framework**: React 18
- **Build Tool**: Vite
- **Router**: React Router 7
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui style
- **State Management**: Zustand
- **Editor**: CodeMirror 6
- **Typst**: WASM-based rendering

### Cài đặt

```bash
cd frontend
npm install
```

### Cấu hình

Tạo file `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

### Khởi động Development Server

```bash
cd frontend
npm run dev
```

App sẽ chạy tại: http://localhost:5173

### Build Production

```bash
cd frontend
npm run build
```

## 🏗️ Kiến trúc hệ thống

### Backend Architecture

```
backend/
├── src/
│   ├── modules/           # Business modules (Clean Architecture)
│   │   ├── auth/          # Authentication & Authorization
│   │   ├── admin/         # Admin management
│   │   ├── projects/      # Project management
│   │   ├── project-files/ # File operations
│   │   ├── compile/       # Typst compilation
│   │   ├── templates/     # Template management
│   │   ├── bibliography/  # Bibliography management
│   │   ├── zotero/        # Zotero integration
│   │   └── ...
│   ├── plugins/           # Fastify plugins
│   ├── config/            # Configuration
│   └── shared/            # Shared utilities
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
└── tests/                 # Tests
```

Mỗi module tuân theo Clean Architecture:
- **delivery/http**: Routes và DTOs
- **application**: Use cases
- **domain**: Domain logic, entities, policies
- **infra**: Prisma repositories

### Frontend Architecture

```
frontend/
├── src/
│   └── app/
│       ├── api/              # API clients
│       ├── components/       # Reusable components
│       │   ├── ui/          # shadcn/ui components
│       │   ├── layout/      # Layout components
│       │   └── admin/       # Admin components
│       ├── editor/          # Typst editor subsystem
│       │   ├── components/  # Editor UI
│       │   ├── services/    # Editor services
│       │   ├── extensions/  # CodeMirror extensions
│       │   └── hooks/       # Editor hooks
│       ├── features/        # Feature modules
│       │   ├── auth/        # Authentication UI
│       │   ├── admin/       # Admin pages
│       │   ├── student/     # Student dashboard
│       │   ├── teacher/     # Teacher dashboard
│       │   ├── workspace/   # Editor workspace
│       │   └── help/        # Help center
│       ├── hooks/           # React hooks
│       ├── stores/          # Zustand stores
│       ├── types/           # TypeScript types
│       └── routes.ts        # Route definitions
└── public/                  # Static assets
```

## 🔑 Tính năng chính

### Quản lý người dùng
- ✅ Xác thực JWT (Access + Refresh tokens)
- ✅ Phân quyền theo vai trò (Admin, Teacher, Student)
- ✅ Quản lý tài khoản và profile

### Quản lý học vụ (Admin)
- ✅ Quản lý khoa, bộ môn, ngành, lớp
- ✅ Quản lý giảng viên và sinh viên
- ✅ Import hàng loạt từ XLSX/CSV

### Soạn thảo luận văn
- ✅ Editor Typst với syntax highlighting
- ✅ Live preview
- ✅ Multi-file project support
- ✅ Auto-save
- ✅ File tree management
- ✅ Visual editing widgets

### Quản lý tài liệu tham khảo
- ✅ Quản lý bibliography (.bib)
- ✅ Tích hợp Zotero
- ✅ OpenAlex integration
- ✅ Web-to-citation capture

### Templates
- ✅ Template system với versioning
- ✅ Tạo project từ template
- ✅ Template marketplace (admin)

### Compile & Export
- ✅ Server-side compilation
- ✅ PDF export
- ✅ Diagnostics mapping

### Help Center
- ✅ Typst reference documentation
- ✅ Function library với examples
- ✅ Symbol gallery (600+ symbols)
- ✅ Comprehensive search

## 📝 Scripts

### Backend

```bash
npm run dev          # Development server
npm run build        # Build production
npm run test         # Run all tests
npm run test:unit    # Unit tests only
npm run test:api     # API tests
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
```

### Frontend

```bash
npm run dev          # Development server
npm run build        # Build production
npm run preview      # Preview production build
npm run lint         # Lint code
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm run test:unit:auth
npm run test:unit:projects
npm run test:api:auth
npm run test:api:projects
```

### Frontend Tests

```bash
cd frontend
npm run test
```

## 📦 Deployment

### Backend

1. Set environment variables
2. Run migrations: `npx prisma migrate deploy`
3. Build: `npm run build`
4. Start: `npm start`

### Frontend

1. Set `VITE_API_BASE_URL`
2. Build: `npm run build`
3. Serve `dist/` directory

## 🔒 Security

- JWT-based authentication với rotating refresh tokens
- Password hashing với bcrypt
- Input validation với Zod
- SQL injection protection (Prisma)
- XSS protection
- CORS configuration

## 📄 License

[Your License Here]

## 👥 Contributors

Developed for Thuy Loi University

## 📞 Support

[Your Support Information Here]
