// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

/**
 * 0.17 리뷰 #8·#20: 디자인 보드 창은 1360×880 고정이라 1366×768 노트북에서 아래(쪽 추가,
 * AI 입력란)가 화면 밖으로 나갔다. 창은 화면 작업 영역 안에 들어가게 열린다.
 * 창 제목은 페이지의 영문 <title>("Hanpan Design")로 바뀌지 않고 "디자인 - 한판"으로 남는다.
 */

const made: { options: Record<string, unknown>; on: Map<string, (...a: unknown[]) => void> }[] = []
let workArea = { x: 0, y: 0, width: 1366, height: 728 }

vi.mock('electron', () => ({
  BrowserWindow: class {
    webContents = { id: 7, setWindowOpenHandler: vi.fn() }
    private handlers = new Map<string, (...a: unknown[]) => void>()
    constructor(options: Record<string, unknown>) {
      made.push({ options, on: this.handlers })
    }
    isDestroyed = () => true
    removeMenu() {}
    once() {}
    on(name: string, fn: (...a: unknown[]) => void) {
      this.handlers.set(name, fn)
    }
    loadFile() {}
    loadURL() {}
  },
  screen: {
    getPrimaryDisplay: () => ({ workArea }),
    getDisplayMatching: () => ({ workArea }),
  },
  clipboard: {},
  dialog: {},
  shell: {},
  ipcMain: { handle: () => undefined },
  nativeImage: {},
}))
vi.mock('@genoffice/ai-search', () => ({}))
vi.mock('@genoffice/electron-utils/fetch-image-bytes', () => ({}))

import {
  configureDesignWindow,
  designWindowBounds,
  openDesignWindow,
} from '../src/main/hanpan/design-window'

configureDesignWindow({
  parentWindow: () => null,
  lang: () => 'ko',
  theme: () => 'light',
  title: () => '디자인 - 한판',
  gonguKey: () => '',
})

describe('design window size', () => {
  it('fits a 1366×768 laptop work area', () => {
    const b = designWindowBounds({ x: 0, y: 0, width: 1366, height: 728 })
    expect(b.height).toBeLessThanOrEqual(728)
    expect(b.width).toBeLessThanOrEqual(1366)
    expect(b.y).toBeGreaterThanOrEqual(0)
    expect(b.y + b.height).toBeLessThanOrEqual(728)
    expect(b.minHeight).toBeLessThanOrEqual(b.height)
    expect(b.minWidth).toBeLessThanOrEqual(b.width)
  })

  it('keeps its usual size on a large screen, centered in the work area', () => {
    const b = designWindowBounds({ x: 1920, y: 0, width: 1920, height: 1040 })
    expect(b).toMatchObject({ width: 1360, height: 880 })
    expect(b.x).toBe(1920 + (1920 - 1360) / 2)
    expect(b.y).toBe((1040 - 880) / 2)
  })

  it('opens inside the work area of the screen it is on, titled in the UI language', () => {
    workArea = { x: 0, y: 0, width: 1366, height: 728 }
    openDesignWindow()
    const { options, on } = made.at(-1)!
    expect(options.height as number).toBeLessThanOrEqual(728)
    expect(options.title).toBe('디자인 - 한판')
    const event = { preventDefault: vi.fn() }
    on.get('page-title-updated')?.(event, 'Hanpan Design')
    expect(event.preventDefault).toHaveBeenCalled()
  })
})
