// Local placeholder helpers — zero network calls.
//
// We previously routed banners through generative-placeholders.stefanbohacek.com
// (https://github.com/stefanbohacek/generative-placeholders) but the service
// proved unreliable in production. Vendoring the algorithms is doable but
// overkill — a deterministic two-stop CSS gradient is fast, looks good, and
// has zero failure modes. If we want true generative imagery later we can
// vendor the github source into a local Next.js API route.

// 32-bit FNV-1a string hash. Cheap, deterministic, no deps.
function fnv1a(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h >>> 0
}

/**
 * Deterministic CSS background gradient seeded by `seed` (e.g. an entity id).
 * Same seed → same gradient. Use as the value of `background-image` in a
 * style attribute. Looks like a placeholder banner, doesn't hit the network.
 */
export function gradientBanner(seed: string): string {
  const h = fnv1a(seed || 'default')
  const hue1 = h % 360
  const hue2 = (h * 7) % 360
  const angle = (h * 13) % 360
  return `linear-gradient(${angle}deg, hsl(${hue1}, 65%, 55%), hsl(${hue2}, 65%, 45%))`
}

// ---------- DiceBear (avatars) ----------
//
// We use https://www.dicebear.com for missing profile pics. DiceBear exposes
// every style under `https://api.dicebear.com/9.x/<style>/svg?seed=<seed>`,
// so a deterministic seed gives a deterministic avatar — no SDK dependency
// required. If we later want offline / self-hosted avatars we can add the
// `@dicebear/core` package and switch to in-process rendering.

export type DiceBearStyle =
  | 'lorelei'
  | 'notionists'
  | 'fun-emoji'
  | 'bottts'
  | 'pixel-art'
  | 'adventurer'
  | 'miniavs'
  | 'croodles'
  | 'identicon'
  | 'shapes'

const DICEBEAR_ENDPOINT = 'https://api.dicebear.com/9.x'

/**
 * Build a DiceBear avatar URL for a given seed (e.g. user id, address, or
 * username). Default style is `lorelei` — clean, friendly, fits a creator
 * community better than the abstract identicon style.
 */
export function dicebearAvatar(seed: string, style: DiceBearStyle = 'lorelei'): string {
  const params = new URLSearchParams({ seed: seed || 'default' })
  return `${DICEBEAR_ENDPOINT}/${style}/svg?${params.toString()}`
}
