# Nexus Chat

Một hệ thống web chat realtime hiện đại với phong cách Cyberpunk, hoạt động qua Local Server.

## Tính Năng

- 👤 Đăng ký, Đăng nhập với Username, Password, Avatar
- 🔑 Sinh mã số kết bạn ngẫu nhiên (Friend Code)
- 🤝 Kết bạn qua Friend Code
- 💬 Chat Realtime (Socket.IO)
- 😀 Emoji & Gửi Ảnh đính kèm
- 📷 Chụp ảnh trực tiếp từ Webcam với giao diện Camera ngắm Cyberpunk
- 📞 Gọi thoại/video 1-1 realtime (WebRTC, kiểu Messenger)
- 🟢 Trạng thái Online/Offline, Đang gõ phím (Typing)
- 👀 Trạng thái đã xem (Seen)
- 🌃 Giao diện Dark Mode, Neon Glassmorphism
- 📱 Responsive Design

## Công nghệ sử dụng

- **Frontend**: ReactJS, Vite, TailwindCSS, Framer Motion, Socket.IO Client, Emoji-picker-react.
- **Backend**: Node.js, Express, Socket.IO, SQLite (Database nhẹ, không cần cài đặt db server), Multer (upload), JWT, Bcrypt.

## Cài Đặt và Chạy Server (Trên Máy Của Bạn)

1. Mở Terminal tại thư mục `chat-app`
2. Chạy lệnh để cài đặt toàn bộ thư viện:
   ```bash
   npm run install-all
   ```
3. Khởi động cả Frontend & Backend:
   ```bash
   npm run dev
   ```
   
> **Lưu ý**: Lệnh trên sẽ khởi chạy Backend ở cổng `3000` và Frontend ở cổng của Vite (thường là `5173`). Nó cũng sẽ tự động mở kết nối qua mạng LAN (`--host`).

## Truy cập từ các thiết bị khác trong cùng WiFi

Khi bạn chạy `npm run dev`, Vite sẽ in ra màn hình các địa chỉ truy cập (ví dụ):
```
  ➜  Network: http://192.168.1.x:5173/
```
Bạn chỉ cần lấy điện thoại hoặc máy tính khác (chung mạng WiFi) truy cập vào địa chỉ trên để có thể chat với nhau.

_Lưu ý: API và WebSocket đang được trỏ vào `http://localhost:3000` theo cấu hình mặc định. Nếu bạn muốn truy cập từ thiết bị khác, vui lòng thay `localhost` thành IP máy tính của bạn trong thư mục `client/src/context/AuthContext.jsx` và `client/src/pages/Chat.jsx`, hoặc cấu hình Proxy._

## Deploy web qua Cloudflare Tunnel

Project đã có sẵn script mở tunnel. Chạy frontend + backend trước, sau đó mở tunnel:
```bash
npm run start-tunnel
```
Mặc định tunnel public frontend ở `http://localhost:5173` (kèm proxy API/WebSocket sang backend `3000`), nên bạn không cần sửa `API_URL` thủ công.

Bạn cũng có thể đổi target bằng biến môi trường:
```bash
TUNNEL_TARGET_URL=http://localhost:5173 npm run start-tunnel
```
PowerShell (Windows):
```powershell
$env:TUNNEL_TARGET_URL="http://localhost:5173"; npm run start-tunnel
```

## Running Backend on Your Laptop as a Server

### Quick Start (Recommended - Backend + Tunnel)

```bash
cd chat-app
laptop-server.bat
```
Then choose option **2** to run Backend + Tunnel.

### Backend Only (Local Development)

```bash
cd chat-app
npm run start-server
```
Backend runs on `http://localhost:3000`

### Backend + Cloudflare Tunnel (Expose to Internet)

**Terminal 1 - Backend:**
```bash
cd chat-app
npm run start-server
```

**Terminal 2 - Tunnel:**
```bash
cd chat-app
npm run start-tunnel
```

You'll get a public URL like: `https://abc123.trycloudflare.com`

### Setting Production URL on Vercel

1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add new variable:
   ```
   VITE_BACKEND_URL=https://your-cloudflare-url.com
   ```
3. **Redeploy** frontend

### Auto-Start Backend on Laptop Restart (Windows)

Create a scheduled task:
1. Open **Task Scheduler**
2. Create Basic Task → Name: "Nexus Chat Backend"
3. Trigger: "At startup"
4. Action: Start program `laptop-server.bat`
5. Set to run with highest privileges

## Cấu trúc thư mục
- `/client`: Frontend (React) - Deploy to Vercel
- `/server`: Backend (Express, SQLite, Socket.io) - Run on your laptop
- `/server/database.sqlite`: Nơi lưu trữ toàn bộ dữ liệu tự động sinh.
- `/server/uploads`: Nơi lưu trữ hình ảnh.
- `laptop-server.bat`: Quick launcher for backend + tunnel
- `run-backend.bat`: Run backend only
- `run-tunnel.bat`: Run Cloudflare Tunnel only
