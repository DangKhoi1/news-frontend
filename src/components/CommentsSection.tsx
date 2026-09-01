"use client";

import { MessageCircle, Send, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  ApiError,
  ArticleComment,
  createArticleComment,
  getArticleComments,
} from "@/lib/api";

const PAGE_SIZE = 10;

function formatCommentDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(value));
  } catch {
    return "Vừa đăng";
  }
}

function CommentItem({ comment, isReply = false }: { comment: ArticleComment; isReply?: boolean }) {
  return (
    <article className={`comment-item ${isReply ? "is-reply" : ""}`}>
      <div className="comment-avatar" aria-hidden="true">
        {comment.user?.avatarUrl ? (
          <img src={comment.user.avatarUrl} alt="" loading="lazy" />
        ) : (
          <UserRound />
        )}
      </div>
      <div className="comment-copy">
        <header>
          <strong>{comment.user?.displayName ?? "Độc giả Nhịp Tin"}</strong>
          <time dateTime={comment.createdAt}>{formatCommentDate(comment.createdAt)}</time>
        </header>
        <p>{comment.content}</p>
        {(comment.replies ?? []).map((reply) => (
          <CommentItem comment={reply} isReply key={reply.id} />
        ))}
      </div>
    </article>
  );
}

export default function CommentsSection({ articleId, allowComments }: { articleId: string; allowComments: boolean }) {
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load(): Promise<void> {
      try {
        setLoading(true);
        setError("");
        const result = await getArticleComments(articleId, 1, PAGE_SIZE, controller.signal);
        setComments(result.items);
        setPage(result.page);
        setTotalPages(result.totalPages);
      } catch (loadError: unknown) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Không thể tải bình luận");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [articleId]);

  async function loadMore(): Promise<void> {
    try {
      setLoadingMore(true);
      setError("");
      const result = await getArticleComments(articleId, page + 1, PAGE_SIZE);
      setComments((current) => {
        const ids = new Set(current.map((item) => item.id));
        return [...current, ...result.items.filter((item) => !ids.has(item.id))];
      });
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải thêm bình luận");
    } finally {
      setLoadingMore(false);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const content = String(new FormData(form).get("content") ?? "").trim();
    if (content.length < 2) {
      setNotice("Bình luận cần có ít nhất 2 ký tự.");
      return;
    }
    const accessToken = localStorage.getItem("nhiptin_access_token");
    if (!accessToken) {
      setNotice("Bạn cần đăng nhập để gửi bình luận. Các bình luận đã duyệt vẫn được hiển thị công khai.");
      return;
    }
    try {
      setSubmitting(true);
      setNotice("");
      await createArticleComment(articleId, content, accessToken);
      form.reset();
      setNotice("Bình luận đã được gửi và đang chờ kiểm duyệt.");
    } catch (submitError: unknown) {
      setNotice(
        submitError instanceof ApiError && submitError.status === 401
          ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          : submitError instanceof Error
            ? submitError.message
            : "Chưa thể gửi bình luận.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="comments-section" aria-labelledby="comments-heading">
      <div className="comments-heading">
        <div>
          <span className="section-kicker"><MessageCircle aria-hidden="true" /> Thảo luận</span>
          <h2 id="comments-heading">Ý kiến độc giả</h2>
        </div>
        {!loading && <span>{comments.length} bình luận đã duyệt</span>}
      </div>

      {allowComments ? (
        <form className="comment-form" onSubmit={(event) => void submitComment(event)}>
          <textarea name="content" minLength={2} maxLength={2000} rows={4} placeholder="Chia sẻ góc nhìn của bạn…" aria-label="Nội dung bình luận" />
          <div>
            <small>Bình luận được kiểm duyệt trước khi hiển thị.</small>
            <button type="submit" disabled={submitting}>
              <Send aria-hidden="true" /> {submitting ? "Đang gửi…" : "Gửi bình luận"}
            </button>
          </div>
          {notice && <p className="comment-notice" role="status">{notice}</p>}
        </form>
      ) : (
        <p className="comments-closed">Bài viết này đã tắt bình luận.</p>
      )}

      {loading && <div className="comments-state">Đang tải thảo luận…</div>}
      {error && <div className="comments-state is-error" role="alert">{error}</div>}
      {!loading && !error && comments.length === 0 && (
        <div className="comments-state">Chưa có bình luận được duyệt. Hãy là người mở đầu cuộc trò chuyện.</div>
      )}
      <div className="comment-list">
        {comments.map((comment) => <CommentItem comment={comment} key={comment.id} />)}
      </div>
      {page < totalPages && (
        <button className="comments-load-more" type="button" onClick={() => void loadMore()} disabled={loadingMore}>
          {loadingMore ? "Đang tải…" : "Xem thêm bình luận"}
        </button>
      )}
    </section>
  );
}
