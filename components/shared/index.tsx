"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between space-y-2">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  unit?: string
  icon?: React.ElementType
  iconColor?: string
  iconBgColor?: string
  change?: string
  trend?: "up" | "down"
  className?: string
}

export function StatCard({
  title,
  value,
  unit,
  icon: Icon,
  iconColor = "text-primary",
  iconBgColor = "bg-primary/10",
  change,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && (
          <div className={cn("p-2 rounded-lg", iconBgColor)}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
          {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
        </div>
        {change && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {trend === "up" ? (
              <ArrowRightIcon className="h-3 w-3 text-green-600" />
            ) : (
              <ArrowLeftIcon className="h-3 w-3 text-red-600" />
            )}
            <span className={trend === "up" ? "text-green-600" : "text-red-600"}>{change}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchable?: boolean
  filterable?: boolean
  pagination?: boolean
  pageSize?: number
  onRowClick?: (row: T) => void
}

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((column) => (
              <th key={column.key} className={cn("px-4 py-3 text-left text-sm font-medium", column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.id}
              className={cn(
                "border-b transition-colors hover:bg-muted/50",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td key={column.key} className={cn("px-4 py-3 text-sm", column.className)}>
                  {column.render ? column.render(row) : (row as Record<string, unknown>)[column.key] as React.ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        {Icon && (
          <div className="p-3 rounded-full bg-muted mb-4">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        {description && <p className="text-sm text-muted-foreground text-center mb-4">{description}</p>}
        {action && (
          action.href ? (
            <Button asChild>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )
        )}
      </CardContent>
    </Card>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  variant?: "default" | "destructive"
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={variant === "destructive" ? "bg-destructive" : undefined}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ActionButtonsProps {
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onPrint?: () => void
  onDownload?: () => void
  onApprove?: () => void
  onReject?: () => void
  size?: "sm" | "default" | "icon"
  showLabels?: boolean
}

export function ActionButtons({
  onView,
  onEdit,
  onDelete,
  onPrint,
  onDownload,
  onApprove,
  onReject,
  size = "icon",
  showLabels = false,
}: ActionButtonsProps) {
  const iconSize = size === "icon" ? "h-4 w-4" : "h-4 w-4"

  return (
    <div className="flex items-center gap-1">
      {onView && (
        <Button variant="ghost" size={size} onClick={onView} title="View">
          <EyeIcon className={iconSize} />
          {showLabels && <span className="ml-2">View</span>}
        </Button>
      )}
      {onApprove && (
        <Button variant="ghost" size={size} onClick={onApprove} className="text-green-600 hover:text-green-700" title="Approve">
          <CheckIcon className={iconSize} />
          {showLabels && <span className="ml-2">Approve</span>}
        </Button>
      )}
      {onReject && (
        <Button variant="ghost" size={size} onClick={onReject} className="text-red-600 hover:text-red-700" title="Reject">
          <XMarkIcon className={iconSize} />
          {showLabels && <span className="ml-2">Reject</span>}
        </Button>
      )}
      {onEdit && (
        <Button variant="ghost" size={size} onClick={onEdit} title="Edit">
          <PencilIcon className={iconSize} />
          {showLabels && <span className="ml-2">Edit</span>}
        </Button>
      )}
      {onPrint && (
        <Button variant="ghost" size={size} onClick={onPrint} title="Print">
          <PrinterIcon className={iconSize} />
          {showLabels && <span className="ml-2">Print</span>}
        </Button>
      )}
      {onDownload && (
        <Button variant="ghost" size={size} onClick={onDownload} title="Download">
          <ArrowDownTrayIcon className={iconSize} />
          {showLabels && <span className="ml-2">Download</span>}
        </Button>
      )}
      {onDelete && (
        <Button variant="ghost" size={size} onClick={onDelete} className="text-red-600 hover:text-red-700" title="Delete">
          <TrashIcon className={iconSize} />
          {showLabels && <span className="ml-2">Delete</span>}
        </Button>
      )}
    </div>
  )
}
