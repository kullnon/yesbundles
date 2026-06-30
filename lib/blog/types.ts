// lib/blog/types.ts
// Shared types for the blog engine. Kept dependency-free so this module can be
// imported from Next routes/pages AND from the standalone seed script.

export type Cluster = "finance" | "career" | "side_hustle";
export type PostStatus = "draft" | "published" | "archived";

export interface BlogAuthor {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  meta_description: string | null;
  body_html: string | null;
  og_image_url: string | null;
  cluster: Cluster;
  author_id: string | null;
  status: PostStatus;
  tags: string[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPostWithAuthor extends BlogPost {
  author: BlogAuthor | null;
}

export interface Faq {
  question: string;
  answer: string;
}
