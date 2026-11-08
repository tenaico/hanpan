/**
 * Printing a PDF view to a chosen printer (P4): the Excel print dialog's
 * printer, copies and collation. The renderer has already put the rasterized
 * pages into its print-only root; webContents.print sends that page to the
 * printer without the system dialog, the way window.print() does with it.
 */
import type { WebContentsPrintOptions } from 'electron'

import type { PdfPrintToDeviceRequest } from '../shared/ipc'

const MAX_COPIES = 999
const MAX_DEVICE_NAME = 512

/// The renderer's request, or null when it is not one ('' = default printer).
export function parsePrintToDevice(input: unknown): PdfPrintToDeviceRequest | null {
  if (typeof input !== 'object' || input === null) return null
  const { deviceName, copies, collate } = input as Record<string, unknown>
  if (typeof deviceName !== 'string' || deviceName.length > MAX_DEVICE_NAME) return null
  if (typeof copies !== 'number' || !Number.isInteger(copies)) return null
  if (copies < 1 || copies > MAX_COPIES) return null
  if (typeof collate !== 'boolean') return null
  return { deviceName, copies, collate }
}

export function printOptionsForDevice(request: PdfPrintToDeviceRequest): WebContentsPrintOptions {
  return {
    silent: true,
    printBackground: true,
    // no name: Chromium prints to the system's default printer
    ...(request.deviceName === '' ? {} : { deviceName: request.deviceName }),
    copies: request.copies,
    collate: request.collate,
  }
}
