"use client";

import { ExclamationTriangleIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import type { CameraBlockInfo } from "@/lib/camera-utils";

interface CameraBlockAlertProps {
  block: CameraBlockInfo;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Panel pesan error kamera yang jelas + langkah perbaikan.
 * Dipakai oleh CameraScanner (zxing) dan halaman html5-qrcode.
 */
export function CameraBlockAlert({ block, onRetry, retryLabel = "Coba Lagi" }: CameraBlockAlertProps) {
  const isInsecure = block.code === "insecure-context" || block.code === "unsupported-browser";

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center rounded-lg p-4 text-center ${
        isInsecure ? "bg-amber-950/60 border border-amber-700/60" : "bg-gray-800 border border-gray-700"
      }`}
    >
      {isInsecure ? (
        <LockClosedIcon className="h-10 w-10 text-amber-400 mb-2" />
      ) : (
        <ExclamationTriangleIcon className="h-10 w-10 text-red-400 mb-2" />
      )}
      <p className={`text-sm font-semibold ${isInsecure ? "text-amber-200" : "text-red-400"}`}>
        {block.title}
      </p>
      {block.currentUrl && (
        <p className="mt-1 max-w-full break-all font-mono text-[11px] text-gray-400">{block.currentUrl}</p>
      )}
      {block.message && <p className="mt-2 text-xs leading-relaxed text-gray-300">{block.message}</p>}
      {block.howToFix.length > 0 && (
        <ol className="mt-3 space-y-1.5 text-left text-[11px] leading-relaxed text-gray-400">
          {block.howToFix.map((step, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="shrink-0 font-mono text-gray-500">{i + 1}.</span>
              <span className="break-words">{step}</span>
            </li>
          ))}
        </ol>
      )}
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="mt-3 border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white"
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
