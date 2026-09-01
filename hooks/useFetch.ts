import { useState, useEffect, useRef, useCallback } from "react"

interface UseFetchOptions<T> {
  initialData?: T
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  pollingInterval?: number
}

interface UseFetchResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => void
  setData: React.Dispatch<React.SetStateAction<T | null>>
}

export function useFetch<T>(
  url: string | null,
  options?: UseFetchOptions<T>
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(options?.initialData || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mountedRef = useRef(true)
  const fetchingRef = useRef(false)

  const fetchData = useCallback(async () => {
    if (!url || !mountedRef.current || fetchingRef.current) return
    
    fetchingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      
      if (mountedRef.current) {
        setData(result)
        options?.onSuccess?.(result)
      }
    } catch (err) {
      if (mountedRef.current) {
        const error = err instanceof Error ? err : new Error("Unknown error")
        setError(error)
        options?.onError?.(error)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
        fetchingRef.current = false
      }
    }
  }, [url, options?.onSuccess, options?.onError])

  useEffect(() => {
    mountedRef.current = true
    fetchingRef.current = false
    
    if (!url) {
      setData(options?.initialData || null)
      return
    }
    
    fetchData()

    return () => {
      mountedRef.current = false
    }
  }, [fetchData, url])

  useEffect(() => {
    if (!options?.pollingInterval || !url) return
    
    const interval = setInterval(() => {
      if (!fetchingRef.current && mountedRef.current) {
        fetchData()
      }
    }, options.pollingInterval)
    return () => clearInterval(interval)
  }, [options?.pollingInterval, url, fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    setData,
  }
}

export function usePost<T, R = unknown>(
  url: string,
  options?: {
    onSuccess?: (data: R) => void
    onError?: (error: Error) => void
  }
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const post = async (body: T): Promise<R | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      options?.onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
      options?.onError?.(error)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { post, loading, error }
}

export function usePut<T, R = unknown>(
  url: string,
  options?: {
    onSuccess?: (data: R) => void
    onError?: (error: Error) => void
  }
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const put = async (id: string, body: T): Promise<R | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${url}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      options?.onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
      options?.onError?.(error)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { put, loading, error }
}

export function useDelete(
  url: string,
  options?: {
    onSuccess?: () => void
    onError?: (error: Error) => void
  }
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const remove = async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${url}/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      options?.onSuccess?.()
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
      options?.onError?.(error)
      return false
    } finally {
      setLoading(false)
    }
  }

  return { remove, loading, error }
}
