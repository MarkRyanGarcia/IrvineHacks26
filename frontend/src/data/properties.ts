import { API_BASE } from "../api";
import type { PropertyCard } from "../types";

// ---------------------------------------------------------------------------
// Image fallback pools (used when Zillow photo is unavailable)
// ---------------------------------------------------------------------------
const oneBedModules = import.meta.glob(
  "../assets/HouseImages/1BedImages/*.{jpg,png,jpeg,webp}",
  { eager: true }
);
const twoBedModules = import.meta.glob(
  "../assets/HouseImages/2BedImages/*.{jpg,png,jpeg,webp}",
  { eager: true }
);
const threeBedModules = import.meta.glob(
  "../assets/HouseImages/3BedImages/*.{jpg,png,jpeg,webp}",
  { eager: true }
);
const fourBedModules = import.meta.glob(
  "../assets/HouseImages/4BedImages/*.{jpg,png,jpeg,webp}",
  { eager: true }
);

const ONE_BED_IMAGES = Object.values(oneBedModules).map((mod: any) => mod.default);
const TWO_BED_IMAGES = Object.values(twoBedModules).map((mod: any) => mod.default);
const THREE_BED_IMAGES = Object.values(threeBedModules).map((mod: any) => mod.default);
const FOUR_BED_IMAGES = Object.values(fourBedModules).map((mod: any) => mod.default);

function getFallbackImage(beds: number, index: number): string {
  switch (beds) {
    case 1: return ONE_BED_IMAGES[index % ONE_BED_IMAGES.length];
    case 2: return TWO_BED_IMAGES[index % TWO_BED_IMAGES.length];
    case 3: return THREE_BED_IMAGES[index % THREE_BED_IMAGES.length];
    case 4: return FOUR_BED_IMAGES[index % FOUR_BED_IMAGES.length];
    default: return THREE_BED_IMAGES[0];
  }
}

// ---------------------------------------------------------------------------
// Zillow response → PropertyCard mapper
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapZillowToPropertyCard(property: any, index: number): PropertyCard {
  const zillowPhoto = property.media?.propertyPhotoLinks?.highResolutionLink;

  return {
    zpid: property.zpid,

    // Address
    street_address: property.address?.streetAddress,
    city: property.address?.city,
    state: property.address?.state,
    zip_code: property.address?.zipcode,

    // Coordinates
    latitude: property.location?.latitude,
    longitude: property.location?.longitude,

    // Listing info
    price: property.price?.value,
    price_per_sqft: property.price?.pricePerSquareFoot,
    price_change: property.price?.priceChange,
    price_changed_date: property.price?.changedDate
      ? new Date(property.price.changedDate).toISOString()
      : undefined,
    listing_status: property.listing?.listingStatus,
    days_on_zillow: property.daysOnZillow,
    listing_date: property.listingDateTimeOnZillow
      ? new Date(property.listingDateTimeOnZillow).toISOString()
      : undefined,

    // Property details
    property_type: property.propertyType,
    beds: property.bedrooms,
    baths: property.bathrooms,
    sqft: property.livingArea,
    lot_size: property.lotSizeWithUnit?.lotSize,
    lot_size_unit: property.lotSizeWithUnit?.lotSizeUnit,
    year_built: property.yearBuilt,
    is_new_construction: property.listing?.listingSubType?.isNewConstruction,

    // Estimates
    zestimate: property.estimates?.zestimate,
    rent_zestimate: property.estimates?.rentZestimate,

    // Tax
    tax_assessed_value: property.taxAssessment?.taxAssessedValue,
    tax_assessment_year: property.taxAssessment?.taxAssessmentYear,

    // Media flags
    has_vr_model: property.media?.hasVRModel,
    has_videos: property.media?.hasVideos,
    has_floor_plan: property.hasFloorPlan,
    is_showcase_listing: property.isShowcaseListing,

    // Open house
    open_house_start: property.openHouseShowingList?.[0]?.startTime
      ? new Date(property.openHouseShowingList[0].startTime).toISOString()
      : undefined,
    open_house_end: property.openHouseShowingList?.[0]?.endTime
      ? new Date(property.openHouseShowingList[0].endTime).toISOString()
      : undefined,

    // Broker
    broker_name: property.propertyDisplayRules?.mls?.brokerName,

    // Use Zillow photo if available, otherwise fall back to local assets
    image: zillowPhoto ?? getFallbackImage(property.bedrooms ?? 3, index),
  };
}

// ---------------------------------------------------------------------------
// Fetch live properties from your backend (which calls the Zillow API)
// ---------------------------------------------------------------------------
export async function fetchProperties(): Promise<PropertyCard[]> {
  const response = await fetch(`${API_BASE}/zillow/search`);

  if (!response.ok) {
    throw new Error(`Failed to fetch properties: ${response.statusText}`);
  }

  const data = await response.json();

  // Zillow wraps results under a `results` array — adjust key if your
  // backend reshapes the response differently
  const results = data.results ?? data;

  return results.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (property: any, index: number) => mapZillowToPropertyCard(property, index)
  );
}