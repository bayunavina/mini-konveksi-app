const ACTIVITY_TIME_ZONE = "Asia/Jakarta"

function formatActivityValue(dateValue: string, options: Intl.DateTimeFormatOptions) {
  if (!dateValue) return "-"

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return "-"

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: ACTIVITY_TIME_ZONE,
    ...options,
  }).format(date)
}

export function formatActivityTimestamp(dateValue: string) {
  return formatActivityValue(dateValue, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).replace(/(\d)\.(\d)/g, "$1:$2")
}