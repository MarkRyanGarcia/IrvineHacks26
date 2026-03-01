import type { PropertyCard as CardType } from "../types";
import { Bed, Bath, Maximize2, TrendingUp, Zap, Video, Layers } from "lucide-react";

interface Props {
  property: CardType;
}

function fmt(n: number) {
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : `$${(n / 1_000).toFixed(0)}K`;
}

export default function PropertyCard({ property }: Props) {
  const tags: string[] = [];
  if (property.is_new_construction) tags.push("New");
  if (property.is_showcase_listing) tags.push("Showcase");
  if (property.has_vr_model) tags.push("3D Tour");
  if (property.has_floor_plan) tags.push("Floor Plan");
  if (property.has_videos) tags.push("Video");

  const appreciationLabel =
    property.zestimate != null && property.price != null && property.price > 0
      ? (((property.zestimate - property.price) / property.price) * 100).toFixed(1)
      : null;

  return (
    <div className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl select-none"
      style={{ height: 420 }}>

      {/* Full-bleed photo */}
      <img
        src={property.image ?? property.photo_url ?? ""}
        alt={property.street_address ?? "Property"}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.0) 35%, rgba(0,0,0,0.75) 75%, rgba(0,0,0,0.92) 100%)" }}
      />

      {/* Top-right: appreciation badge */}
      {appreciationLabel !== null && (
        <div className="absolute top-4 right-4 flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold"
          style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(10px)", color: "white" }}>
          <TrendingUp size={12} className="text-emerald-400" />
          <span className="text-emerald-300">{appreciationLabel}%</span>
          <span className="text-white/60 font-normal ml-0.5">Zestimate</span>
        </div>
      )}

      {/* Price cut badge */}
      {property.price_change != null && property.price_change < 0 && (
        <div className="absolute top-4 left-4 flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold"
          style={{ background: "rgba(245,158,11,0.85)", backdropFilter: "blur(8px)", color: "white" }}>
          ↓ {fmt(Math.abs(property.price_change))} cut
        </div>
      )}

      {/* Bottom overlay content */}
      <div className="absolute bottom-0 left-0 right-0 p-5">

        {/* Feature tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map((tag) => (
              <span key={tag}
                className="flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.9)" }}>
                {tag === "3D Tour" && <Zap size={10} />}
                {tag === "Video" && <Video size={10} />}
                {tag === "Floor Plan" && <Layers size={10} />}
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Address */}
        <p className="text-white font-semibold text-lg leading-tight">
          {property.street_address ?? "—"}
        </p>
        <p className="text-white/70 text-sm mt-0.5">
          {[property.city, property.state].filter(Boolean).join(", ")}
          {property.zip_code ? ` · ${property.zip_code}` : ""}
        </p>

        {/* Price + stats row */}
        <div className="flex items-end justify-between mt-3">
          <p className="text-white text-2xl font-bold tracking-tight">
            {property.price != null ? fmt(property.price) : "Price N/A"}
          </p>
          <div className="flex items-center gap-3 text-white/80 text-sm pb-0.5">
            {property.beds != null && (
              <span className="flex items-center gap-1">
                <Bed size={14} /> {property.beds}
              </span>
            )}
            {property.baths != null && (
              <span className="flex items-center gap-1">
                <Bath size={14} /> {property.baths}
              </span>
            )}
            {property.sqft != null && (
              <span className="flex items-center gap-1">
                <Maximize2 size={14} /> {property.sqft.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Days on market */}
        {property.days_on_zillow != null && (
          <p className="text-white/40 text-xs mt-1.5">
            {property.days_on_zillow} days on market
            {property.year_built != null && ` · Built ${property.year_built}`}
          </p>
        )}
      </div>
    </div>
  );
}