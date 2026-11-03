export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  is_admin: boolean;
  created_at: string;
}

export interface Indicator {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  description: string;
  value: string;
}

export interface AnalysisFeatures {
  url_length: number;
  hostname_length: number;
  path_length: number;
  query_length: number;
  num_dots: number;
  num_hyphens: number;
  num_underscores: number;
  num_slashes: number;
  num_question_marks: number;
  num_equal_signs: number;
  num_at_symbols: number;
  num_percent_signs: number;
  num_digits: number;
  digit_ratio: number;
  num_subdomains: number;
  is_ip_address: number;
  has_punycode: number;
  is_https: number;
  has_non_standard_port: number;
  has_suspicious_keywords: number;
  keyword_count: number;
  has_brand_in_subdomain: number;
  entropy: number;
  tld_in_path: number;
  has_double_slash_in_path: number;
}

export interface AnalysisResult {
  id?: number;
  analysis_id?: number | null;
  user_id?: number | null;
  submitted_url: string;
  normalized_url: string;
  risk_score: number;
  classification: string;
  risk_level: 'low' | 'moderate' | 'high';
  model_confidence: number;
  confidence_note?: string;
  summary: string;
  recommendation: string;
  indicators: Indicator[];
  features: AnalysisFeatures;
  model_version: string;
  disclaimer: string;
  saved?: boolean;
  save_note?: string;
  created_at?: string;
}

export interface SampleUrl {
  id: string;
  label: string;
  category: 'Legitimate' | 'Phishing';
  url: string;
  description: string;
}

export interface HistoryListResponse {
  items: AnalysisResult[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
}

export interface AdminSummaryResponse {
  aggregates: {
    total_users: number;
    total_analyses: number;
    average_risk_score: number;
    classification_breakdown: {
      low: number;
      moderate: number;
      high: number;
    };
  };
  system_health: {
    database_status: string;
    model_engine: string;
    model_ready: boolean;
    rate_limiter_active: boolean;
  };
  recent_analyses: (AnalysisResult & { user_email: string })[];
}

export interface AdminAnalysesResponse {
  items: (AnalysisResult & { user_email: string; user_name: string })[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
}

export interface SocialEngineeringTrigger {
  name: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  matched_text: string;
}

export interface ExtractedUrlAnalysis {
  url: string;
  risk_score: number;
  risk_level: 'low' | 'moderate' | 'high';
  classification: string;
  indicators: Indicator[];
  valid: boolean;
}

export interface MessageAnalysisResult {
  overall_risk_score: number;
  overall_risk_level: 'low' | 'moderate' | 'high';
  classification: string;
  summary: string;
  recommendation: string;
  social_engineering: {
    score: number;
    triggers_count: number;
    urgency_level: 'critical' | 'moderate' | 'low';
    triggers: SocialEngineeringTrigger[];
  };
  sender: {
    raw: string;
    email: string;
    domain: string;
    mismatch_detected: boolean;
    warning: string;
  };
  extracted_urls: ExtractedUrlAnalysis[];
  urls_count: number;
  message_preview: string;
}

export interface SampleMessage {
  id: string;
  label: string;
  type: string;
  sender: string;
  text: string;
  description: string;
}

