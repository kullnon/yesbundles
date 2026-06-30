import Link from "next/link";
import { CLUSTERS } from "@/lib/blog/clusters";
import type { BlogPostWithAuthor } from "@/lib/blog/types";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PostCard({ post }: { post: BlogPostWithAuthor }) {
  const cluster = CLUSTERS[post.cluster];
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      <Link href={`/blog/${post.slug}`} className="flex flex-1 flex-col p-5">
        <span className="mb-2 inline-flex w-fit rounded-full bg-electric-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-electric-700">
          {cluster.label}
        </span>
        <h3 className="mb-1 text-lg font-bold leading-snug text-navy-900 transition-colors group-hover:text-electric-600">
          {post.title}
        </h3>
        {post.meta_description && (
          <p className="mb-3 line-clamp-3 text-sm text-navy-600">
            {post.meta_description}
          </p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-navy-500">
          {post.author && <span className="font-medium text-navy-700">{post.author.name}</span>}
          {post.author && <span aria-hidden>·</span>}
          <time dateTime={post.published_at ?? undefined}>
            {formatDate(post.published_at)}
          </time>
        </div>
      </Link>
    </article>
  );
}
