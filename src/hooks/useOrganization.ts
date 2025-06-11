import { useAuth } from './useAuth'

export const useOrganization = () => {
  const { organization } = useAuth()
  return organization
}