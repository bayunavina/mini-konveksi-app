"use client"

import { useState, useEffect } from "react"

interface SKU {
  id: string
  code: string
  name: string
  category: string
  unit: string
  price: number
  isActive: boolean
}

export function useSKUMaster() {
  const [skus, setSkus] = useState<SKU[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/master-skus")
      .then(res => res.json())
      .then(data => {
        setSkus(data)
        setLoading(false)
      })
      .catch(e => {
        console.error("Error fetching SKUs:", e)
        setLoading(false)
      })
  }, [])

  const refreshSkus = () => {
    fetch("/api/master-skus")
      .then(res => res.json())
      .then(data => setSkus(data))
      .catch(e => console.error("Error refreshing SKUs:", e))
  }

  return { skus, loading, refetch: refreshSkus }
}
