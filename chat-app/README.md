# Nexus Chat

Một hệ thống web chat realtime hiện đại với phong cách Cyberpunk, hoạt động qua Local Server.

## Tính Năng

- 👤 Đăng ký, Đăng nhập với Username, Password, Avatar
- 🔑 Sinh mã số kết bạn ngẫu nhiên (Friend Code)
- 🤝 Kết bạn qua Friend Code
- 💬 Chat Realtime (Socket.IO)
- 😀 Emoji & Gửi Ảnh đính kèm
- 📷 Chụp ảnh trực tiếp từ Webcam với giao diện Camera ngắm Cyberpunk
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

## Mở rộng qua Internet (Tùy chọn)

Để truy cập từ bất cứ đâu trên thế giới, bạn có thể dùng Cloudflare Tunnel:
```bash
cloudflared tunnel --url http://localhost:5173
```
Và chuyển API_URL ở Frontend để trỏ vào backend đã được public, hoặc host Backend và Frontend trên các dịch vụ đám mây.

## Cấu trúc thư mục
- `/client`: Frontend (React)
- `/server`: Backend (Express, SQLite, Socket.io)
- `/server/database.sqlite`: Nơi lưu trữ toàn bộ dữ liệu tự động sinh.
- `/server/uploads`: Nơi lưu trữ hình ảnh.
