import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, Eye, Radio, ShieldCheck } from "lucide-react";
import sanitizeHtml from "sanitize-html";
import ArticleActions from "@/components/ArticleActions";
import CommentsSection from "@/components/CommentsSection";
import ReadingProgress from "@/components/ReadingProgress";
import { ApiError, Article, getArticleBySlug, getRelatedArticles, proxiedImageUrl } from "@/lib/api";

type ArticlePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const article = await getArticleBySlug(slug);
    return {
      title: `${article.title} | Nhịp Tin`,
      description: article.summary,
      openGraph: {
        title: article.title,
        description: article.summary,
        type: "article",
        publishedTime: article.publishedAt ?? undefined,
        images: article.thumbnailUrl ? [{ url: article.thumbnailUrl }] : [],
      },
    };
  } catch {
    return {
      title: "Tin tức mới nhất | Nhịp Tin",
      description: "Tin tức mới nhất tại Việt Nam và thế giới.",
    };
  }
}

function formatDate(value: string | null): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(value ? new Date(value) : new Date());
  } catch {
    return "Vừa cập nhật";
  }
}

function sanitizedArticleHtml(content: string): string {
  return sanitizeHtml(content, {
    allowedTags: [
      "p", "br", "h2", "h3", "h4", "h5", "h6", "blockquote", "ul", "ol", "li",
      "strong", "b", "em", "i", "u", "s", "a", "figure", "figcaption", "img", "hr",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] },
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
      img: (_tagName, attribs) => ({
        tagName: "img",
        attribs: { ...attribs, loading: "lazy" },
      }),
    },
  });
}

async function loadArticle(slug: string): Promise<{ article: Article; related: Article[] }> {
  try {
    const article = await getArticleBySlug(slug);
    const related = await getRelatedArticles(article.id, 4).catch(() => []);
    return { article, related };
  } catch (error: unknown) {
    throw error;
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  let result: { article: Article; related: Article[] };
  try {
    result = await loadArticle(slug);
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const { article, related } = result;
  const articleHtml = sanitizedArticleHtml(article.content);

  return (
    <div className="article-shell">
      <ReadingProgress />
      <header className="article-header">
        <div className="container article-header-inner">
          <Link className="brand" href="/"><span className="brand-mark"><Radio aria-hidden="true" /></span><span className="brand-copy"><strong>Nhịp Tin</strong><small>Hiểu ngày mới</small></span></Link>
          <div className="article-header-tools">
            <ArticleActions
              id={article.id}
              title={article.title}
              slug={article.slug}
              categoryName={article.category.name}
              publishedAt={article.publishedAt}
              readingTimeMinutes={article.readingTimeMinutes}
            />
            <Link className="back-link" href="/"><ArrowLeft aria-hidden="true" /> Trở về trang chủ</Link>
          </div>
        </div>
      </header>

      <main className="container article-layout">
        <article className="article-detail">
          <nav className="article-breadcrumb" aria-label="Đường dẫn">
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            <span>{article.region === "world" ? "Thế giới" : "Việt Nam"}</span>
            <span>/</span>
            <span className="breadcrumb-current">{article.category.name}</span>
          </nav>
          <h1>{article.title}</h1>
          <p className="article-lead">{article.summary}</p>
          <div className="article-meta">
            <span><Clock3 aria-hidden="true" /> {article.readingTimeMinutes} phút đọc</span>
            <span><Eye aria-hidden="true" /> {Number(article.viewCount).toLocaleString("vi-VN")} lượt xem</span>
            <time>{formatDate(article.publishedAt)}</time>
          </div>
          {proxiedImageUrl(article.thumbnailUrl) ? <img className="article-cover" src={proxiedImageUrl(article.thumbnailUrl) ?? undefined} alt={article.title} /> : <div className="article-cover article-cover-placeholder"><Radio aria-hidden="true" /></div>}
          <div className="article-body" dangerouslySetInnerHTML={{ __html: articleHtml }} />
          <footer className="article-source">
            <ShieldCheck aria-hidden="true" />
            <div><strong>Nguồn: {article.source?.name ?? "Nhịp Tin"}</strong><p>Tóm tắt từ RSS chính thức; nội dung đầy đủ và bản quyền thuộc nguồn xuất bản.</p>{article.originalUrl && <a href={article.originalUrl} target="_blank" rel="noreferrer">Xem nguồn gốc</a>}</div>
          </footer>
          {(article.tags?.length ?? 0) > 0 && <div className="article-tags">{article.tags?.map((tag) => <span key={tag.id}># {tag.name}</span>)}</div>}
          <CommentsSection articleId={article.id} allowComments={article.allowComments} />
        </article>

        {related.length > 0 && (
          <aside className="related-news">
            <span className="section-kicker">Đọc tiếp</span><h2>Tin liên quan</h2>
            {related.map((item) => <Link href={`/tin/${encodeURIComponent(item.slug)}`} key={item.id}>{proxiedImageUrl(item.thumbnailUrl) && <img src={proxiedImageUrl(item.thumbnailUrl) ?? undefined} alt="" loading="lazy" />}<span>{item.category.name}</span><h3>{item.title}</h3><small>{item.readingTimeMinutes} phút đọc</small></Link>)}
          </aside>
        )}
      </main>
    </div>
  );
}
