import React from 'react'
import { Mail, Users, TrendingUp, Clock } from 'lucide-react'

export const USGOutreachPage = () => {
  const demoStats = [
    {
      title: "Total Contacts",
      value: "247",
      icon: Users,
      color: "blue"
    },
    {
      title: "Emails Sent",
      value: "89",
      icon: Mail,
      color: "green"
    },
    {
      title: "Response Rate",
      value: "23%",
      icon: TrendingUp,
      color: "orange"
    },
    {
      title: "Avg Response Time",
      value: "2.4 days",
      icon: Clock,
      color: "purple"
    }
  ]

  const recentOutreach = [
    {
      id: 1,
      contact: "Mike Johnson",
      company: "Miami Metro Construction",
      project: "Emergency Doors at Metrorail Station",
      status: "Responded",
      lastContact: "2 hours ago",
      statusColor: "green"
    },
    {
      id: 2,
      contact: "Sarah Davis",
      company: "North Port Engineering",
      project: "Pan American Wastewater Facility",
      status: "Opened",
      lastContact: "1 day ago",
      statusColor: "blue"
    },
    {
      id: 3,
      contact: "Tom Wilson",
      company: "Jupiter Parks & Recreation",
      project: "Blue Heron Park Pickleball Courts",
      status: "Sent",
      lastContact: "3 days ago",
      statusColor: "gray"
    }
  ]

  const getIconColor = (color: string) => {
    switch (color) {
      case 'blue': return 'text-blue-600 bg-blue-100'
      case 'green': return 'text-green-600 bg-green-100'
      case 'orange': return 'text-orange-600 bg-orange-100'
      case 'purple': return 'text-purple-600 bg-purple-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusColor = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-100 text-green-800'
      case 'blue': return 'bg-blue-100 text-blue-800'
      case 'gray': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Outreach Management</h1>
          <p className="text-gray-600">
            Manage your outreach campaigns and track engagement with prospects from ConstructConnect projects.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {demoStats.map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${getIconColor(stat.color)}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Recent Outreach Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Outreach Activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Contact
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOutreach.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.contact}</div>
                        <div className="text-sm text-gray-500">{item.company}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {item.project}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.statusColor)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.lastContact}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-sm font-medium">i</span>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Demo Data</h3>
              <p className="text-sm text-blue-700 mt-1">
                This outreach data is for demonstration purposes. In a live environment,
                this would show your actual outreach campaigns and contact interactions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}