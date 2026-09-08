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

function sanitizeValue(value: string): string {
  return value.replace(/:/g, " ").replace(/-/g, " ")
}

export function generateMaterialLotQR(data: {
  id: string
  lotNumber: string
  skuCode?: string
  skuName?: string
  quantity?: number
  unit?: string
  supplier?: string
  dateIn?: string
}): string {
  const lotId = data.lotNumber
  const sku = data.skuCode || data.skuName || ""
  const quantity = data.quantity || 0
  const unit = data.unit || "Pcs"
  const supplier = data.supplier || ""
  const dateIn = data.dateIn || new Date().toISOString().split("T")[0]

  const sanitizedSupplier = sanitizeValue(supplier)

  return `MATERIAL_LOT:lotId-${lotId}:sku-${sku}:${quantity}-${unit}:Supplier-${sanitizedSupplier}:DateIn-${dateIn}`
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

export function parseMaterialLotString(raw: string): { type: QRPayloadType; lotId: string; sku: string; quantity: number; unit: string; supplier: string; dateIn: string } | null {
  const trimmed = raw.trim()
  // Format: MATERIAL_LOT:lotId-<id>:sku-<sku>:<quantity>-<unit>:Supplier-<supplier>:DateIn-<date>
  if (!/^MATERIAL_LOT:/i.test(trimmed)) return null

  const parts = trimmed.split(":")
  if (parts.length !== 6) return null

  // Part 0: MATERIAL_LOT (type prefix, already checked)
  // Part 1: lotId-<id>
  const lotIdMatch = parts[1].match(/^lotId-(.+)$/i)
  if (!lotIdMatch) return null
  const lotId = lotIdMatch[1]

  // Part 2: sku-<sku>
  const skuMatch = parts[2].match(/^sku-(.+)$/i)
  if (!skuMatch) return null
  const sku = skuMatch[1]

  // Part 3: <quantity>-<unit>
  const qtyUnitMatch = parts[3].match(/^(\d+)-(.+)$/)
  if (!qtyUnitMatch) return null
  const quantity = parseInt(qtyUnitMatch[1], 10)
  const unit = qtyUnitMatch[2]

  // Part 4: Supplier-<supplier>
  const supplierMatch = parts[4].match(/^Supplier-(.+)$/i)
  if (!supplierMatch) return null
  const supplier = supplierMatch[1].trim()

  // Part 5: DateIn-<date>
  const dateInMatch = parts[5].match(/^DateIn-(.+)$/i)
  if (!dateInMatch) return null
  const dateIn = dateInMatch[1]

  return {
    type: "MATERIAL_LOT",
    lotId,
    sku,
    quantity,
    unit,
    supplier,
    dateIn,
  }
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
    // Not JSON — fall through to new string format or regex
  }

  // Try new string format: MATERIAL_LOT:lotId-<id>:sku-<sku>:<qty>-<unit>:Supplier-<supplier>:DateIn-<date>
  const materialLotParsed = parseMaterialLotString(trimmed)
  if (materialLotParsed) {
    return {
      payload: {
        type: materialLotParsed.type,
        id: materialLotParsed.lotId,
        code: materialLotParsed.lotId,
        name: `${materialLotParsed.sku} - ${materialLotParsed.quantity} ${materialLotParsed.unit}`,
        extra: {
          quantity: materialLotParsed.quantity,
          unit: materialLotParsed.unit,
          supplier: materialLotParsed.supplier,
          dateIn: materialLotParsed.dateIn,
        },
      },
      raw: trimmed,
      isLegacy: false,
      detectedType: "MATERIAL_LOT",
    }
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
