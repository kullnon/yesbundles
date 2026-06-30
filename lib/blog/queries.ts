// lib/blog/queries.ts
// Server-side read helpers for the public blog. Uses the no-store admin client
// (see lib/blog/admin.ts) so freshly-published posts are never served stale and
// the Next Data Cache bug can't bite. Server-only — never import from a client
// component.

import { createBlogAdminClient } from "./admin";
import type { BlogPostWithAuthor, Cluster } from "./types";

const SELECT = "*, author:blog_authors(*)";

export interface PostListResult {
  posts: BlogPostWithAuthor[];
  total: number;
}

export async function getPublishedPosts(opts: {
  cluster?: Cluster | null;
  page?: number;
  pageSize?: number;
}): Promise<PostListResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 9;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const admin = createBlogAdminClient();
  let query = admin
    .from("blog_posts")
    .select(SELECT, { count: "exact" })
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(from, to);

  if (opts.cluster) query = query.eq("cluster", opts.cluster);

  const { data, count } = await query;
  return {
    posts: (data ?? []) as unknown as BlogPostWithAuthor[],
    total: count ?? 0,
  };
}

export async function getPostBySlug(slug: string): Promise<BlogPostWithAuthor | null> {
  const admin = createBlogAdminClient();
  const { data } = await admin
    .from("blog_posts")
    .select(SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as unknown as BlogPostWithAuthor) ?? null;
}

export async function getAllPublishedSlugs(): Promise<
  { slug: string; updated_at: string; published_at: string | null }[]
> {
  const admin = createBlogAdminClient();
  const { data } = await admin
    .from("blog_posts")
    .select("slug, updated_at, published_at")
    .eq("status", "published");
  return (data ?? []) as { slug: string; updated_at: string; published_at: string | null }[];
}
