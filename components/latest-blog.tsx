import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getPublishedPosts } from "@/lib/blog/queries";
import { CLUSTERS } from "@/lib/blog/clusters";
import type { BlogPostWithAuthor } from "@/lib/blog/types";

// Homepage "Latest from the blog" strip — surfaces the 3 most recently
// published posts. Server component; reads via the no-store blog admin client
// (lib/blog/queries.ts) so newly-published posts show without the Data Cache
// hazard. Renders nothing if there are no posts (never breaks the homepage).
function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function LatestBlog() {
  let posts: BlogPostWithAuthor[] = [];
  try {
    const result = await getPublishedPosts({ page: 1, pageSize: 3 });
    posts = result.posts;
  } catch {
    // Never let a blog read failure take down the homepage.
    return null;
  }

  if (posts.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-navy-900 sm:text-2xl">
            Latest from the blog
          </h2>
          <p className="mt-0.5 text-sm text-navy-600">
            Practical guides on money, career, and side income
          </p>
        </div>
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm font-semibold text-electric-600 hover:underline"
        >
          See all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
          const cluster = CLUSTERS[post.cluster];
          return (
            <article
              key={post.id}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
            >
              <Link href={`/blog/${post.slug}`} className="flex flex-1 flex-col p-5">
                <span className="mb-2 inline-flex w-fit rounded-full bg-electric-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-electric-700">
                  {cluster.label}
                </span>
                <h3 className="mb-1 text-lg font-bold leading-snug text-navy-900 transition-colors group-hover:text-electric-600">
                  {post.title}
                </h3>
                {post.meta_description && (
                  <p className="mb-3 line-clamp-2 text-sm text-navy-600">
                    {post.meta_description}
                  </p>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 text-xs text-navy-500">
                  {post.author && (
                    <span className="font-medium text-navy-700">{post.author.name}</span>
                  )}
                  {post.author && <span aria-hidden>·</span>}
                  <time dateTime={post.published_at ?? undefined}>
                    {formatDate(post.published_at)}
                  </time>
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-electric-600">
                  Read article
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
