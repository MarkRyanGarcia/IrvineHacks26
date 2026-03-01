import type { PropertyCard } from "../types";

/*
  Load images by bedroom category
*/

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

/*
  Convert modules to arrays
*/

const ONE_BED_IMAGES = Object.values(oneBedModules).map(
  (mod: any) => mod.default
);

const TWO_BED_IMAGES = Object.values(twoBedModules).map(
  (mod: any) => mod.default
);

const THREE_BED_IMAGES = Object.values(threeBedModules).map(
  (mod: any) => mod.default
);

const FOUR_BED_IMAGES = Object.values(fourBedModules).map(
  (mod: any) => mod.default
);

/*
  Helper function to get image based on bed count
*/

function getImageByBeds(beds: number, index: number) {
  switch (beds) {
    case 1:
      return ONE_BED_IMAGES[index % ONE_BED_IMAGES.length];
    case 2:
      return TWO_BED_IMAGES[index % TWO_BED_IMAGES.length];
    case 3:
      return THREE_BED_IMAGES[index % THREE_BED_IMAGES.length];
    case 4:
      return FOUR_BED_IMAGES[index % FOUR_BED_IMAGES.length];
    default:
      return THREE_BED_IMAGES[0]; // fallback
  }
}

/*
  Mock properties
*/

const rawProperties: Omit<PropertyCard, "image">[] = [
  {
    id: 1,
    address: "142 Willow Creek Dr",
    city: "Irvine",
    zip: "92602",
    price: 785000,
    sqft: 1650,
    beds: 3,
    baths: 2,
    property_type: "Townhouse",
    school_score: 9,
    commute_minutes: 22,
  },
  {
    id: 2,
    address: "88 Oakridge Ln",
    city: "Irvine",
    zip: "92604",
    price: 1250000,
    sqft: 2800,
    beds: 4,
    baths: 3,
    property_type: "Single Family",
    school_score: 10,
    commute_minutes: 15,
  },
  {
    id: 3,
    address: "501 Harbor View",
    city: "San Diego",
    zip: "92101",
    price: 620000,
    sqft: 1200,
    beds: 2,
    baths: 2,
    property_type: "Condo",
    school_score: 7,
    commute_minutes: 10,
  },
  {
    id: 4,
    address: "3310 Maple Ave",
    city: "Austin",
    zip: "78701",
    price: 540000,
    sqft: 1800,
    beds: 3,
    baths: 2,
    property_type: "Single Family",
    school_score: 8,
    commute_minutes: 30,
  },
  {
  id: 5,
  address: "210 Lakeview Terrace",
  city: "Seattle",
  zip: "98109",
  price: 865000,
  sqft: 1750,
  beds: 3,
  baths: 2,
  property_type: "Single Family",
  school_score: 8,
  commute_minutes: 18,
  },
  {
  id: 6,
  address: "14 Ocean Crest Way",
  city: "San Diego",
  zip: "92130",
  price: 1425000,
  sqft: 2950,
  beds: 4,
  baths: 3,
  property_type: "Single Family",
  school_score: 9,
  commute_minutes: 25,
  },
  {
  id: 7,
  address: "77 Midtown Plaza",
  city: "Atlanta",
  zip: "30308",
  price: 420000,
  sqft: 950,
  beds: 1,
  baths: 1,
  property_type: "Condo",
  school_score: 7,
  commute_minutes: 12,
  },
  {
  id: 8,
  address: "509 Desert Bloom Ave",
  city: "Phoenix",
  zip: "85016",
  price: 375000,
  sqft: 1600,
  beds: 2,
  baths: 2,
  property_type: "Townhouse",
  school_score: 6,
  commute_minutes: 22,
  },
  {
  id: 9,
  address: "321 Harbor Lights Dr",
  city: "Miami",
  zip: "33132",
  price: 610000,
  sqft: 1350,
  beds: 2,
  baths: 2,
  property_type: "Condo",
  school_score: 7,
  commute_minutes: 15,
  },
];

/*
  Attach correct images dynamically
*/

export const MOCK_PROPERTIES: PropertyCard[] = rawProperties.map(
  (property, index) => ({
    ...property,
    image: getImageByBeds(property.beds, index),
  })
);