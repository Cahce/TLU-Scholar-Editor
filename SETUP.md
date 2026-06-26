# Setup Instructions

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Installation

### 1. Clone repository

```bash
git clone https://github.com/Cahce/TLU-Scholar-Editor.git
cd TLU-Scholar-Editor
```

### 2. Setup Backend

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Backend will run at: http://localhost:3000

### 3. Setup Frontend

```bash
cd frontend
npm install

# Download required WASM files
npm run sync-wasm

# Create .env file
cp .env.example .env
# VITE_API_BASE_URL should be http://localhost:3000/api/v1

# Start development server
npm run dev
```

Frontend will run at: http://localhost:5173

## Missing Files

Some large binary files were excluded from the repository to reduce size:

### Frontend WASM files (will be downloaded by npm run sync-wasm):
- `frontend/public/wasm/typst_ts_web_compiler_bg.wasm` (~27MB)
- `frontend/public/wasm/typst_ts_renderer_bg.wasm`

### Fonts (optional, app will use fallbacks):
- `frontend/public/fonts/core/*.ttf`
- `frontend/public/fonts/core/*.otf`

The `sync-wasm` script will automatically download the required WASM files.

## Production Build

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Serve the dist/ directory
```

## Troubleshooting

### Database connection fails
- Check PostgreSQL is running
- Verify DATABASE_URL in backend/.env

### Frontend can't connect to backend
- Check backend is running on port 3000
- Verify VITE_API_BASE_URL in frontend/.env
- Check CORS_ORIGIN in backend/.env

### WASM files missing
- Run `npm run sync-wasm` in frontend directory
- Or manually download from Typst releases

## Support

For issues, please check:
- Backend logs: `backend/*.log`
- Frontend console: Browser DevTools
- Database: `npx prisma studio` in backend directory
