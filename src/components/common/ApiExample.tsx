import { useAuth } from '../../hooks/useAuth'

export const ApiExample = () => {
  const { user, organization, loading, error } = useAuth()

  if (loading) {
    return (
      <div className="p-6">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-center text-gray-600">Loading organization data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🏢 Organization Dashboard</h1>
      
      {user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">👤 Current User</h2>
          <div className="space-y-1">
            <p><span className="font-medium">Email:</span> {user.email}</p>
            <p><span className="font-medium">ID:</span> {user.id}</p>
            {user.createdAt && (
              <p><span className="font-medium">Joined:</span> {new Date(user.createdAt).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      )}

      {organization && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-green-800 mb-2">🏢 Organization</h2>
          <div className="space-y-1">
            <p><span className="font-medium">Name:</span> {organization.name}</p>
            <p><span className="font-medium">ID:</span> {organization.id}</p>
          </div>
        </div>
      )}

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-orange-800 mb-2">🎯 Next Steps</h2>
        <p className="text-orange-700">
          Organization data loaded successfully! The backend auth system is working. 
          Ready to implement signals and other features.
        </p>
      </div>
    </div>
  )
}