// Core data types for signals functionality

export interface Company {
  id: string
  name: string
  industry: string
  size: string
  website: string
  logoUrl?: string
  profilePictureUrl?: string
  bannerUrl?: string
  aboutUs?: string
  headquarters?: string
  type?: string
  founded?: number
  specialties?: string
  vertical?: string
}

export interface Job {
  id: string
  title: string
  company: string
  location: string
  datePosted: string
  jobUrl: string
  descriptionMarkdown: string
  isRemote: boolean
  companyId: string
  site: string
}

export interface IntentScore {
  id: string
  companyId: string
  productServiceId: string
  intentScore: number
  reasoning: string
  citations: string[] // Array of job IDs
  date: string
  modelUsed: string
  calculationTimestamp: string
  jobsFoundCount: number
  decision?: 'approve' | 'reject' | null
}

export interface Signal {
  id: string
  company: Company
  intentScore: IntentScore
  citedJobs: Job[]
  decision?: 'approve' | 'reject' | null
}

export interface FilterOptions {
  product: string
  minScore: number
  vertical: string
}

// API Response types
export interface IntentScoreResponse {
  _id: string
  company_id: string
  product_service_id: string
  intent_score: number
  reasoning: string
  citations: string[]
  date: string
  model_used: string
  calculation_timestamp: string
  jobs_found_count: number
  organizationId: string
  decision?: string
}

export interface CompanyResponse {
  _id: string
  name: string
  industry: string
  company_size: string
  website: string
  logo_url?: string
  profile_picture_url?: string
  banner_url?: string
  about_us?: string
  headquarters?: string
  type?: string
  founded?: number
  specialties?: string
  vertical?: string
}

export interface JobResponse {
  _id: string
  title: string
  company: string
  location: string
  date_posted: string
  job_url: string
  description_markdown: string
  is_remote: boolean
  company_id: string
  site: string
}