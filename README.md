# Nhịp Tin Frontend

Frontend Next.js cho website tổng hợp tin tức Nhịp Tin. Dữ liệu trang chủ, tìm kiếm, chuyên mục, tin theo khu vực, bài chi tiết và đăng ký newsletter được lấy từ NestJS API.

## Chạy phát triển

Backend cần hoạt động tại `http://localhost:8081`.

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Mở `http://localhost:3000`.

## Biến môi trường

```env
NEXT_PUBLIC_API_URL=http://localhost:8081/api/v1
```

Khi triển khai, đổi giá trị này thành URL public của backend rồi build lại frontend.

## Kiểm tra production

```powershell
npm run build
npm start
```
