export type ArticleRegion = "vietnam" | "world";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type Tag = { id: string; name: string; slug: string };
export type Source = {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  isVerified: boolean;
};
export type Author = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type Article = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  thumbnailUrl: string | null;
  originalUrl: string | null;
  region: ArticleRegion;
  status: "draft" | "published" | "archived";
  isFeatured: boolean;
  isBreaking: boolean;
  allowComments: boolean;
  readingTimeMinutes: number;
  viewCount: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  categoryId: string;
  sourceId: string | null;
  authorId: string;
  category: Category;
  source: Source | null;
  author?: Author;
  tags?: Tag[];
};

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CommentAuthor = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type ArticleComment = {
  id: string;
  content: string;
  articleId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  user: CommentAuthor;
  replies: ArticleComment[];
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type ArticleFilters = {
  page?: number;
  limit?: number;
  search?: string;
  categorySlug?: string;
  region?: ArticleRegion;
  featured?: boolean;
  breaking?: boolean;
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8081/api/v1";

export function proxiedImageUrl(imageUrl: string | null): string | null {
  try {
    if (!imageUrl) return null;
    if (imageUrl.startsWith(`${API_URL}/images/proxy?url=`)) return imageUrl;
    return `${API_URL}/images/proxy?url=${encodeURIComponent(imageUrl)}&v=2`;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        isRecord(payload) && typeof payload.message === "string"
          ? payload.message
          : `API trả về lỗi ${response.status}`;
      throw new ApiError(message, response.status);
    }
    if (!isRecord(payload) || payload.success !== true || !("data" in payload)) {
      throw new ApiError("Phản hồi API không đúng định dạng", response.status);
    }
    return (payload as ApiEnvelope<T>).data;
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(
      error instanceof Error
        ? `Không thể kết nối backend: ${error.message}`
        : "Không thể kết nối backend",
      0,
    );
  }
}

export async function getArticles(
  filters: ArticleFilters = {},
  signal?: AbortSignal,
): Promise<PaginatedResult<Article>> {
  try {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
    const query = params.size ? `?${params.toString()}` : "";
    return await apiRequest<PaginatedResult<Article>>(`/articles${query}`, {
      signal,
      cache: "no-store",
    });
  } catch (error: unknown) {
    throw error;
  }
}

export async function getTrending(
  limit = 8,
  signal?: AbortSignal,
): Promise<Article[]> {
  try {
    return await apiRequest<Article[]>(`/articles/trending?limit=${limit}`, {
      signal,
      cache: "no-store",
    });
  } catch (error: unknown) {
    throw error;
  }
}

export async function getCategories(signal?: AbortSignal): Promise<Category[]> {
  try {
    return await apiRequest<Category[]>("/categories", {
      signal,
      cache: "no-store",
    });
  } catch (error: unknown) {
    throw error;
  }
}

export async function getArticleBySlug(slug: string): Promise<Article> {
  try {
    return await apiRequest<Article>(`/articles/slug/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
  } catch (error: unknown) {
    throw error;
  }
}

export async function getRelatedArticles(
  articleId: string,
  limit = 4,
): Promise<Article[]> {
  try {
    return await apiRequest<Article[]>(
      `/articles/${encodeURIComponent(articleId)}/related?limit=${limit}`,
      { cache: "no-store" },
    );
  } catch (error: unknown) {
    throw error;
  }
}

export async function getArticleComments(
  articleId: string,
  page = 1,
  limit = 10,
  signal?: AbortSignal,
): Promise<PaginatedResult<ArticleComment>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiRequest<PaginatedResult<ArticleComment>>(
    `/comments/article/${encodeURIComponent(articleId)}?${params.toString()}`,
    { signal, cache: "no-store" },
  );
}

export async function createArticleComment(
  articleId: string,
  content: string,
  accessToken: string,
): Promise<ArticleComment> {
  return apiRequest<ArticleComment>(
    `/comments/article/${encodeURIComponent(articleId)}`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
}

export async function subscribeNewsletter(email: string): Promise<string> {
  try {
    await apiRequest<{ email: string; isActive: boolean }>(
      "/newsletter/subscribe",
      { method: "POST", body: JSON.stringify({ email }) },
    );
    return "Đăng ký thành công! Hẹn gặp bạn lúc 7 giờ sáng.";
  } catch (error: unknown) {
    throw error;
  }
}
