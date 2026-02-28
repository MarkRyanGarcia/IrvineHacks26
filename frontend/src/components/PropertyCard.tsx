import type { PropertyCard as CardType } from "../types";
import { Bed, Bath, Maximize, GraduationCap, Clock } from "lucide-react";

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
        src={property.image}
        alt={property.address}
        className="w-full h-52 object-cover"
        draggable={false}
      />
      <div className="p-5">
        <p className="text-2xl font-bold text-primary">{fmt(property.price)}</p>
        <p className="text-secondary text-sm mt-0.5">
          {property.address}, {property.city}
        </p>
        <p className="text-secondary/60 text-xs">{property.property_type}</p>

        <div className="flex items-center gap-4 mt-4 text-secondary text-sm">
          <span className="flex items-center gap-1">
            <Bed size={15} /> {property.beds}
          </span>
          <span className="flex items-center gap-1">
            <Bath size={15} /> {property.baths}
          </span>
          <span className="flex items-center gap-1">
            <Maximize size={15} /> {property.sqft.toLocaleString()} ft²
          </span>
        </div>

        <div className="flex items-center gap-4 mt-2 text-secondary/70 text-xs">
          <span className="flex items-center gap-1">
            <GraduationCap size={13} /> Schools: {property.school_score}/10
          </span>
          <span className="flex items-center gap-1">
            <Clock size={13} /> {property.commute_minutes} min commute
          </span>
        </div>
      </div>
    </div>
  );
}
