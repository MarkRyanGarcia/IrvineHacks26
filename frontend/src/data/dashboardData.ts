import type { PropertyCard } from "../types";

export const SURVEY = [
  { q: "How many bedrooms are you looking for?", options: ["1–2", "3", "4", "5+"] },
  { q: "What's your ideal location type?", options: ["Urban", "Suburban", "Coastal", "Rural"] },
  { q: "What's your budget range?", options: ["Under $500k", "$500–750k", "$750k–1M", "$1M+"] },
  { q: "How important are schools nearby?", options: ["Very", "Somewhat", "Not really", "No kids"] },
] as const;

export function fmtPrice(n: number) {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1_000).toLocaleString()}k`;
}

export interface FitProfile {
  targetPrice: number;
  targetBeds: number;
  targetSqft: number;
}

export function buildFitProfile(liked: PropertyCard[]): FitProfile {
  if (liked.length === 0) {
    return { targetPrice: 800_000, targetBeds: 3, targetSqft: 2000 };
  }
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    targetPrice: avg(liked.map(p => p.price ?? 800_000)),
    targetBeds: avg(liked.map(p => p.beds ?? 3)),
    targetSqft: avg(liked.map(p => p.sqft ?? 2000)),
  };
}

export function computeFitScore(p: PropertyCard, profile: FitProfile): number {
  const { targetPrice, targetBeds, targetSqft } = profile;
  const priceSim = 1 - Math.min(1, Math.abs((p.price ?? targetPrice) - targetPrice) / targetPrice);
  const bedSim = 1 - Math.min(1, Math.abs((p.beds ?? targetBeds) - targetBeds) / 4);
  const sqftSim = 1 - Math.min(1, Math.abs((p.sqft ?? targetSqft) - targetSqft) / targetSqft);
  const score = 0.5 * priceSim + 0.25 * bedSim + 0.25 * sqftSim;
  return Math.round(Math.min(98, Math.max(35, score * 100)));
}

/** Legacy single-arg score kept for any callers outside the dashboard */
export function matchScore(p: PropertyCard) {
  return computeFitScore(p, buildFitProfile([]));
}

export function tags(p: PropertyCard) {
  const t: { label: string; color: string }[] = [];
  if (p.is_new_construction) t.push({ label: "New Construction", color: "rgba(255,255,255,0.95)" });
  if ((p.days_on_zillow ?? 99) <= 7) t.push({ label: "Just Listed", color: "rgba(255,255,255,0.95)" });
  if ((p.price_change ?? 0) < 0) t.push({ label: "Price Cut", color: "#FFD4A3" });
  if ((p.price ?? 0) < 600000) t.push({ label: "Under Budget", color: "rgba(255,255,255,0.95)" });
  if ((p.price ?? 0) > 1000000) t.push({ label: "Premium", color: "#FFD4A3" });
  if (p.property_type === "condo") t.push({ label: "Condo", color: "rgba(255,230,190,0.9)" });
  if ((p.sqft ?? 0) >= 2000) t.push({ label: "Spacious", color: "rgba(255,230,190,0.9)" });
  if (p.is_showcase_listing) t.push({ label: "Showcase", color: "rgba(255,230,190,0.9)" });
  return t.slice(0, 3);
}

export function filterByBedrooms(props: PropertyCard[], bedroomPref: string | null): PropertyCard[] {
  if (!bedroomPref) return props;
  const beds = (p: PropertyCard) => p.beds ?? 0;
  switch (bedroomPref) {
    case "1–2": return props.filter(p => beds(p) >= 1 && beds(p) <= 2);
    case "3": return props.filter(p => beds(p) >= 3);
    case "4": return props.filter(p => beds(p) >= 4);
    case "5+": return props.filter(p => beds(p) >= 5);
    default: return props;
  }
}

export function filterByBudget(props: PropertyCard[], budgetPref: string | null): PropertyCard[] {
  if (!budgetPref) return props;
  const price = (p: PropertyCard) => p.price ?? 0;
  switch (budgetPref) {
    case "Under $500k": return props.filter(p => price(p) < 500_000);
    case "$500–750k": return props.filter(p => price(p) >= 500_000 && price(p) < 750_000);
    case "$750k–1M": return props.filter(p => price(p) >= 750_000 && price(p) < 1_000_000);
    case "$1M+": return props.filter(p => price(p) >= 1_000_000);
    default: return props;
  }
}
