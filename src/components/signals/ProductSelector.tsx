import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/apiClient'

interface Props {
  value: string
  onChange: (product: string) => void
}

// Module-level cache for products
let productsCache: string[] | null = null
let productsPromise: Promise<string[]> | null = null

const fetchProducts = async (): Promise<string[]> => {
  if (productsCache) {
    return productsCache
  }
  
  if (productsPromise) {
    return productsPromise
  }
  
  productsPromise = (async (): Promise<string[]> => {
    try {
      console.log('Fetching products (single request)')
      const response = await api.signals.getProducts()
      if (response.data && Array.isArray(response.data)) {
        productsCache = response.data
        return productsCache
      }
      return []
    } catch (error) {
      console.error('Failed to load products:', error)
      return []
    } finally {
      productsPromise = null
    }
  })()
  
  return productsPromise
}

export const ProductSelector = ({ value, onChange }: Props) => {
  const [products, setProducts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      
      const loadProducts = async () => {
        try {
          const productList = await fetchProducts()
          setProducts(productList)
          // If current value is not in the list, switch to first available
          if (!productList.includes(value) && productList.length > 0) {
            onChange(productList[0])
          }
        } finally {
          setLoading(false)
        }
      }

      loadProducts()
    }
  }, [])

  // Helper function to format product names nicely
  const formatProductName = (product: string) => {
    // Special cases for known products
    const specialCases: Record<string, string> = {
      'xr_vr': 'XR/VR',
      'metaverse': 'XR/VR',  // Display old metaverse as XR/VR
      'b2b': 'B2B'
    }

    // Check if product has a special case
    if (specialCases[product.toLowerCase()]) {
      return specialCases[product.toLowerCase()]
    }

    // Default formatting: split by - or _, capitalize each word
    return product
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (loading) {
    return (
      <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm text-gray-500">
        Loading...
      </div>
    )
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm text-gray-700"
    >
      {products.map((product) => (
        <option key={product} value={product}>
          {formatProductName(product)}
        </option>
      ))}
    </select>
  )
}