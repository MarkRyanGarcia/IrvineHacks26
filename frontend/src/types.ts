export interface PropertyCard {
  id: number;
  address: string;
  city: string;
  zip: string;
  price: number;
  sqft: number;
  beds: number;
  baths: number;
  property_type: string;
  school_score: number;
  commute_minutes: number;
  image: string;
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
}

export interface ChatResponse {
  reply: string;
}

export interface SavedProperty {
  id: number;
  user_id: string;
  liked: boolean;
  address: string;
  city: string;
  price: number;
  sqft: number;
  beds: number;
  baths: number;
  property_type: string;
  school_score: number;
  zip_code: string;
  commute_minutes: number;
  created_at: string;
}

export interface SavePropertyRequest {
  user_id: string;
  liked: boolean;
  address: string;
  city: string;
  price: number;
  sqft: number;
  beds: number;
  baths: number;
  property_type: string;
  school_score: number;
  zip_code: string;
  commute_minutes: number;
}
