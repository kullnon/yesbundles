import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/blog/queries";
import { CLUSTERS } from "@/lib/blog/clusters";
import { withMidCta } from "@/lib/blog/render";
import { CtaCard } from "@/components/blog/cta-card";
import type { Faq } from "@/lib/blog/types";

export const dynamic = "force-dynamic";

const SITE = "https://www.yesbundles.com";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post not found — YesBundles" };
  const url = `${SITE}/blog/${post.slug}`;
  return {
    title: `${post.title} | YesBundles`,
    description: post.meta_description ?? undefined,
    alternates: { canonical: url, languages: { en: url } },
    openGraph: {
      title: post.title,
      description: post.meta_description ?? undefined,
      url,
      type: "article",
      images: post.og_image_url ? [{ url: post.og_image_url }] : undefined,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.meta_description ?? undefined,
    },
  };
}

function fmt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const cluster = CLUSTERS[post.cluster];
  const url = `${SITE}/blog/${post.slug}`;
  const faqs = (post.faqs ?? []) as Faq[];
  const bodyWithCta = withMidCta(post.body_html ?? "", post.cluster);

  // ── JSON-LD: Article + FAQPage + BreadcrumbList ──────────────────────
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.meta_description ?? undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: post.author
      ? { "@type": "Person", name: post.author.name }
      : { "@type": "Organization", name: "YesBundles" },
    publisher: {
      "@type": "Organization",
      name: "YesBundles",
      logo: { "@type": "ImageObject", url: `${SITE}/logo.png` },
    },
    image: post.og_image_url ? [post.og_image_url] : undefined,
  };

  const faqLd =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-navy-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/blog" className="hover:underline">Blog</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/blog?cluster=${post.cluster}`} className="hover:underline">
          {cluster.label}
        </Link>
      </nav>

      <header className="mb-8">
        <span className="mb-3 inline-flex rounded-full bg-electric-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-electric-700">
          {cluster.label}
        </span>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-navy-900 sm:text-4xl">
          {post.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-navy-500">
          {post.author && <span className="font-semibold text-navy-700">{post.author.name}</span>}
          {post.author && <span aria-hidden>·</span>}
          <time dateTime={post.published_at ?? undefined}>Published {fmt(post.published_at)}</time>
          {post.updated_at && post.published_at && post.updated_at.slice(0, 10) !== post.published_at.slice(0, 10) && (
            <>
              <span aria-hidden>·</span>
              <time dateTime={post.updated_at}>Updated {fmt(post.updated_at)}</time>
            </>
          )}
        </div>
      </header>

      <div className="blog-prose" dangerouslySetInnerHTML={{ __html: bodyWithCta }} />

      <CtaCard cluster={post.cluster} />

      {post.author?.bio && (
        <div className="mt-10 rounded-2xl border border-navy-100 bg-white p-5 text-sm text-navy-600 shadow-card">
          <p className="mb-1 font-semibold text-navy-900">About {post.author.name}</p>
          {post.author.bio}
        </div>
      )}

      <div className="mt-8">
        <Link href="/blog" className="text-sm font-semibold text-electric-600 hover:underline">
          ← Back to all posts
        </Link>
      </div>
    </article>
  );
}
