export interface PropertyCard {
  // Internal
  zpid?: number;
  image?: string;

  // Address
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;

  // Coordinates
  latitude?: number;
  longitude?: number;

  // Listing info
  price?: number;
  price_per_sqft?: number;
  price_change?: number;
  price_changed_date?: string;
  listing_status?: string;
  days_on_zillow?: number;
  listing_date?: string;

  // Property details
  property_type?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  lot_size?: number;
  lot_size_unit?: string;
  year_built?: number;
  is_new_construction?: boolean;

  // Estimates
  zestimate?: number;
  rent_zestimate?: number;

  // Tax
  tax_assessed_value?: number;
  tax_assessment_year?: string;

  // Media flags
  has_vr_model?: boolean;
  has_videos?: boolean;
  has_floor_plan?: boolean;
  is_showcase_listing?: boolean;

  // Open house
  open_house_start?: string;
  open_house_end?: string;

  // Broker
  broker_name?: string;

  // Thumbnail
  photo_url?: string;
}

export interface SwipeProfile {
  price_sensitivity: number;
  size_preference: number;
  school_importance: number;
  commute_tolerance: number;
  stretch_behavior: number;
}

export interface QuizAnswers {
  risk_tolerance: number;
  timeline_years: number;
  priority_weights: {
    schools: number;
    stability: number;
    growth: number;
    space: number;
  };
}

export interface AnalyzeRequest {
  zip: string;
  current_price: number;
  offer_price: number;
  down_payment_pct: number;
  income: number;
  horizon_years: number;
  risk_tolerance: number;
  home_features?: {
    sqft: number;
    beds: number;
    baths: number;
    property_type: string;
  };
}

export interface AnalyzeResponse {
  confidence_score: number;
  prob_downside: number;
  p10: number;
  p50: number;
  p90: number;
  fair_value_low: number;
  fair_value_high: number;
  fragility_index: string;
}

export interface ExplainResponse {
  explanation: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  analysis_context?: Record<string, unknown>;
  user_id?: string;
}

export interface ChatResponse {
  reply: string;
}

export interface SavedProperty {
  id: number;
  user_id: string;
  liked: boolean;
  zpid?: number;

  // Address
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;

  // Coordinates
  latitude?: number;
  longitude?: number;

  // Listing info
  price?: number;
  price_per_sqft?: number;
  price_change?: number;
  price_changed_date?: string;
  listing_status?: string;
  days_on_zillow?: number;
  listing_date?: string;

  // Property details
  property_type?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  lot_size?: number;
  lot_size_unit?: string;
  year_built?: number;
  is_new_construction?: boolean;

  // Estimates
  zestimate?: number;
  rent_zestimate?: number;

  // Tax
  tax_assessed_value?: number;
  tax_assessment_year?: string;

  // Media flags
  has_vr_model?: boolean;
  has_videos?: boolean;
  has_floor_plan?: boolean;
  is_showcase_listing?: boolean;

  // Open house
  open_house_start?: string;
  open_house_end?: string;

  // Broker
  broker_name?: string;

  // Thumbnail
  photo_url?: string;

  created_at: string;
}

export interface SavePropertyRequest {
  user_id: string;
  liked: boolean;
  zpid?: number;

  // Address
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;

  // Coordinates
  latitude?: number;
  longitude?: number;

  // Listing info
  price?: number;
  price_per_sqft?: number;
  price_change?: number;
  price_changed_date?: string;
  listing_status?: string;
  days_on_zillow?: number;
  listing_date?: string;

  // Property details
  property_type?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  lot_size?: number;
  lot_size_unit?: string;
  year_built?: number;
  is_new_construction?: boolean;

  // Estimates
  zestimate?: number;
  rent_zestimate?: number;

  // Tax
  tax_assessed_value?: number;
  tax_assessment_year?: string;

  // Media flags
  has_vr_model?: boolean;
  has_videos?: boolean;
  has_floor_plan?: boolean;
  is_showcase_listing?: boolean;

  // Open house
  open_house_start?: string;
  open_house_end?: string;

  // Broker
  broker_name?: string;

  // Thumbnail
  photo_url?: string;
}