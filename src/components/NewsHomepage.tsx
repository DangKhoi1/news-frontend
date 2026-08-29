"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  CloudSun,
  Globe2,
  Menu,
  Moon,
  Radio,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  Article,
  Category,
  getArticles,
  getCategories,
  getTrending,
  proxiedImageUrl,
  subscribeNewsletter,
} from "@/lib/api";

const navItems = ["Mới nhất", "Việt Nam", "Thế giới"] as const;
const fallbackTopics = ["Chính sách mới", "Thị trường", "AI", "Thời tiết", "Bóng đá"];

function formatAgo(value: string | null): string {
  try {
    if (!value) return "Vừa cập nhật";
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
    if (minutes < 1) return "Vừa cập nhật";
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  } catch {
    return "Vừa cập nhật";
  }
}

function formatClock(value: string | null): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(
      value ? new Date(value) : new Date(),
    );
  } catch {
    return "--:--";
  }
}

function articleHref(article: Article): string {
  return `/tin/${encodeURIComponent(article.slug)}`;
}

function Logo() {
  return (
    <Link className="brand" href="/" aria-label="Nhịp Tin - trang chủ">
      <span className="brand-mark"><Radio aria-hidden="true" /></span>
      <span className="brand-copy"><strong>Nhịp Tin</strong><small>Hiểu ngày mới</small></span>
    </Link>
  );
}

function SaveButton({ id, saved, onToggle }: { id: string; saved: boolean; onToggle: (id: string) => void }) {
  return (
    <button
      className={`icon-button ${saved ? "is-saved" : ""}`}
      type="button"
      onClick={() => onToggle(id)}
      aria-label={saved ? "Bỏ lưu bài viết" : "Lưu bài viết"}
      aria-pressed={saved}
    >
      {saved ? <Check aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
    </button>
  );
}

export default function NewsHomepage() {
  const [activeNav, setActiveNav] = useState<(typeof navItems)[number]>("Mới nhất");
  const [activeCategory, setActiveCategory] = useState("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [trending, setTrending] = useState<Article[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    try {
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    } catch {
      // The document is available after hydration; no action is needed otherwise.
    }
  }, [dark]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadNews(): Promise<void> {
      try {
        setLoading(true);
        setError("");
        const region = activeNav === "Việt Nam" ? "vietnam" : activeNav === "Thế giới" ? "world" : undefined;
        const [articleResult, categoryResult, trendingResult] = await Promise.all([
          getArticles(
            {
              limit: 16,
              search: search || undefined,
              categorySlug: activeCategory === "all" ? undefined : activeCategory,
              region,
            },
            controller.signal,
          ),
          getCategories(controller.signal),
          getTrending(8, controller.signal),
        ]);
        setArticles(articleResult.items);
        setCategories(categoryResult.filter((category) => category.isActive));
        setTrending(trendingResult);
      } catch (loadError: unknown) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Không thể tải bản tin");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadNews();
    return () => controller.abort();
  }, [activeCategory, activeNav, reloadKey, search]);

  const mainArticle = articles[0];
  const sideArticles = articles.slice(1, 4);
  const briefArticles = articles.slice(4, 8);
  const latestArticles = (trending.length ? trending : articles).slice(0, 5);
  const breakingArticle = articles.find((article) => article.isBreaking) ?? mainArticle;
  const topics = useMemo(() => {
    const names = trending.flatMap((article) => article.tags ?? []).map((tag) => tag.name);
    const unique = [...new Set(names)];
    return unique.length ? unique.slice(0, 7) : fallbackTopics;
  }, [trending]);

  function toggleSaved(id: string): void {
    try {
      setSaved((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
    } catch {
      setError("Không thể cập nhật danh sách đã lưu");
    }
  }

  function toggleTopic(topic: string): void {
    try {
      setSelectedTopics((items) => items.includes(topic) ? items.filter((item) => item !== topic) : [...items, topic]);
    } catch {
      setError("Không thể cập nhật chủ đề");
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    try {
      event.preventDefault();
      setSearch(searchInput.trim());
    } catch {
      setError("Không thể thực hiện tìm kiếm");
    }
  }

  async function subscribe(event: FormEvent<HTMLFormElement>): Promise<void> {
    try {
      event.preventDefault();
      const form = event.currentTarget;
      const email = String(new FormData(form).get("email") ?? "").trim();
      if (!email) {
        setEmailStatus("Vui lòng nhập email.");
        return;
      }
      setSubmittingEmail(true);
      setEmailStatus("");
      setEmailStatus(await subscribeNewsletter(email));
      form.reset();
    } catch (subscribeError: unknown) {
      setEmailStatus(
        subscribeError instanceof ApiError
          ? subscribeError.message
          : "Đăng ký chưa thành công. Vui lòng thử lại.",
      );
    } finally {
      setSubmittingEmail(false);
    }
  }

  return (
    <div className="site-shell" id="top">
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Khu vực tin tức">
            {navItems.map((item) => (
              <button key={item} className={activeNav === item ? "active" : ""} onClick={() => setActiveNav(item)} type="button">{item}</button>
            ))}
          </nav>
          <div className="header-tools">
            <form className="search-box" onSubmit={submitSearch} role="search">
              <button className="search-submit" type="submit" aria-label="Tìm kiếm"><Search aria-hidden="true" /></button>
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} aria-label="Tìm kiếm tin tức" placeholder="Tìm chủ đề, sự kiện…" />
            </form>
            <button className="theme-button" type="button" onClick={() => setDark((value) => !value)} aria-label={dark ? "Bật giao diện sáng" : "Bật giao diện tối"}>{dark ? <Sun /> : <Moon />}</button>
            <button className="personalize" type="button"><UserRound aria-hidden="true" /><span>Cá nhân hóa</span></button>
            <button className="menu-button" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "Đóng menu" : "Mở menu"}>{menuOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
        {menuOpen && <nav className="mobile-nav" aria-label="Menu di động">{navItems.map((item) => <button key={item} className={activeNav === item ? "active" : ""} onClick={() => { setActiveNav(item); setMenuOpen(false); }} type="button">{item}</button>)}</nav>}
      </header>

      <div className="live-ticker">
        <div className="container ticker-inner"><span className="live-pulse" /><strong>Đang diễn ra</strong><span className="ticker-message">{breakingArticle?.title ?? "Đang kết nối dòng tin mới nhất từ tòa soạn"}</span><span className="ticker-weather"><CloudSun aria-hidden="true" /> Hà Nội 29°C</span><time>{formatClock(breakingArticle?.publishedAt ?? null)}</time></div>
      </div>

      <main>
        <div className="container category-strip" aria-label="Chuyên mục">
          <button type="button" className={activeCategory === "all" ? "active" : ""} onClick={() => setActiveCategory("all")}>Tất cả</button>
          {categories.map((item) => <button type="button" key={item.id} className={activeCategory === item.slug ? "active" : ""} onClick={() => setActiveCategory(item.slug)}>{item.name}</button>)}
        </div>

        {loading && <div className="container api-state" role="status"><span className="loading-dot" /> Đang tải bản tin mới nhất…</div>}
        {error && <div className="container api-state error" role="alert">{error} <button type="button" onClick={() => setReloadKey((value) => value + 1)}>Thử lại</button></div>}

        {!loading && !mainArticle && !error && (
          <section className="container empty-news"><Radio aria-hidden="true" /><h1>Chưa có bài viết phù hợp</h1><p>Hãy chọn chuyên mục khác hoặc xóa từ khóa tìm kiếm.</p><button type="button" onClick={() => { setSearch(""); setSearchInput(""); setActiveCategory("all"); setActiveNav("Mới nhất"); }}>Xem toàn bộ tin</button></section>
        )}

        {mainArticle && (
          <section className="container hero-grid" aria-labelledby="main-story-title">
            <Link className="main-story" href={articleHref(mainArticle)}>
              <div className="hero-landscape" aria-hidden="true">{proxiedImageUrl(mainArticle.thumbnailUrl) && <img src={proxiedImageUrl(mainArticle.thumbnailUrl) ?? undefined} alt="" fetchPriority="high" />}<span className="sun-shape" /><span className="city-line" /></div>
              <div className="hero-overlay" />
              <div className="main-story-copy">
                <span className="story-label"><Globe2 aria-hidden="true" /> {mainArticle.region === "world" ? "Thế giới" : "Việt Nam"}</span>
                <h1 id="main-story-title">{mainArticle.title}</h1>
                <p>{mainArticle.summary}</p>
                <div className="story-footer"><span><Clock3 aria-hidden="true" /> {mainArticle.readingTimeMinutes} phút đọc · {formatAgo(mainArticle.publishedAt)}</span><strong>Đọc bản tin <ArrowRight aria-hidden="true" /></strong></div>
              </div>
            </Link>
            <aside className="side-stories" aria-label="Tin nổi bật khác">
              {sideArticles.map((story, index) => (
                <Link className="side-story" href={articleHref(story)} key={story.id}>
                  <div className={`story-visual ${["market", "world", "tech"][index % 3]}`} aria-hidden="true">{proxiedImageUrl(story.thumbnailUrl) && <img src={proxiedImageUrl(story.thumbnailUrl) ?? undefined} alt="" loading="lazy" />}<span /></div>
                  <div className="side-copy"><span className="eyebrow">{story.category.name}</span><h2>{story.title}</h2><small>{formatAgo(story.publishedAt)}</small></div>
                  <ChevronRight className="side-arrow" aria-hidden="true" />
                </Link>
              ))}
            </aside>
          </section>
        )}

        {briefArticles.length > 0 && (
          <section className="container section-block" aria-labelledby="brief-heading">
            <div className="section-heading"><div><span className="section-kicker"><Sparkles aria-hidden="true" /> Bản tin cô đọng</span><h2 id="brief-heading">5 phút nắm bắt hôm nay</h2></div><p>{search ? `Kết quả cho “${search}”` : "Đọc nhanh, hiểu đủ bối cảnh"}</p></div>
            <div className="brief-grid">
              {briefArticles.map((item, index) => (
                <article className="brief-card" key={item.id}>
                  <span className="brief-number">{String(index + 1).padStart(2, "0")} · {item.category.name}</span>
                  <h3><Link href={articleHref(item)}>{item.title}</Link></h3>
                  <div className="brief-footer"><span>{item.readingTimeMinutes} phút đọc</span><SaveButton id={item.id} saved={saved.includes(item.id)} onToggle={toggleSaved} /></div>
                </article>
              ))}
            </div>
          </section>
        )}

        {latestArticles.length > 0 && (
          <section className="container content-grid">
            <div className="latest-panel">
              <div className="panel-heading"><div><span className="section-kicker"><Radio aria-hidden="true" /> Trực tiếp</span><h2>Dòng tin mới nhất</h2></div><button type="button" onClick={() => { setSearch(""); setActiveCategory("all"); }}>Xem toàn bộ <ArrowRight aria-hidden="true" /></button></div>
              <ol className="latest-list">
                {latestArticles.map((item) => <li key={item.id}><time>{formatClock(item.publishedAt)}</time><div><h3><Link href={articleHref(item)}>{item.title}</Link></h3><p>{item.category.name} · {item.source?.name ?? `${item.readingTimeMinutes} phút đọc`}</p></div><SaveButton id={`latest-${item.id}`} saved={saved.includes(`latest-${item.id}`)} onToggle={toggleSaved} /></li>)}
              </ol>
            </div>
            <aside className="trend-panel">
              <div className="panel-heading compact"><div><span className="section-kicker"><TrendingUp aria-hidden="true" /> 24 giờ qua</span><h2>Chủ đề đang nóng</h2></div></div>
              <div className="topic-list">{topics.map((topic) => <button type="button" key={topic} className={selectedTopics.includes(topic) ? "active" : ""} onClick={() => toggleTopic(topic)}># {topic}</button>)}</div>
              <div className="event-title"><h3>Theo dòng sự kiện</h3><span>Cập nhật liên tục</span></div>
              <div className="event-timeline">{latestArticles.slice(0, 3).map((item) => <article key={`event-${item.id}`}><strong>{formatClock(item.publishedAt)} · {item.category.name}</strong><p><Link href={articleHref(item)}>{item.title}</Link></p></article>)}</div>
            </aside>
          </section>
        )}

        <section className="container perspective" aria-labelledby="perspective-heading">
          <div className="panel-heading"><div><span className="section-kicker">Hiểu sâu hơn</span><h2 id="perspective-heading">Góc nhìn &amp; phân tích</h2></div></div>
          <div className="perspective-grid">
            <article className="featured-opinion"><span className="quote">“</span><h3>Không chỉ biết chuyện gì xảy ra, người đọc cần hiểu vì sao nó quan trọng</h3><div className="author"><span className="author-avatar">NT</span><span><strong>Ban biên tập Nhịp Tin</strong><small>Chuyên mục Góc nhìn</small></span></div></article>
            {articles.filter((item) => item.readingTimeMinutes >= 4).slice(0, 2).map((item) => <article className="opinion" key={`opinion-${item.id}`}><span className="eyebrow">{item.category.name}</span><h3><Link href={articleHref(item)}>{item.title}</Link></h3><p>{item.summary}</p><span className="read-time">{item.readingTimeMinutes} phút đọc</span></article>)}
          </div>
        </section>

        <section className="container newsletter" aria-labelledby="newsletter-title">
          <div className="newsletter-icon"><Bell aria-hidden="true" /></div>
          <div><span className="newsletter-kicker">Đừng bỏ lỡ điều quan trọng</span><h2 id="newsletter-title">Bản tin 7 giờ mỗi sáng</h2><p>Nhận bản tóm tắt tin Việt Nam và thế giới, ngắn gọn và có kiểm chứng.</p></div>
          <form onSubmit={subscribe}><div className="email-control"><input name="email" type="email" placeholder="Email của bạn" aria-label="Email nhận bản tin" required /><button type="submit" disabled={submittingEmail}>{submittingEmail ? "Đang gửi…" : "Đăng ký"}</button></div><span className="form-status" aria-live="polite">{emailStatus}</span></form>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-about"><Logo /><p>Nền tảng tổng hợp tin tức nổi bật tại Việt Nam và thế giới, ưu tiên bối cảnh, nguồn tin và trải nghiệm đọc cân bằng.</p><span><ShieldCheck aria-hidden="true" /> Minh bạch nguồn tin &amp; thời gian cập nhật</span></div>
          <nav aria-label="Chuyên mục"><h2>Chuyên mục</h2>{categories.slice(0, 4).map((item) => <button type="button" key={`footer-${item.id}`} onClick={() => { setActiveCategory(item.slug); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{item.name}</button>)}</nav>
          <nav aria-label="Tiện ích"><h2>Tiện ích</h2><a href="#brief-heading">Bản tin cô đọng</a><a href="#newsletter-title">Bản tin email</a><a href="#top">Dòng sự kiện</a></nav>
          <nav aria-label="Thông tin"><h2>Thông tin</h2><a href="#top">Về Nhịp Tin</a><a href="#top">Nguyên tắc biên tập</a><a href="#top">Liên hệ</a></nav>
        </div>
        <div className="container footer-bottom"><span>© 2026 Nhịp Tin. Dữ liệu được cung cấp bởi Nhịp Tin API.</span><div className="socials"><a href="#top" aria-label="Chia sẻ"><Share2 /></a></div></div>
      </footer>
    </div>
  );
}
