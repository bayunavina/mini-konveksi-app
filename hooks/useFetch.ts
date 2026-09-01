import { useEffect } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"

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

async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}

function queryKey(url: string, pollingInterval?: number) {
  return ["use-fetch", "GET", url, pollingInterval ?? "none"]
}

export function useFetch<T>(
  url: string | null,
  options?: UseFetchOptions<T>
): UseFetchResult<T> {
  const queryClient = useQueryClient()

  const {
    data,
    isFetching,
    isPending,
    error,
    refetch,
  } = useQuery<T>({
    queryKey: queryKey(url ?? "", options?.pollingInterval),
    queryFn: () => fetcher<T>(url as string),
    enabled: !!url,
    placeholderData: options?.initialData,
    refetchInterval: options?.pollingInterval,
  } as never)

  useEffect(() => {
    if (error && typeof options?.onError === "function") {
      options.onError(error instanceof Error ? error : new Error(String(error)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  useEffect(() => {
    if (data && typeof options?.onSuccess === "function") {
      options.onSuccess(data as T)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const setData: UseFetchResult<T>["setData"] = (updater) => {
    if (!url) return
    queryClient.setQueryData<T | null>(queryKey(url, options?.pollingInterval), (prev) =>
      typeof updater === "function"
        ? (updater as (old: T | null) => T | null)(prev ?? null)
        : updater
    )
  }

  return {
    data: (data as T | null) ?? null,
    loading: isFetching || isPending,
    error:
      error instanceof Error
        ? error
        : error
          ? new Error(String(error))
          : null,
    refetch: () => {
      refetch()
    },
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
  const mutation = useMutation({
    mutationFn: async (body: T): Promise<R> => {
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
      return response.json()
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })

  return {
    post: mutation.mutateAsync,
    loading: mutation.isPending,
    error:
      mutation.error instanceof Error
        ? mutation.error
        : mutation.error
          ? new Error(String(mutation.error))
          : null,
  }
}

export function usePut<T, R = unknown>(
  url: string,
  options?: {
    onSuccess?: (data: R) => void
    onError?: (error: Error) => void
  }
) {
  const mutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: T }): Promise<R> => {
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
      return response.json()
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })

  return {
    put: (id: string, body: T) => mutation.mutateAsync({ id, body }),
    loading: mutation.isPending,
    error:
      mutation.error instanceof Error
        ? mutation.error
        : mutation.error
          ? new Error(String(mutation.error))
          : null,
  }
}

export function useDelete(
  url: string,
  options?: {
    onSuccess?: () => void
    onError?: (error: Error) => void
  }
) {
  const mutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`${url}/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
    },
    onSuccess: options?.onSuccess,
    onError: (err) => {
      const error = err instanceof Error ? err : new Error(String(err))
      options?.onError?.(error)
    },
  })

  return {
    remove: mutation.mutateAsync,
    loading: mutation.isPending,
    error:
      mutation.error instanceof Error
        ? mutation.error
        : mutation.error
          ? new Error(String(mutation.error))
          : null,
  }
}
