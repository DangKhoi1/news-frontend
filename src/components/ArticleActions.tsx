"use client";

import { Bookmark, Check, Link2, Moon, Share2, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const THEME_KEY = "nhiptin_theme";
const SAVED_KEY = "nhiptin_saved_articles";

type SavedArticle = {
  id: string;
  title: string;
  slug: string;
  categoryName: string;
  publishedAt: string | null;
  readingTimeMinutes: number;
};

type ArticleActionsProps = SavedArticle;

export default function ArticleActions(article: ArticleActionsProps) {
  const [dark, setDark] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY);
    const shouldUseDark = storedTheme
      ? storedTheme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(shouldUseDark);
    document.documentElement.dataset.theme = shouldUseDark ? "dark" : "light";

    try {
      const stored = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]") as SavedArticle[];
      setSaved(stored.some((item) => item.id === article.id));
    } catch {
      setSaved(false);
    }
  }, [article.id]);

  function toggleTheme(): void {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.dataset.theme = nextDark ? "dark" : "light";
    localStorage.setItem(THEME_KEY, nextDark ? "dark" : "light");
  }

  function toggleSaved(): void {
    try {
      const stored = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]") as SavedArticle[];
      const next = stored.some((item) => item.id === article.id)
        ? stored.filter((item) => item.id !== article.id)
        : [article, ...stored];
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      setSaved(next.some((item) => item.id === article.id));
    } catch {
      setSaved((value) => !value);
    }
  }

  async function share(): Promise<void> {
    const shareData = { title: article.title, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  return (
    <div className="article-actions" aria-label="Công cụ bài viết">
      <button type="button" onClick={toggleSaved} aria-pressed={saved}>
        {saved ? <Check aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
        <span>{saved ? "Đã lưu" : "Lưu bài"}</span>
      </button>
      <button type="button" onClick={() => void share()}>
        {copied ? <Link2 aria-hidden="true" /> : <Share2 aria-hidden="true" />}
        <span>{copied ? "Đã chép link" : "Chia sẻ"}</span>
      </button>
      <button type="button" onClick={toggleTheme} aria-label={dark ? "Bật giao diện sáng" : "Bật giao diện tối"}>
        {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        <span>{dark ? "Giao diện sáng" : "Giao diện tối"}</span>
      </button>
    </div>
  );
}
