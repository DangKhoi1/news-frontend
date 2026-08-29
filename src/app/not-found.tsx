import Link from "next/link";
import { ArrowLeft, Radio } from "lucide-react";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <span className="brand-mark"><Radio aria-hidden="true" /></span>
      <p>404</p>
      <h1>Không tìm thấy bản tin</h1>
      <span>Bài viết có thể đã được di chuyển hoặc chưa được xuất bản.</span>
      <Link href="/"><ArrowLeft aria-hidden="true" /> Trở về trang chủ</Link>
    </main>
  );
}
