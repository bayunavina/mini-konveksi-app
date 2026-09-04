import { Spinner } from "@/components/ui/spinner"

export function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
      role="status"
      aria-label="Loading"
    >
      <Spinner className="size-8 text-primary" />
    </div>
  )
}
