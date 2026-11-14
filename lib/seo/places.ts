import { FAMILIES } from "@/lib/jobs/families";
import { type Market, UK_CITIES, US_CITIES } from "@/lib/jobs/normalize";

/**
 * The public job search pages: one per place, one per role family, and one per
 * family in each place. The URLs are what people type into Google:
 * /jobs/london, /jobs/software-engineer, /jobs/software-engineer/london.
 */

export type Place = {
  slug: string;
  /** "London", "the UK", "the US". */
  name: string;
  market: Market;
  kind: "country" | "city" | "remote";
  city?: string;
};

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const city = (market: Market) => (name: string) =>
  ({ slug: slugify(name), name, market, kind: "city", city: name }) as Place;

export const PLACES: Place[] = [
  { slug: "uk", name: "the UK", market: "GB", kind: "country" },
  { slug: "us", name: "the US", market: "US", kind: "country" },
  { slug: "remote-uk", name: "the UK", market: "GB", kind: "remote" },
  { slug: "remote-us", name: "the US", market: "US", kind: "remote" },
  ...UK_CITIES.map(city("GB")),
  // "Washington" means DC in our city list.
  ...US_CITIES.map(city("US")).map((p) =>
    p.slug === "washington" ? { ...p, slug: "washington-dc" } : p,
  ),
];

export type RoleFamily = {
  id: string;
  slug: string;
  /** Reads after "remote" and before "jobs": "software engineer". */
  noun: string;
};

const NOUNS: Record<string, string> = {
  hospitality: "hospitality and retail",
  data: "data and analytics",
  product: "product manager",
  design: "design",
  engineering: "software engineer",
  marketing: "marketing",
  sales: "sales",
  customer: "customer success and support",
  operations: "operations",
  finance: "finance and accounting",
  people: "HR and people",
  legal: "legal and compliance",
  science: "science and research",
  admin: "admin and office",
};

export const ROLE_FAMILIES: RoleFamily[] = FAMILIES.map((f) => {
  const noun = NOUNS[f.id] ?? f.label.toLowerCase();
  return { id: f.id, slug: slugify(noun), noun };
});

export const placeBySlug = (s: string) => PLACES.find((p) => p.slug === s);
export const familyBySlug = (s: string) =>
  ROLE_FAMILIES.find((f) => f.slug === s);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Remote software engineer jobs in the UK", "Jobs in London", "Sales jobs". */
export function pageHeading(family?: RoleFamily, place?: Place): string {
  const words = [
    place?.kind === "remote" ? "remote" : "",
    family?.noun ?? "",
    "jobs",
  ]
    .filter(Boolean)
    .join(" ");
  const where = place ? ` in ${place.name}` : " in the UK and US";
  return cap(words) + where;
}

export function pagePath(family?: RoleFamily, place?: Place): string {
  if (family && place) return `/jobs/${family.slug}/${place.slug}`;
  if (family) return `/jobs/${family.slug}`;
  if (place) return `/jobs/${place.slug}`;
  return "/jobs";
}

/** Pages with fewer live roles than this stay out of the sitemap and search results. */
export const MIN_INDEXED_ROLES = 10;
