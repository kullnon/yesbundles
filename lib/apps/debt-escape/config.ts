// lib/apps/debt-escape/config.ts
// Single source of truth for this Pro app's identity & price.
//
// NOTE on naming: the hero_apps primary key (and therefore the
// app_entitlements.app_slug FK value) uses an UNDERSCORE — "debt_escape" —
// while the public route uses a HYPHEN — "/apps/debt-escape". Keep these
// straight: DB lookups use APP_SLUG, links use APP_ROUTE.

export const APP_SLUG = "debt_escape";
export const APP_ROUTE = "/apps/debt-escape";
export const APP_NAME = "Debt Escape Simulator";
export const APP_PRICE_CENTS = 2900;
export const PRODUCT_TYPE = "app_standalone";
