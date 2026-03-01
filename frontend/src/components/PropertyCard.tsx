import type { PropertyCard as CardType } from "../types";
import { Bed, Bath, Maximize, Calendar, TrendingUp } from "lucide-react";

interface Props {
  property: CardType;
}

function fmt(n: number) {
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : `$${(n / 1_000).toFixed(0)}K`;
}

export default function PropertyCard({ property }: Props) {
  return (
    <div className="w-full max-w-sm rounded-2xl overflow-hidden bg-base-2 shadow-xl select-none">
      <img
        src={property.image ?? property.photo_url ?? ""}
        alt={property.street_address ?? "Property"}
        className="w-full h-52 object-cover"
        draggable={false}
      />
      <div className="p-5">
        <p className="text-2xl font-bold text-primary">
          {property.price != null ? fmt(property.price) : "Price N/A"}
        </p>
        <p className="text-secondary text-sm mt-0.5">
          {property.street_address}, {property.city}
        </p>
        <p className="text-secondary/60 text-xs capitalize">
          {property.property_type ?? "—"}
        </p>

        <div className="flex items-center gap-4 mt-4 text-secondary text-sm">
          <span className="flex items-center gap-1">
            <Bed size={15} /> {property.beds ?? "—"}
          </span>
          <span className="flex items-center gap-1">
            <Bath size={15} /> {property.baths ?? "—"}
          </span>
          <span className="flex items-center gap-1">
            <Maximize size={15} /> {property.sqft?.toLocaleString() ?? "—"} ft²
          </span>
        </div>

        <div className="flex items-center gap-4 mt-2 text-secondary/70 text-xs">
          {property.year_built != null && (
            <span className="flex items-center gap-1">
              <Calendar size={13} /> Built {property.year_built}
            </span>
          )}
          {property.zestimate != null && (
            <span className="flex items-center gap-1">
              <TrendingUp size={13} /> Zestimate {fmt(property.zestimate)}
            </span>
          )}
        </div>

        {property.days_on_zillow != null && (
          <p className="text-secondary/50 text-xs mt-2">
            {property.days_on_zillow} days on market
            {property.price_change != null && property.price_change < 0 && (
              <span className="text-amber-500 ml-2">
                ↓ Price cut {fmt(Math.abs(property.price_change))}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}