-- 0003_app_entitlements_standalone.sql
--
-- The Pro mini-apps ship as standalone purchases ($29) AND inside the
-- pick-3 / all-5 bundles. The original app_entitlements.bundle_type CHECK
-- constraint only allowed ('pick_3','all_5'), which blocked granting an
-- entitlement for a standalone single-app purchase (and the column is
-- NOT NULL). This widens the allowed set to include 'standalone'.
--
-- Additive + non-destructive: existing 'pick_3'/'all_5' rows remain valid;
-- app_entitlements was empty when this ran. Applied to the Bundles project
-- (fbehngzqziimeefkjjjq) on 2026-06-29 via the management API.

ALTER TABLE public.app_entitlements
  DROP CONSTRAINT IF EXISTS app_entitlements_bundle_type_check;

ALTER TABLE public.app_entitlements
  ADD CONSTRAINT app_entitlements_bundle_type_check
  CHECK (bundle_type = ANY (ARRAY['standalone'::text, 'pick_3'::text, 'all_5'::text]));
