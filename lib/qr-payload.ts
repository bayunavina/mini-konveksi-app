/**
 * Unified QR/Barcode payload format for mini-konveksi-app
 * Supports 4 entity types: MATERIAL_LOT, EMPLOYEE, JOB_ORDER, SKU, TRANSFER
 *
 * Format: JSON string for camera-scan QR, plain text for Code128 barcode
 */

export type QRPayloadType = "MATERIAL_LOT" | "EMPLOYEE" | "JOB_ORDER" | "SKU" | "TRANSFER"

export interface QRPayload {
  type: QRPayloadType
  id: string          // UUID from DB
  code: string        // human-readable code: lotNumber/qrCode/joNumber/skuCode/transferNumber
  name?: string       // display name
  extra?: Record<string, unknown>
}

export interface ParsedQR {
  payload: QRPayload | null
  raw: string
  isLegacy: boolean   // true if parsed via regex fallback, not JSON
  detectedType: QRPayloadType | "UNKNOWN"
}

// --- Generators ---

export function generateMaterialLotQR(data: {
  id: string
  lotNumber: string
  qrCode: string
  skuCode?: string
  skuName?: string
}): string {
  const payload: QRPayload = {
    type: "MATERIAL_LOT",
    id: data.id,
    code: data.lotNumber,
    name: data.skuName || data.skuCode || data.lotNumber,
    extra: { qrCode: data.qrCode, skuCode: data.skuCode },
  }
  return JSON.stringify(payload)
}

export function generateEmployeeQR(data: {
  id: string
  name: string
  pin?: string
  role?: string
}): string {
  const payload: QRPayload = {
    type: "EMPLOYEE",
    id: data.id,
    code: data.pin || data.id.slice(0, 8).toUpperCase(),
    name: data.name,
    extra: { role: data.role },
  }
  return JSON.stringify(payload)
}

export function generateJobOrderQR(data: {
  id: string
  joNumber: string
  productName?: string
}): string {
  const payload: QRPayload = {
    type: "JOB_ORDER",
    id: data.id,
    code: data.joNumber,
    name: data.productName || data.joNumber,
  }
  return JSON.stringify(payload)
}

export function generateSKUQR(skuCode: string): string {
  // SKU barcodes are plain Code128 — no JSON needed for USB scanner speed
  return skuCode.toUpperCase()
}

export function generateTransferQR(data: {
  id: string
  transferNumber: string
}): string {
  const payload: QRPayload = {
    type: "TRANSFER",
    id: data.id,
    code: data.transferNumber,
    name: data.transferNumber,
  }
  return JSON.stringify(payload)
}

// --- Parser ---

// Regex patterns for legacy / plain-text codes
const PATTERNS: Array<{ type: QRPayloadType; regex: RegExp }> = [
  { type: "MATERIAL_LOT", regex: /^MAT-[A-Z0-9]+$/i },
  { type: "MATERIAL_LOT", regex: /^BB-[A-Z0-9-]+$/i },
  { type: "JOB_ORDER", regex: /^JO\d{6}-[A-Z0-9]+$/i },
  { type: "JOB_ORDER", regex: /^JO-[A-Z0-9-]+$/i },
  { type: "TRANSFER", regex: /^TRF[-_]?(?:IN|OUT)?[-_]?\d{6}[-_]?[A-Z0-9]{4}$/i },
  { type: "TRANSFER", regex: /^TRF-[A-Z0-9-]+$/i },
  // SKU is catch-all for Code128 plain text
]

function detectByPattern(raw: string): QRPayloadType | "UNKNOWN" {
  const trimmed = raw.trim()
  for (const { type, regex } of PATTERNS) {
    if (regex.test(trimmed)) return type
  }
  // If it looks like a UUID, it could be employee/jobOrder id
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return "UNKNOWN"
  }
  // Plain SKU codes are usually uppercase with dash
  if (/^[A-Z0-9-]{2,}$/i.test(trimmed) && trimmed.length >= 3) {
    return "SKU"
  }
  return "UNKNOWN"
}

export function parseQRPayload(raw: string): ParsedQR {
  const trimmed = raw.trim()

  // Try JSON first
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed.type === "string" && typeof parsed.code === "string") {
      const validTypes: QRPayloadType[] = ["MATERIAL_LOT", "EMPLOYEE", "JOB_ORDER", "SKU", "TRANSFER"]
      if (validTypes.includes(parsed.type as QRPayloadType)) {
        return {
          payload: parsed as QRPayload,
          raw: trimmed,
          isLegacy: false,
          detectedType: parsed.type as QRPayloadType,
        }
      }
      // Legacy JSON format: { type: "MATERIAL_LOT", lotId: "...", sku: "..." }
      if (parsed.type === "MATERIAL_LOT" && parsed.lotId) {
        return {
          payload: {
            type: "MATERIAL_LOT",
            id: parsed.lotId,
            code: parsed.lotId,
            name: parsed.sku || parsed.lotId,
            extra: { qrCode: parsed.qrCode, skuCode: parsed.sku, quantity: parsed.quantity },
          },
          raw: trimmed,
          isLegacy: true,
          detectedType: "MATERIAL_LOT",
        }
      }
    }
  } catch {
    // Not JSON — fall through to regex
  }

  // Regex fallback for plain text / Code128
  const detectedType = detectByPattern(trimmed)
  if (detectedType !== "UNKNOWN") {
    // For fallback we create a minimal payload; resolver will lookup by code
    return {
      payload: {
        type: detectedType,
        id: trimmed,
        code: trimmed,
        name: trimmed,
      },
      raw: trimmed,
      isLegacy: true,
      detectedType,
    }
  }

  return {
    payload: null,
    raw: trimmed,
    isLegacy: true,
    detectedType: "UNKNOWN",
  }
}

/**
 * Resolve scan result to a searchable value for API lookup.
 * Returns the best field to search by.
 */
export function getSearchValue(parsed: ParsedQR): { field: string; value: string } | null {
  if (parsed.payload) {
    return { field: "code", value: parsed.payload.code }
  }
  if (parsed.raw.length >= 2) {
    return { field: "raw", value: parsed.raw }
  }
  return null
}

// --- Legacy helpers (keep for backward compatibility with qr-code-generator.tsx) ---

export interface MaterialQRData {
  type: "MATERIAL_LOT"
  lotId: string
  sku: string
  quantity: number
  unit: string
  supplier?: string
  dateIn?: string
  poNumber?: string
}

export function generateMaterialQRData(data: MaterialQRData): string {
  return JSON.stringify(data)
}

export function parseMaterialQRData(qrString: string): MaterialQRData | null {
  try {
    const data = JSON.parse(qrString)
    if (data.type === "MATERIAL_LOT") {
      return data as MaterialQRData
    }
    return null
  } catch {
    return null
  }
}
