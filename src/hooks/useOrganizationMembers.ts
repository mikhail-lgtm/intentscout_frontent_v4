import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { api } from '../lib/apiClient'

interface OrganizationMember {
  id: string
  email: string
  isAdmin: boolean
  createdAt: string
}

interface UseOrganizationMembersReturn {
  members: OrganizationMember[]
  loading: boolean
  error: string | null
  adminUser: OrganizationMember | null
  refetch: () => void
}

export const useOrganizationMembers = (): UseOrganizationMembersReturn => {
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, organization } = useAuth()

  const fetchOrganizationMembers = async () => {
    if (!user || !organization) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await api.organization.members()
      
      if (response.error) {
        throw new Error(response.error)
      }

      setMembers(response.data || [])
    } catch (err) {
      console.error('Failed to fetch organization members:', err)
      setError('Failed to load organization members')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizationMembers()
  }, [user, organization])

  const adminUser = members.find(member => member.isAdmin) || null

  return {
    members,
    loading,
    error,
    adminUser,
    refetch: fetchOrganizationMembers
  }
}