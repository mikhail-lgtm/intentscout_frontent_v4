import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/apiClient'

// Module-level cache for API calls
const requestCache = new Map<string, Promise<any>>()
const resultCache = new Map<string, any>()

const getCachedIntentScores = async (params: { date: string; product_id: string; min_score: number }) => {
  const cacheKey = `intent-scores-${params.date}-${params.product_id}-${params.min_score}`
  
  // Return cached result if available
  if (resultCache.has(cacheKey)) {
    console.log('Using cached intent scores for', cacheKey)
    return resultCache.get(cacheKey)
  }
  
  // Return existing promise if request is in flight
  if (requestCache.has(cacheKey)) {
    console.log('Returning existing intent scores request for', cacheKey)
    return requestCache.get(cacheKey)
  }
  
  // Create new request
  console.log('Making new intent scores request for', cacheKey)
  const promise = api.signals.getIntentScores(params).then(response => {
    resultCache.set(cacheKey, response)
    requestCache.delete(cacheKey)
    return response
  }).catch(error => {
    requestCache.delete(cacheKey)
    throw error
  })
  
  requestCache.set(cacheKey, promise)
  return promise
}

export interface Signal {
  id: string
  company: {
    id: string
    name: string
    industry?: string
    companySize?: string
    website?: string
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
  intentScore: number
  reasoning: string
  citations: string[]
  date: string
  modelUsed: string
  calculationTimestamp: string
  jobsFoundCount: number
  decision?: 'approve' | 'reject' | null
  jobs: Array<{
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
    pageHtmlBackblazeUuid?: string
  }>
}

interface FilterOptions {
  product: string
  minScore: number
  vertical: string
}

interface IntentScoreResponse {
  id: string
  companyId: string
  productServiceId: string
  intentScore: number
  reasoning: string
  citations: string[]
  date: string
  modelUsed: string
  calculationTimestamp: string
  jobsFoundCount: number
  decision?: string
}

interface CompanyResponse {
  id: string
  name: string
  industry?: string
  companySize?: string
  website?: string
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

interface JobResponse {
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
  pageHtmlBackblazeUuid?: string
}

export const useSignals = (date: string, filters: FilterOptions) => {
  const [signals, setSignals] = useState<Signal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isIntentScoresLoading, setIsIntentScoresLoading] = useState(false)
  const [isCompaniesLoading, setIsCompaniesLoading] = useState(false)
  const [isJobsLoading, setIsJobsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentRequestRef = useRef<string | null>(null)

  // Fetch signals data
  const fetchSignals = useCallback(async () => {
    const requestKey = `${date}-${filters.product}-${filters.minScore}-${filters.vertical}`
    
    // Prevent duplicate requests
    if (currentRequestRef.current === requestKey) {
      return
    }
    
    currentRequestRef.current = requestKey
    
    try {
      setIsLoading(true)
      setError(null)

      // Step 1: Get intent scores for the date and filters
      setIsIntentScoresLoading(true)
      const intentScoresResponse = await getCachedIntentScores({
        date,
        product_id: filters.product,
        min_score: filters.minScore
      })
      
      if (intentScoresResponse.error) {
        throw new Error(intentScoresResponse.error)
      }

      const intentScores = intentScoresResponse.data as IntentScoreResponse[]
      setIsIntentScoresLoading(false)
      
      if (intentScores.length === 0) {
        setSignals([])
        return
      }

      // Step 2: Get unique company IDs and job IDs
      const companyIds = [...new Set(intentScores.map(score => score.companyId))]
      const allJobIds = intentScores.flatMap(score => score.citations)
      const uniqueJobIds = [...new Set(allJobIds)].filter(id => id)

      // Step 3: Fetch company and job details in parallel
      setIsCompaniesLoading(true)
      setIsJobsLoading(true)

      const [companiesResponse, jobsResponse] = await Promise.all([
        companyIds.length > 0 
          ? api.signals.getCompanies(companyIds)
          : Promise.resolve({ data: [], error: null }),
        uniqueJobIds.length > 0
          ? api.signals.getJobs(uniqueJobIds)
          : Promise.resolve({ data: [], error: null })
      ])

      setIsCompaniesLoading(false)
      setIsJobsLoading(false)

      if (companiesResponse.error) {
        console.warn('Failed to fetch companies:', companiesResponse.error)
      }
      
      if (jobsResponse.error) {
        console.warn('Failed to fetch jobs:', jobsResponse.error)
      }

      const companies = (companiesResponse.data as CompanyResponse[]) || []
      const jobs = (jobsResponse.data as JobResponse[]) || []

      // Step 4: Create lookup maps
      const companyMap = new Map(companies.map(company => [company.id, company]))
      const jobMap = new Map(jobs.map(job => [job.id, job]))

      // Step 5: Combine data into Signal objects
      const combinedSignals: Signal[] = intentScores.map(intentScore => {
        const company = companyMap.get(intentScore.companyId)
        const citedJobs = intentScore.citations
          .map(jobId => jobMap.get(jobId))
          .filter(job => job !== undefined) as JobResponse[]

        return {
          id: intentScore.id,
          company: {
            id: company?.id || intentScore.companyId,
            name: company?.name || 'Unknown Company',
            industry: company?.industry,
            companySize: company?.companySize,
            website: company?.website,
            logoUrl: company?.logoUrl,
            profilePictureUrl: company?.profilePictureUrl,
            bannerUrl: company?.bannerUrl,
            aboutUs: company?.aboutUs,
            headquarters: company?.headquarters,
            type: company?.type,
            founded: company?.founded,
            specialties: company?.specialties,
            vertical: company?.vertical
          },
          intentScore: intentScore.intentScore,
          reasoning: intentScore.reasoning,
          citations: intentScore.citations,
          date: intentScore.date,
          modelUsed: intentScore.modelUsed,
          calculationTimestamp: intentScore.calculationTimestamp,
          jobsFoundCount: intentScore.jobsFoundCount,
          decision: intentScore.decision as 'approve' | 'reject' | null,
          jobs: citedJobs.map(job => ({
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            datePosted: job.datePosted,
            jobUrl: job.jobUrl,
            descriptionMarkdown: job.descriptionMarkdown,
            isRemote: job.isRemote,
            companyId: job.companyId,
            site: job.site,
            pageHtmlBackblazeUuid: job.pageHtmlBackblazeUuid
          }))
        }
      })

      // Apply vertical filter if specified
      const filteredSignals = filters.vertical 
        ? combinedSignals.filter(signal => 
            signal.company.vertical?.toLowerCase() === filters.vertical.toLowerCase()
          )
        : combinedSignals

      setSignals(filteredSignals)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch signals'
      setError(errorMessage)
      console.error('Error fetching signals:', err)
    } finally {
      setIsLoading(false)
      setIsIntentScoresLoading(false)
      setIsCompaniesLoading(false)
      setIsJobsLoading(false)
      currentRequestRef.current = null
    }
  }, [date, filters])

  // Mark signal with decision
  const markSignal = useCallback(async (signalId: string, decision: 'approve' | 'reject') => {
    try {
      // TODO: Implement mark signal API endpoint
      // For now, just update local state
      setSignals(prev => prev.map(signal => 
        signal.id === signalId 
          ? { ...signal, decision }
          : signal
      ))
    } catch (error) {
      console.error('Failed to mark signal:', error)
    }
  }, [])

  // Refetch data
  const refetch = useCallback(() => {
    fetchSignals()
  }, [fetchSignals])

  // Effect to fetch signals when dependencies change
  useEffect(() => {
    fetchSignals()
  }, [fetchSignals])

  return {
    signals,
    isLoading,
    isIntentScoresLoading,
    isCompaniesLoading,
    isJobsLoading,
    error,
    refetch,
    markSignal
  }
}