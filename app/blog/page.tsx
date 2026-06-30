import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/blog/queries";
import { CLUSTERS, CLUSTER_ORDER, isCluster } from "@/lib/blog/clusters";
import { PostCard } from "@/components/blog/post-card";

export const metadata: Metadata = {
  title: "Blog — Money, Career & Side Hustles | YesBundles",
  description:
    "Practical, no-fluff guides on paying off debt, negotiating your salary, and building side income — from the team behind YesBundles.",
  alternates: { canonical: "https://www.yesbundles.com/blog" },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

type SearchParams = Promise<{ cluster?: string; page?: string }>;

export default async function BlogIndex({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const cluster = sp.cluster && isCluster(sp.cluster) ? sp.cluster : null;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { posts, total } = await getPublishedPosts({ cluster, page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = (over: { cluster?: string | null; page?: number }) => {
    const params = new URLSearchParams();
    const c = over.cluster === undefined ? cluster : over.cluster;
    const p = over.page ?? 1;
    if (c) params.set("cluster", c);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/blog?${s}` : "/blog";
  };

  const chip = (active: boolean) =>
    "rounded-full px-4 py-1.5 text-sm font-semibold transition " +
    (active
      ? "bg-navy-900 text-bone-50"
      : "border border-navy-200 text-navy-700 hover:bg-bone-100");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 max-w-2xl">
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl">
          The YesBundles <span className="text-electric-600">Blog</span>
        </h1>
        <p className="text-lg text-navy-600">
          Practical, no-fluff guides on money, career, and side income — and the
          tools to act on them.
        </p>
      </header>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link href={qs({ cluster: null, page: 1 })} className={chip(!cluster)}>
          All
        </Link>
        {CLUSTER_ORDER.map((c) => (
          <Link key={c} href={qs({ cluster: c, page: 1 })} className={chip(cluster === c)}>
            {CLUSTERS[c].label}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-12 text-center text-navy-500">
          No posts here yet — check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-4 text-sm" aria-label="Pagination">
          {page > 1 ? (
            <Link href={qs({ page: page - 1 })} className="font-semibold text-electric-600 hover:underline">
              ← Newer
            </Link>
          ) : (
            <span className="text-navy-300">← Newer</span>
          )}
          <span className="text-navy-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={qs({ page: page + 1 })} className="font-semibold text-electric-600 hover:underline">
              Older →
            </Link>
          ) : (
            <span className="text-navy-300">Older →</span>
          )}
        </nav>
      )}
    </div>
  );
}
