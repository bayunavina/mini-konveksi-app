"use client"

import * as React from "react"
import { isValid } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatDate } from "@/lib/utils"

function DatePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal",
  id,
  className,
  disabled,
}: {
  value?: string | null
  onChange?: (value: string) => void
  placeholder?: string
  id?: string
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)

  const hasValue = value ? isValid(new Date(value)) : false

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          data-empty={!hasValue}
          data-slot="date-picker-trigger"
          className={cn(
            "w-full justify-start gap-2 text-left font-normal data-[empty=true]:text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4" data-icon="inline-start" />
          {hasValue ? formatDate(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={hasValue ? (value ? new Date(value) : undefined) : undefined}
          onSelect={(date) => {
            if (date) {
              onChange?.(formatDate(date))
            }
            setOpen(false)
          }}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }