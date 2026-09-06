# AI Chat App

Ứng dụng chat nhóm thời gian thực tích hợp AI, hỗ trợ đăng ký/đăng nhập, tạo nhóm, chat riêng, tìm kiếm thành viên, dịch thuật tự động và AI Bot trả lời qua `@AI`.

## Tính năng

- Đăng ký / đăng nhập tài khoản
- Chat nhóm thời gian thực qua Socket.io
- Chat riêng 1-1 (DM)
- Tạo nhóm, mời thành viên, rời nhóm
- Đặt biệt danh cho cuộc trò chuyện riêng
- Đổi tên nhóm (chỉ chủ nhóm)
- Tùy chỉnh màu sắc & cỡ chữ cho từng đoạn chat
- Tìm kiếm trong đoạn chat
- Dịch thuật tự động đa ngôn ngữ
- AI Bot trả lời khi nhắn `@AI`
- Gửi file / ảnh / audio trong chat
- Giao diện responsive, hỗ trợ dark/light theme

## Công nghệ

### Frontend
- React + Vite
- Socket.io client
- Lucide icons

### Backend
- Node.js + Express
- Socket.io
- MongoDB + Mongoose
- JWT authentication
- Google Gemini AI

## Chạy ứng dụng ở chế độ local

### 1. Clone repository

```bash
git clone https://github.com/HaVanPhong1/CHAT_APP.git
cd CHAT_APP
```

### 2. Cài đặt dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Cấu hình môi trường

**Backend** - tạo file `backend/.env`:
```env
PORT=5000
JWT_SECRET=change-me-to-a-long-random-string
MONGODB_URI=mongodb://localhost:27017/aichat
GEMINI_API_KEY=your-gemini-api-key
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
SERVE_FRONTEND=false
```

**Frontend** - tạo file `frontend/.env`:
```env
VITE_BACKEND_URL=http://localhost:5000
```

### 4. Khởi chạy MongoDB

Nếu dùng Docker Compose:
```bash
docker compose up -d
```

Hoặc đảm bảo MongoDB đang chạy ở `mongodb://localhost:27017/aichat`.

### 5. Chạy ứng dụng

Mở 2 terminal:

**Terminal 1 - Backend:**
```bash
cd backend
node server.js
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 6. Truy cập

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Deploy lên cloud (Production)

### Backend - Render

1. Push code lên GitHub
2. Vào [Render](https://render.com) → New Web Service
3. Connect repo `CHAT_APP`
4. Cấu hình:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: Free
5. Thêm Environment Variables:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `JWT_SECRET=<random-secret>`
   - `MONGODB_URI=<mongodb-atlas-connection-string>`
   - `GEMINI_API_KEY=<your-gemini-key>`
   - `FRONTEND_URL=<vercel-url>`
   - `SERVE_FRONTEND=true`
6. Click Create Web Service

### Database - MongoDB Atlas

1. Vào [MongoDB Atlas](https://www.mongodb.com/atlas/database)
2. Tạo cluster miễn phí (M0)
3. Tạo database user + password
4. Whitelist IP: `0.0.0.0/0`
5. Copy connection string vào `MONGODB_URI` trên Render

### Frontend - Vercel

1. Vào [Vercel](https://vercel.com) → Import project
2. Chọn repo `CHAT_APP`
3. Cấu hình:
   - Framework: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Thêm Environment Variable:
   - `VITE_BACKEND_URL=<render-backend-url>`
5. Click Deploy

## Lưu ý quan trọng

- **API Key**: Không commit file `.env` lên Git. File `.env.example` chỉ là template.
- **File uploads**: Trên Render, file uploads sẽ mất khi server restart. Để lưu persistent, dùng Cloudinary hoặc AWS S3.
- **Render Free Tier**: Tự động ngủ sau 15 phút không có request. Lần đầu mở sẽ chậm 30-60s.
- **MongoDB Atlas Free**: Giới hạn 512MB storage.

## Scripts

### Backend
- `npm start` - Chạy server production
- `npm run dev` - Chạy server development

### Frontend
- `npm run dev` - Chạy dev server
- `npm run build` - Build production
- `npm run lint` - Chạy linter
- `npm run preview` - Preview build locally

## Troubleshooting

### Lỗi CORS khi đăng ký/đăng nhập trên Vercel
- Kiểm tra `FRONTEND_URL` trên Render đã đúng URL Vercel chưa
- Kiểm tra `VITE_BACKEND_URL` trên Vercel đã đúng URL Render chưa
- Redeploy cả backend và frontend sau khi sửa env

### Lỗi kết nối MongoDB
- Kiểm tra `MONGODB_URI` đúng chưa
- Kiểm tra IP whitelist đã cho phép `0.0.0.0/0`
- Kiểm tra database user/password đúng

### Lỗi Socket connection failed
- Kiểm tra frontend đang dùng đúng backend URL
- Mở browser console xem có lỗi CORS hay không

## License

ISC
