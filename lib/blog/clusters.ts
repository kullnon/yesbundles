// lib/blog/clusters.ts
// Content-cluster metadata + the contextual CTA each cluster maps to.
// The CTA is rendered by the page template (never written inline by the AI).

import type { Cluster } from "./types";

export interface ClusterCta {
  /** Internal product/app path the post should drive toward. */
  href: string;
  /** Product name shown in the CTA card. */
  product: string;
  /** One-line value prop, framed as "this does what the post explained". */
  blurb: string;
  /** Button label. */
  linkText: string;
}

export interface ClusterMeta {
  label: string;
  /** Short description for the cluster filter UI. */
  description: string;
  cta: ClusterCta;
}

export const CLUSTERS: Record<Cluster, ClusterMeta> = {
  finance: {
    label: "Personal Finance",
    description: "Debt, budgeting, and money decisions made simple.",
    cta: {
      href: "/apps/debt-escape",
      product: "Debt Escape Simulator",
      blurb:
        "This calculator does exactly what this post just walked through — compare snowball vs avalanche and see your real debt-free date.",
      linkText: "Try the free simulator",
    },
  },
  career: {
    label: "Career & Salary",
    description: "Negotiation, offers, and getting paid what you're worth.",
    cta: {
      href: "/apps/salary-negotiation",
      product: "Salary Negotiation Coach",
      blurb:
        "Want this applied to your exact offer? The coach benchmarks your number and writes your counter-offer script for you.",
      linkText: "Try the free coach",
    },
  },
  side_hustle: {
    label: "Side Hustles",
    description: "Realistic ways to earn more on the side.",
    cta: {
      href: "/products",
      product: "Income & business toolkits",
      blurb:
        "Ready to start? Our income and business toolkits give you the templates and trackers to launch this week.",
      linkText: "Browse the toolkits",
    },
  },
};

export const CLUSTER_ORDER: Cluster[] = ["finance", "career", "side_hustle"];

export function isCluster(v: string): v is Cluster {
  return v === "finance" || v === "career" || v === "side_hustle";
}
