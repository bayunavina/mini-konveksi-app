import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { RefreshCw } from "lucide-react"

const refreshButtonVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent text-primary transition-all hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30",
        outline:
          "border-border bg-background text-foreground hover:bg-muted/50 dark:bg-input/30",
        ghost:
          "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
      },
      size: {
        default: "size-7",
        sm: "size-6",
        lg: "size-8",
        icon: "size-7",
        "icon-sm": "size-5",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function RefreshButton({
  className,
  variant = "default",
  size = "default",
  loading = false,
  asChild = false,
  ...props
}: React.ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof refreshButtonVariants> & {
    asChild?: boolean
    loading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="refresh-button"
      data-loading={loading}
      className={cn(
        refreshButtonVariants({ variant, size }),
        loading && "animate-spin",
        className
      )}
      {...props}
    >
      <RefreshCw className="h-4 w-4" />
    </Comp>
  )
}

export { RefreshButton, refreshButtonVariants }
