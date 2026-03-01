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

export function matchScore(p: PropertyCard) {
  const priceW = Math.max(0, 1 - (p.price ?? 0) / 2_000_000) * 50;
  const sizeW = Math.min((p.sqft ?? 0) / 3000, 1) * 50;
  return Math.round(Math.min(98, Math.max(55, priceW + sizeW + 20)));
}

export function tags(p: PropertyCard) {
  const t: { label: string; color: string }[] = [];
  if (p.is_new_construction) t.push({ label: "New Construction", color: "#6db8a0" });
  if ((p.days_on_zillow ?? 99) <= 7) t.push({ label: "Just Listed", color: "#6db8a0" });
  if ((p.price_change ?? 0) < 0) t.push({ label: "Price Cut", color: "#c4a882" });
  if ((p.price ?? 0) < 600000) t.push({ label: "Under Budget", color: "#6db8a0" });
  if ((p.price ?? 0) > 1000000) t.push({ label: "Premium", color: "#c4a882" });
  if (p.property_type === "condo") t.push({ label: "Condo", color: "#9eb8d4" });
  if ((p.sqft ?? 0) >= 2000) t.push({ label: "Spacious", color: "#7ab3c8" });
  if (p.is_showcase_listing) t.push({ label: "Showcase", color: "#7ab3c8" });
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
