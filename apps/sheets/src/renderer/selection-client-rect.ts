/**
 * 선택 범위의 화면(client) 사각형. shape-draw.ts의 rectToAnchor와 같은 변환:
 * getCellRect는 장면 좌표라 주 뷰포트의 스크롤을 빼고 확대 비율을 곱한 뒤 격자
 * 캔버스 위치를 더한다. 틀 고정 영역 안의 범위는 조금 어긋날 수 있다(AI 수정
 * 요청 단추 위치처럼 대략이면 되는 곳에만 쓴다).
 */
import { IRenderManagerService, SHEET_VIEWPORT_KEY } from '@univerjs/engine-render'

import type { UniverRuntime } from './univer-state'

export interface ClientRect {
  left: number
  top: number
  right: number
  bottom: number
}

export function selectionClientRect(
  runtime: UniverRuntime,
  range: { startRow: number; endRow: number; startColumn: number; endColumn: number },
): ClientRect | null {
  try {
    const workbook = runtime.univerAPI.getActiveWorkbook()
    const worksheet = workbook?.getActiveSheet()
    const hostEl = document.getElementById('univer-container')
    if (!workbook || !worksheet || !hostEl) return null
    let surface: DOMRect | null = null
    for (const canvas of hostEl.querySelectorAll('canvas')) {
      const r = canvas.getBoundingClientRect()
      if (!surface || r.width * r.height > surface.width * surface.height) surface = r
    }
    if (!surface) return null
    const viewMain = runtime.univer
      .__getInjector()
      .get(IRenderManagerService)
      .getRenderById(workbook.getId())
      ?.scene?.getViewport(SHEET_VIEWPORT_KEY.VIEW_MAIN)
    const scrollX = viewMain?.viewportScrollX ?? 0
    const scrollY = viewMain?.viewportScrollY ?? 0
    const zoom = worksheet.getZoom() || 1
    const first = worksheet.getRange(range.startRow, range.startColumn, 1, 1).getCellRect()
    const last = worksheet.getRange(range.endRow, range.endColumn, 1, 1).getCellRect()
    const x = (sceneX: number) => surface.x + (sceneX - scrollX) * zoom
    const y = (sceneY: number) => surface.y + (sceneY - scrollY) * zoom
    const left = Math.min(x(first.x), x(last.x))
    const right = Math.max(x(first.right), x(last.right))
    const top = Math.min(y(first.y), y(last.y))
    const bottom = Math.max(y(first.bottom), y(last.bottom))
    if (![left, right, top, bottom].every(Number.isFinite)) return null
    return { left, top, right, bottom }
  } catch {
    return null
  }
}
