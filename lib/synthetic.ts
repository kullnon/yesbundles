// Flow Watchdog synthetic requests (maestro-os, lib/flow-watchdog/sign.ts).
//
// Header  x-maestro-synthetic: v1.<unix-ms>.<base64url Ed25519 signature of "v1.<unix-ms>.<site>">
// signed by maestro-os's private key; verified here with the PUBLIC key (nothing secret in this
// repo). Valid for 5 minutes. A request that passes this check is a monitoring probe: validate
// it exactly as usual, prove the database write (or skip it), and NEVER send email, SMS, calls,
// Telegram, or write consent/TCPA records for it. A missing or invalid header changes nothing.

import { createPublicKey, verify } from "crypto";

export const SYNTHETIC_HEADER = "x-maestro-synthetic";
const PUBLIC_KEY_SPKI_B64 = "MCowBQYDK2VwAyEA4FhPuGzVRUzczD4rBgitV2rmOoVoLdy0MaywUlhW+Q4=";
const MAX_AGE_MS = 5 * 60 * 1000;

let publicKey: ReturnType<typeof createPublicKey> | null = null;

/** True only for a fresh, correctly signed Flow Watchdog header meant for `site`. */
export function isSynthetic(headers: { get(name: string): string | null }, site: string, now = Date.now()): boolean {
  const value = headers.get(SYNTHETIC_HEADER);
  if (!value) return false;
  const m = /^v1\.(\d{10,16})\.([A-Za-z0-9_-]+)$/.exec(value.trim());
  const stamp = m?.[1];
  const sig = m?.[2];
  if (!stamp || !sig) return false;
  const ts = Number(stamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_AGE_MS) return false;
  try {
    publicKey ??= createPublicKey({ key: Buffer.from(PUBLIC_KEY_SPKI_B64, "base64"), format: "der", type: "spki" });
    return verify(null, Buffer.from(`v1.${stamp}.${site}`), publicKey, Buffer.from(sig, "base64url"));
  } catch {
    return false;
  }
}
