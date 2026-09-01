"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"

interface SKU {
  id: string
  code: string
  name: string
  category: string
  unit: string
  price: number
  isActive: boolean
}

const SKU_QUERY_KEY = "master-skus"

export function useSKUMaster() {
  const queryClient = useQueryClient()

  const { data = [], isLoading, refetch } = useQuery<SKU[]>({
    queryKey: [SKU_QUERY_KEY],
    queryFn: async () => {
      const res = await fetch("/api/master-skus")
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      return res.json()
    },
  })

  return {
    skus: data,
    loading: isLoading,
    refetch: () => {
      refetch()
    },
    refreshSkus: () => {
      queryClient.invalidateQueries({ queryKey: [SKU_QUERY_KEY] })
    },
  }
}
