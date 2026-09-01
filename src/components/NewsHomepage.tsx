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
  Tag as TagIcon,
  Trash2,
  TrendingUp,
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

type SavedArticleMeta = {
  id: string;
  title: string;
  slug: string;
  categoryName: string;
  publishedAt: string | null;
  readingTimeMinutes: number;
};

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

function articleHref(article: { slug: string }): string {
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

function SaveButton({
  article,
  isSaved,
  onToggle,
}: {
  article: Article;
  isSaved: boolean;
  onToggle: (article: Article) => void;
}) {
  return (
    <button
      className={`icon-button ${isSaved ? "is-saved" : ""}`}
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(article);
      }}
      aria-label={isSaved ? "Bỏ lưu bài viết" : "Lưu bài viết"}
      aria-pressed={isSaved}
    >
      {isSaved ? <Check aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
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
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [error, setError] = useState("");
  const [savedArticles, setSavedArticles] = useState<SavedArticleMeta[]>([]);
  const [savedDrawerOpen, setSavedDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ message: string; isSuccess: boolean } | null>(null);
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Load saved bookmarks from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("nhiptin_saved_articles");
      if (stored) {
        setSavedArticles(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Restore the persisted theme (or the operating-system preference) on mount.
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem("nhiptin_theme");
      const shouldUseDark = storedTheme
        ? storedTheme === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDark(shouldUseDark);
      document.documentElement.dataset.theme = shouldUseDark ? "dark" : "light";
    } catch {
      // ignore
    }
  }, []);

  function toggleTheme(): void {
    const nextDark = !dark;
    setDark(nextDark);
    try {
      document.documentElement.dataset.theme = nextDark ? "dark" : "light";
      localStorage.setItem("nhiptin_theme", nextDark ? "dark" : "light");
    } catch {
      // The visual state still updates when storage is unavailable.
    }
  }

  // Fetch articles and categories
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
              page: 1,
              limit: 24,
              search: search || undefined,
              categorySlug: activeCategory === "all" ? undefined : activeCategory,
              region,
            },
            controller.signal,
          ),
          getCategories(controller.signal),
          getTrending(10, controller.signal),
        ]);
        setArticles(articleResult.items);
        setCurrentPage(articleResult.page);
        setTotalPages(articleResult.totalPages);
        setLoadMoreError("");
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

  async function loadMoreArticles(): Promise<void> {
    if (loadingMore || currentPage >= totalPages) return;
    try {
      setLoadingMore(true);
      setLoadMoreError("");
      const region = activeNav === "Việt Nam" ? "vietnam" : activeNav === "Thế giới" ? "world" : undefined;
      const result = await getArticles({
        page: currentPage + 1,
        limit: 24,
        search: search || undefined,
        categorySlug: activeCategory === "all" ? undefined : activeCategory,
        region,
      });
      setArticles((current) => {
        const ids = new Set(current.map((item) => item.id));
        return [...current, ...result.items.filter((item) => !ids.has(item.id))];
      });
      setCurrentPage(result.page);
      setTotalPages(result.totalPages);
    } catch (loadError: unknown) {
      setLoadMoreError(loadError instanceof Error ? loadError.message : "Không thể tải thêm bài viết");
    } finally {
      setLoadingMore(false);
    }
  }

  // Handle Bookmark Toggle
  function toggleSaved(article: Article): void {
    setSavedArticles((prev) => {
      const exists = prev.some((item) => item.id === article.id);
      let updated: SavedArticleMeta[];
      if (exists) {
        updated = prev.filter((item) => item.id !== article.id);
      } else {
        updated = [
          {
            id: article.id,
            title: article.title,
            slug: article.slug,
            categoryName: article.category.name,
            publishedAt: article.publishedAt,
            readingTimeMinutes: article.readingTimeMinutes,
          },
          ...prev,
        ];
      }
      try {
        localStorage.setItem("nhiptin_saved_articles", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }

  function removeSavedById(id: string): void {
    setSavedArticles((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem("nhiptin_saved_articles", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }

  // Handle Search Submission
  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    try {
      event.preventDefault();
      setActiveTopic(null);
      setSearch(searchInput.trim());
    } catch {
      setError("Không thể thực hiện tìm kiếm");
    }
  }

  // Handle Topic Tag Click
  function toggleTopic(topic: string): void {
    if (activeTopic === topic) {
      setActiveTopic(null);
      setSearch("");
      setSearchInput("");
    } else {
      setActiveTopic(topic);
      setSearch(topic);
      setSearchInput(topic);
    }
  }

  // Handle Email Subscription
  async function subscribe(event: FormEvent<HTMLFormElement>): Promise<void> {
    try {
      event.preventDefault();
      const form = event.currentTarget;
      const email = String(new FormData(form).get("email") ?? "").trim();
      if (!email) {
        setEmailStatus({ message: "Vui lòng nhập địa chỉ email hợp lệ.", isSuccess: false });
        return;
      }
      setSubmittingEmail(true);
      setEmailStatus(null);
      const message = await subscribeNewsletter(email);
      setEmailStatus({ message, isSuccess: true });
      form.reset();
    } catch (subscribeError: unknown) {
      setEmailStatus({
        message:
          subscribeError instanceof ApiError
            ? subscribeError.message
            : "Đăng ký chưa thành công. Vui lòng thử lại.",
        isSuccess: false,
      });
    } finally {
      setSubmittingEmail(false);
    }
  }

  // Extract unique topic list
  const topics = useMemo(() => {
    const names = [...trending, ...articles].flatMap((article) => article.tags ?? []).map((tag) => tag.name);
    const unique = [...new Set(names)].filter(Boolean);
    return unique.length ? unique.slice(0, 7) : fallbackTopics;
  }, [trending, articles]);

  // =========================================================================
  // DEDUPLICATION PIPELINE: Ensure no article is duplicated across sections
  // =========================================================================
  const {
    breakingArticle,
    mainArticle,
    sideArticles,
    briefArticles,
    latestArticles,
    eventArticles,
    perspectiveLead,
    perspectiveSupporting,
    moreArticles,
  } = useMemo(() => {
    const usedIds = new Set<string>();

    // 1. Breaking Ticker: Pick breaking if available, else first article
    const breaking = articles.find((a) => a.isBreaking) ?? articles[0];

    // 2. Hero Lead: The top primary story
    const main = articles[0];
    if (main) usedIds.add(main.id);

    // 3. Hero Side Stories: 3 distinct stories
    const side: Article[] = [];
    for (const item of articles) {
      if (side.length >= 3) break;
      if (!usedIds.has(item.id)) {
        side.push(item);
        usedIds.add(item.id);
      }
    }

    // 4. Briefs ("5 phút nắm bắt"): 4 distinct stories
    const briefs: Article[] = [];
    for (const item of articles) {
      if (briefs.length >= 4) break;
      if (!usedIds.has(item.id)) {
        briefs.push(item);
        usedIds.add(item.id);
      }
    }

    // 5. Latest Timeline: 5 distinct stories from remaining pool or trending
    const timelineCandidates = [...articles, ...trending];
    const latest: Article[] = [];
    for (const item of timelineCandidates) {
      if (latest.length >= 5) break;
      if (!usedIds.has(item.id)) {
        latest.push(item);
        usedIds.add(item.id);
      }
    }

    // 6. Theo dòng sự kiện (Event stream): Group by active topic or distinct event thread
    const eventPool = articles.filter((item) => !usedIds.has(item.id));
    const events: Article[] = [];
    if (activeTopic) {
      const topicMatches = articles.filter(
        (a) =>
          a.tags?.some((t) => t.name.toLowerCase() === activeTopic.toLowerCase()) ||
          a.title.toLowerCase().includes(activeTopic.toLowerCase()) ||
          a.summary.toLowerCase().includes(activeTopic.toLowerCase()),
      );
      events.push(...topicMatches.slice(0, 3));
    } else {
      for (const item of eventPool) {
        if (events.length >= 3) break;
        events.push(item);
        usedIds.add(item.id);
      }
      if (events.length === 0 && articles.length > 0) {
        events.push(...articles.slice(1, 4));
      }
    }

    // 7. Góc nhìn & phân tích (Perspectives): In-depth stories not yet shown
    const perspectivePool = articles.filter((item) => !usedIds.has(item.id));
    const sortedPerspective = (perspectivePool.length >= 2 ? perspectivePool : articles)
      .slice()
      .sort((a, b) => b.summary.length + b.readingTimeMinutes * 80 - (a.summary.length + a.readingTimeMinutes * 80));

    const pLead = sortedPerspective[0];
    const pSupporting = sortedPerspective.slice(1, 4);
    const highlightedIds = new Set(
      [main, ...side, ...briefs, ...latest, ...events, pLead, ...pSupporting]
        .filter((item): item is Article => Boolean(item))
        .map((item) => item.id),
    );
    const more = articles.filter((item) => !highlightedIds.has(item.id));

    return {
      breakingArticle: breaking,
      mainArticle: main,
      sideArticles: side,
      briefArticles: briefs,
      latestArticles: latest,
      eventArticles: events,
      perspectiveLead: pLead,
      perspectiveSupporting: pSupporting,
      moreArticles: more,
    };
  }, [articles, trending, activeTopic]);

  const perspectiveSourceCount = useMemo(
    () => new Set(articles.map((article) => article.source?.name).filter(Boolean)).size,
    [articles],
  );
  const vietnamArticleCount = articles.filter((article) => article.region === "vietnam").length;
  const worldArticleCount = articles.filter((article) => article.region === "world").length;

  return (
    <div className="site-shell" id="top">
      {/* Header */}
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Khu vực tin tức">
            {navItems.map((item) => (
              <button
                key={item}
                className={activeNav === item ? "active" : ""}
                onClick={() => {
                  setActiveNav(item);
                  setActiveCategory("all");
                  setActiveTopic(null);
                }}
                type="button"
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="header-tools">
            <form className="search-box" onSubmit={submitSearch} role="search">
              <button className="search-submit" type="submit" aria-label="Tìm kiếm">
                <Search aria-hidden="true" />
              </button>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                aria-label="Tìm kiếm tin tức"
                placeholder="Tìm chủ đề, sự kiện…"
              />
            </form>
            <button
              className="theme-button"
              type="button"
              onClick={toggleTheme}
              aria-label={dark ? "Bật giao diện sáng" : "Bật giao diện tối"}
            >
              {dark ? <Sun /> : <Moon />}
            </button>
            <button
              className="saved-toggle-btn"
              type="button"
              onClick={() => setSavedDrawerOpen(true)}
              aria-label="Xem tin đã lưu"
            >
              <Bookmark aria-hidden="true" />
              <span>Đã lưu</span>
              {savedArticles.length > 0 && <span className="saved-badge">{savedArticles.length}</span>}
            </button>
            <button
              className="menu-button"
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="mobile-nav" aria-label="Menu di động">
            {navItems.map((item) => (
              <button
                key={item}
                className={activeNav === item ? "active" : ""}
                onClick={() => {
                  setActiveNav(item);
                  setMenuOpen(false);
                }}
                type="button"
              >
                {item}
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* Live Ticker */}
      <div className="live-ticker">
        <div className="container ticker-inner">
          <span className="live-pulse" />
          <strong>Đang diễn ra</strong>
          <span className="ticker-message">
            {breakingArticle?.title ?? "Đang kết nối dòng tin mới nhất từ tòa soạn"}
          </span>
          <span className="ticker-weather">
            <CloudSun aria-hidden="true" /> Hà Nội 29°C
          </span>
          <time>{formatClock(breakingArticle?.publishedAt ?? null)}</time>
        </div>
      </div>

      <main>
        {/* Category Strip */}
        <div className="container category-strip" aria-label="Chuyên mục">
          <button
            type="button"
            className={activeCategory === "all" ? "active" : ""}
            onClick={() => {
              setActiveCategory("all");
              setActiveTopic(null);
            }}
          >
            Tất cả
          </button>
          {categories.map((item) => (
            <button
              type="button"
              key={item.id}
              className={activeCategory === item.slug ? "active" : ""}
              onClick={() => {
                setActiveCategory(item.slug);
                setActiveTopic(null);
              }}
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* Active Filter Indicator */}
        {(search || activeTopic) && (
          <div className="container active-filter-bar">
            <span>
              <TagIcon aria-hidden="true" /> Đang lọc theo: <strong>{search || activeTopic}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setActiveTopic(null);
              }}
            >
              <X aria-hidden="true" /> Bỏ lọc
            </button>
          </div>
        )}

        {loading && (
          <div className="container api-state" role="status">
            <span className="loading-dot" /> Đang tải bản tin mới nhất…
          </div>
        )}
        {error && (
          <div className="container api-state error" role="alert">
            {error} <button type="button" onClick={() => setReloadKey((value) => value + 1)}>Thử lại</button>
          </div>
        )}

        {!loading && !mainArticle && !error && (
          <section className="container empty-news">
            <Radio aria-hidden="true" />
            <h1>Chưa có bài viết phù hợp</h1>
            <p>Hãy chọn chuyên mục khác hoặc xóa từ khóa tìm kiếm.</p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setActiveCategory("all");
                setActiveNav("Mới nhất");
                setActiveTopic(null);
              }}
            >
              Xem toàn bộ tin
            </button>
          </section>
        )}

        {/* 1. HERO SECTION */}
        {mainArticle && (
          <section className="container hero-grid" aria-labelledby="main-story-title">
            <Link className="main-story" href={articleHref(mainArticle)}>
              <div className="hero-landscape" aria-hidden="true">
                {proxiedImageUrl(mainArticle.thumbnailUrl) && (
                  <img src={proxiedImageUrl(mainArticle.thumbnailUrl) ?? undefined} alt="" fetchPriority="high" />
                )}
                <span className="sun-shape" />
                <span className="city-line" />
              </div>
              <div className="hero-overlay" />
              <div className="main-story-copy">
                <span className="story-label">
                  <Globe2 aria-hidden="true" /> {mainArticle.region === "world" ? "Thế giới" : "Việt Nam"} · {mainArticle.category.name}
                </span>
                <h1 id="main-story-title">{mainArticle.title}</h1>
                <p>{mainArticle.summary}</p>
                <div className="story-footer">
                  <span>
                    <Clock3 aria-hidden="true" /> {mainArticle.readingTimeMinutes} phút đọc · {formatAgo(mainArticle.publishedAt)}
                  </span>
                  <div className="story-footer-actions">
                    <SaveButton
                      article={mainArticle}
                      isSaved={savedArticles.some((item) => item.id === mainArticle.id)}
                      onToggle={toggleSaved}
                    />
                    <strong>
                      Đọc bản tin <ArrowRight aria-hidden="true" />
                    </strong>
                  </div>
                </div>
              </div>
            </Link>

            <aside className="side-stories" aria-label="Tin nổi bật khác">
              {sideArticles.map((story, index) => (
                <Link className="side-story" href={articleHref(story)} key={story.id}>
                  <div className={`story-visual ${["market", "world", "tech"][index % 3]}`} aria-hidden="true">
                    {proxiedImageUrl(story.thumbnailUrl) && (
                      <img src={proxiedImageUrl(story.thumbnailUrl) ?? undefined} alt="" loading="lazy" />
                    )}
                    <span />
                  </div>
                  <div className="side-copy">
                    <span className="eyebrow">{story.category.name}</span>
                    <h2>{story.title}</h2>
                    <div className="side-meta">
                      <small>{formatAgo(story.publishedAt)}</small>
                      <SaveButton
                        article={story}
                        isSaved={savedArticles.some((item) => item.id === story.id)}
                        onToggle={toggleSaved}
                      />
                    </div>
                  </div>
                  <ChevronRight className="side-arrow" aria-hidden="true" />
                </Link>
              ))}
            </aside>
          </section>
        )}

        {/* 2. BRIEFS SECTION (5 phút nắm bắt) */}
        {briefArticles.length > 0 && (
          <section className="container section-block" aria-labelledby="brief-heading">
            <div className="section-heading">
              <div>
                <span className="section-kicker">
                  <Sparkles aria-hidden="true" /> Bản tin cô đọng
                </span>
                <h2 id="brief-heading">5 phút nắm bắt hôm nay</h2>
              </div>
              <p>{search ? `Kết quả cho “${search}”` : "Đọc nhanh, hiểu đủ bối cảnh"}</p>
            </div>
            <div className="brief-grid">
              {briefArticles.map((item, index) => (
                <article className="brief-card" key={item.id}>
                  <span className="brief-number">
                    {String(index + 1).padStart(2, "0")} · {item.category.name}
                  </span>
                  <h3>
                    <Link href={articleHref(item)}>{item.title}</Link>
                  </h3>
                  <div className="brief-footer">
                    <span>{item.readingTimeMinutes} phút đọc</span>
                    <SaveButton
                      article={item}
                      isSaved={savedArticles.some((s) => s.id === item.id)}
                      onToggle={toggleSaved}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 3. TIMELINE & EVENT SECTION */}
        {(latestArticles.length > 0 || eventArticles.length > 0) && (
          <section className="container content-grid">
            <div className="latest-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">
                    <Radio aria-hidden="true" /> Trực tiếp
                  </span>
                  <h2>Dòng tin mới nhất</h2>
                </div>
              </div>
              <ol className="latest-list">
                {latestArticles.map((item) => (
                  <li key={item.id}>
                    <time>{formatClock(item.publishedAt)}</time>
                    <div>
                      <h3>
                        <Link href={articleHref(item)}>{item.title}</Link>
                      </h3>
                      <p>
                        {item.category.name} · {item.source?.name ?? `${item.readingTimeMinutes} phút đọc`}
                      </p>
                    </div>
                    <SaveButton
                      article={item}
                      isSaved={savedArticles.some((s) => s.id === item.id)}
                      onToggle={toggleSaved}
                    />
                  </li>
                ))}
              </ol>
            </div>

            <aside className="trend-panel">
              <div className="panel-heading compact">
                <div>
                  <span className="section-kicker">
                    <TrendingUp aria-hidden="true" /> 24 giờ qua
                  </span>
                  <h2>Chủ đề đang nóng</h2>
                </div>
              </div>
              <div className="topic-list">
                {topics.map((topic) => (
                  <button
                    type="button"
                    key={topic}
                    className={activeTopic === topic ? "active" : ""}
                    onClick={() => toggleTopic(topic)}
                  >
                    # {topic}
                  </button>
                ))}
              </div>
              <div className="event-title">
                <h3>{activeTopic ? `Sự kiện về #${activeTopic}` : "Theo dòng sự kiện"}</h3>
                <span>{eventArticles.length} diễn biến</span>
              </div>
              <div className="event-timeline">
                {eventArticles.map((item) => (
                  <article key={`event-${item.id}`}>
                    <strong>
                      {formatClock(item.publishedAt)} · {item.category.name}
                    </strong>
                    <p>
                      <Link href={articleHref(item)}>{item.title}</Link>
                    </p>
                  </article>
                ))}
              </div>
            </aside>
          </section>
        )}

        {/* 4. PERSPECTIVE & IN-DEPTH */}
        {perspectiveLead && (
          <section className="container perspective" aria-labelledby="perspective-heading">
            <div className="perspective-heading">
              <div>
                <span className="section-kicker">
                  <Sparkles aria-hidden="true" /> Hiểu sâu hơn
                </span>
                <h2 id="perspective-heading">Góc nhìn &amp; phân tích</h2>
              </div>
              <p>Đặt sự kiện vào bối cảnh, nhận diện tác động và những điều cần tiếp tục theo dõi.</p>
            </div>

            <div className="perspective-grid">
              <article className="analysis-featured">
                <Link className="analysis-featured-image" href={articleHref(perspectiveLead)}>
                  {proxiedImageUrl(perspectiveLead.thumbnailUrl) && (
                    <img src={proxiedImageUrl(perspectiveLead.thumbnailUrl) ?? undefined} alt="" loading="lazy" />
                  )}
                  <span>Tiêu điểm phân tích</span>
                </Link>
                <div className="analysis-featured-copy">
                  <span className="eyebrow">
                    {perspectiveLead.category.name} · {perspectiveLead.source?.name ?? "Nhịp Tin"}
                  </span>
                  <h3>
                    <Link href={articleHref(perspectiveLead)}>{perspectiveLead.title}</Link>
                  </h3>
                  <p>{perspectiveLead.summary}</p>
                  <div className="analysis-meta">
                    <span>
                      <Clock3 aria-hidden="true" /> {perspectiveLead.readingTimeMinutes} phút đọc · {formatAgo(perspectiveLead.publishedAt)}
                    </span>
                    <Link href={articleHref(perspectiveLead)}>
                      Đọc toàn bài <ArrowRight aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>

              <div className="analysis-list" aria-label="Các góc nhìn liên quan">
                {perspectiveSupporting.map((item, index) => (
                  <article className="analysis-card" key={`analysis-${item.id}`}>
                    <span className="analysis-index">0{index + 1}</span>
                    <div>
                      <span className="eyebrow">{item.category.name}</span>
                      <h3>
                        <Link href={articleHref(item)}>{item.title}</Link>
                      </h3>
                      <p>{item.summary}</p>
                      <span className="read-time">
                        {item.source?.name ?? "Nhịp Tin"} · {formatAgo(item.publishedAt)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="analysis-context">
              <div className="analysis-questions">
                <span className="section-kicker">Khung đọc nhanh</span>
                <h3>3 câu hỏi giúp hiểu một bản tin</h3>
                <ol>
                  <li>
                    <strong>01</strong>
                    <span>Dữ kiện chính đã được nguồn nào xác nhận?</span>
                  </li>
                  <li>
                    <strong>02</strong>
                    <span>Ai sẽ chịu tác động trực tiếp từ diễn biến này?</span>
                  </li>
                  <li>
                    <strong>03</strong>
                    <span>Điều gì cần theo dõi trong 24 giờ tiếp theo?</span>
                  </li>
                </ol>
              </div>
              <div className="analysis-snapshot" aria-label="Tổng quan dữ liệu đang phân tích">
                <div>
                  <strong>{articles.length}</strong>
                  <span>bài trong lát cắt hiện tại</span>
                </div>
                <div>
                  <strong>{perspectiveSourceCount}</strong>
                  <span>nguồn tin được đối chiếu</span>
                </div>
                <div>
                  <strong>{vietnamArticleCount}</strong>
                  <span>tin Việt Nam</span>
                </div>
                <div>
                  <strong>{worldArticleCount}</strong>
                  <span>tin thế giới</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {(moreArticles.length > 0 || currentPage < totalPages) && (
          <section className="container more-news" aria-labelledby="more-news-heading">
            <div className="section-heading">
              <div>
                <span className="section-kicker"><Radio aria-hidden="true" /> Cập nhật liên tục</span>
                <h2 id="more-news-heading">Thêm tin mới</h2>
              </div>
              <p>Trang {currentPage} / {totalPages}</p>
            </div>
            {moreArticles.length > 0 && (
              <div className="more-news-grid">
                {moreArticles.map((item) => (
                  <article className="more-news-card" key={`more-${item.id}`}>
                    <Link className="more-news-image" href={articleHref(item)}>
                      {proxiedImageUrl(item.thumbnailUrl) ? (
                        <img src={proxiedImageUrl(item.thumbnailUrl) ?? undefined} alt="" loading="lazy" />
                      ) : (
                        <Radio aria-hidden="true" />
                      )}
                    </Link>
                    <div>
                      <span className="eyebrow">{item.category.name}</span>
                      <h3><Link href={articleHref(item)}>{item.title}</Link></h3>
                      <p>{item.summary}</p>
                      <div className="more-news-meta">
                        <span>{formatAgo(item.publishedAt)} · {item.readingTimeMinutes} phút đọc</span>
                        <SaveButton
                          article={item}
                          isSaved={savedArticles.some((saved) => saved.id === item.id)}
                          onToggle={toggleSaved}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {loadMoreError && <p className="load-more-error" role="alert">{loadMoreError}</p>}
            {currentPage < totalPages && (
              <button
                className="load-more-button"
                type="button"
                onClick={() => void loadMoreArticles()}
                disabled={loadingMore}
              >
                {loadingMore ? "Đang tải thêm…" : "Tải thêm bài viết"}
                {!loadingMore && <ArrowRight aria-hidden="true" />}
              </button>
            )}
          </section>
        )}

        {/* 5. NEWSLETTER SECTION */}
        <section className="container newsletter" aria-labelledby="newsletter-title">
          <div className="newsletter-icon">
            <Bell aria-hidden="true" />
          </div>
          <div>
            <span className="newsletter-kicker">Đừng bỏ lỡ điều quan trọng</span>
            <h2 id="newsletter-title">Bản tin 7 giờ mỗi sáng</h2>
            <p>Nhận bản tóm tắt tin Việt Nam và thế giới, ngắn gọn và có kiểm chứng qua email.</p>
          </div>
          <form onSubmit={subscribe}>
            <div className="email-control">
              <input
                name="email"
                type="email"
                placeholder="Email của bạn (ví dụ: ban@gmail.com)"
                aria-label="Email nhận bản tin"
                required
              />
              <button type="submit" disabled={submittingEmail}>
                {submittingEmail ? "Đang gửi…" : "Đăng ký"}
              </button>
            </div>
            {emailStatus && (
              <span
                className={`form-status ${emailStatus.isSuccess ? "is-success" : "is-error"}`}
                aria-live="polite"
              >
                {emailStatus.isSuccess && <Check aria-hidden="true" />}
                {emailStatus.message}
              </span>
            )}
          </form>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-about">
            <Logo />
            <p>
              Nền tảng tổng hợp tin tức nổi bật tại Việt Nam và thế giới, ưu tiên bối cảnh, nguồn tin và trải nghiệm đọc cân bằng.
            </p>
            <span>
              <ShieldCheck aria-hidden="true" /> Minh bạch nguồn tin &amp; thời gian cập nhật
            </span>
          </div>
          <nav aria-label="Chuyên mục">
            <h2>Chuyên mục</h2>
            {categories.slice(0, 5).map((item) => (
              <button
                type="button"
                key={`footer-${item.id}`}
                onClick={() => {
                  setActiveCategory(item.slug);
                  setActiveTopic(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                {item.name}
              </button>
            ))}
          </nav>
          <nav aria-label="Tiện ích">
            <h2>Tiện ích</h2>
            <a href="#brief-heading">Bản tin cô đọng</a>
            <a href="#newsletter-title">Bản tin email</a>
            <button
              type="button"
              className="footer-nav-link"
              onClick={() => setSavedDrawerOpen(true)}
            >
              Danh sách tin đã lưu ({savedArticles.length})
            </button>
          </nav>
          <nav aria-label="Thông tin">
            <h2>Thông tin</h2>
            <a href="#top">Về Nhịp Tin</a>
            <a href="#top">Nguyên tắc biên tập</a>
            <a href="#top">Liên hệ tòa soạn</a>
          </nav>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 Nhịp Tin. Bản quyền thuộc về Nhịp Tin Platform.</span>
          <div className="socials">
            <a href="#top" aria-label="Chia sẻ">
              <Share2 />
            </a>
          </div>
        </div>
      </footer>

      {/* SAVED ARTICLES DRAWER */}
      {savedDrawerOpen && (
        <div className="drawer-backdrop" onClick={() => setSavedDrawerOpen(false)}>
          <aside
            className="drawer-panel"
            onClick={(e) => e.stopPropagation()}
            aria-label="Danh sách bài viết đã lưu"
          >
            <div className="drawer-header">
              <div className="drawer-title">
                <Bookmark aria-hidden="true" />
                <h2>Bài viết đã lưu ({savedArticles.length})</h2>
              </div>
              <button
                className="drawer-close"
                type="button"
                onClick={() => setSavedDrawerOpen(false)}
                aria-label="Đóng"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            {savedArticles.length === 0 ? (
              <div className="drawer-empty">
                <Bookmark aria-hidden="true" />
                <p>Bạn chưa lưu bài viết nào.</p>
                <small>Bấm vào biểu tượng Bookmark trên bất kỳ bài viết nào để đọc lại sau.</small>
              </div>
            ) : (
              <ul className="drawer-list">
                {savedArticles.map((item) => (
                  <li key={item.id} className="drawer-item">
                    <Link
                      href={articleHref(item)}
                      onClick={() => setSavedDrawerOpen(false)}
                      className="drawer-item-link"
                    >
                      <span className="eyebrow">{item.categoryName}</span>
                      <h3>{item.title}</h3>
                      <small>
                        {item.readingTimeMinutes} phút đọc · {formatAgo(item.publishedAt)}
                      </small>
                    </Link>
                    <button
                      className="drawer-item-remove"
                      type="button"
                      onClick={() => removeSavedById(item.id)}
                      aria-label="Xóa khỏi danh sách lưu"
                      title="Bỏ lưu"
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
