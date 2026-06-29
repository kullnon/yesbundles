// lib/apps/salary-negotiation/config.ts
// Single source of truth for the Salary Negotiation Coach Pro app.
//
// NOTE on naming (same convention as debt-escape): the hero_apps primary key
// (and the app_entitlements.app_slug FK value) uses an UNDERSCORE —
// "salary_negotiation" — while the public route uses a HYPHEN —
// "/apps/salary-negotiation". DB lookups use APP_SLUG, links use APP_ROUTE.

export const APP_SLUG = "salary_negotiation";
export const APP_ROUTE = "/apps/salary-negotiation";
export const APP_NAME = "Salary Negotiation Coach";
export const APP_PRICE_CENTS = 2900;
export const PRODUCT_TYPE = "app_standalone";
