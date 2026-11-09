import { describe, expect, it } from 'vitest'
import {
  APP_KEYS,
  appSlots,
  markAppsSeen,
  recordAppLaunch,
  RECENT_APPS_MAX,
  setPinned,
  slotGrid,
  unseenApps,
  withRecentApp,
  type AppKey,
} from '../src/shared/home-apps'
import { defaultHomeBoard, type HomeBoard } from '../src/shared/home-board'

const ALL = new Set<string>(APP_KEYS)

function board(): HomeBoard {
  return defaultHomeBoard({ korean: true, koreanDocs: true, trend: false })
}

describe('slotGrid', () => {
  it.each([
    [{ w: 5, h: 2 }, 8],
    [{ w: 5, h: 3 }, 12],
    [{ w: 7, h: 2 }, 12],
    [{ w: 7, h: 3 }, 18],
  ])('a %j card has %i app slots', (size, n) => {
    const s = slotGrid(size)
    expect(s.cols * s.rows).toBe(n)
  })

  it('gives one column less than the card width and as many rows as its height', () => {
    expect(slotGrid({ w: 7, h: 3 })).toEqual({ cols: 6, rows: 3 })
  })
})

describe('appSlots', () => {
  it('puts All apps right after the last pin', () => {
    expect(appSlots(['xmind', 'docx', 'pdf'], ALL, { w: 5, h: 3 })).toEqual({
      apps: ['xmind', 'docx', 'pdf'],
      more: 0,
      empty: 8,
    })
  })

  it('makes the last slot All apps with +N when pins overflow', () => {
    const pins = APP_KEYS.slice(0, 14)
    expect(appSlots(pins, ALL, { w: 5, h: 3 })).toEqual({
      apps: pins.slice(0, 11),
      more: 3,
      empty: 0,
    })
  })

  it('makes the last slot All apps when the pins fill every slot', () => {
    const pins = APP_KEYS.slice(0, 12)
    expect(appSlots(pins, ALL, { w: 5, h: 3 })).toEqual({
      apps: pins.slice(0, 11),
      more: 1,
      empty: 0,
    })
  })

  it('skips pins that are not available and pulls the next pin up, keeping the pins', () => {
    const pinned = ['xmind', 'hwp', 'pptx', 'templates', 'docx']
    const before = [...pinned]
    const available = new Set<string>(APP_KEYS.filter((k) => k !== 'hwp' && k !== 'templates'))
    expect(appSlots(pinned, available, { w: 5, h: 2 })).toEqual({
      apps: ['xmind', 'pptx', 'docx'],
      more: 0,
      empty: 4,
    })
    expect(pinned).toEqual(before)
  })

  it('ignores keys that are not apps', () => {
    expect(appSlots(['xmind', 'nope'], ALL, { w: 5, h: 2 }).apps).toEqual(['xmind'])
  })
})

describe('withRecentApp', () => {
  const R: AppKey[] = ['docx', 'xlsx', 'pdf', 'md', 'html', 'xmind', 'pptx', 'photo']

  it('moves a recent app to the front', () => {
    expect(withRecentApp(R, 'pdf')).toEqual([
      'pdf',
      'docx',
      'xlsx',
      'md',
      'html',
      'xmind',
      'pptx',
      'photo',
    ])
  })

  it('puts a new app in front and keeps eight', () => {
    expect(withRecentApp(R, 'open')).toEqual([
      'open',
      'docx',
      'xlsx',
      'pdf',
      'md',
      'html',
      'xmind',
      'pptx',
    ])
    expect(RECENT_APPS_MAX).toBe(8)
  })
})

describe('unseenApps and markAppsSeen', () => {
  it('lists the available apps not seen yet', () => {
    expect(unseenApps(['xmind'], new Set(['xmind', 'design']))).toEqual(['design'])
  })

  it('lists them in APP_KEYS order', () => {
    expect(unseenApps([], new Set(['open', 'xmind', 'pdf']))).toEqual(['xmind', 'pdf', 'open'])
  })

  it('has nothing new after the apps are marked seen', () => {
    const available = new Set(['xmind', 'design'])
    const b = { ...board(), seenApps: ['xmind'] }
    const next = markAppsSeen(b, available)
    expect(unseenApps(next.seenApps, available)).toEqual([])
    expect(next.seenApps).toEqual(['xmind', 'design'])
    expect(b.seenApps).toEqual(['xmind'])
  })

  it('returns the same board when nothing is new', () => {
    const b = board()
    expect(markAppsSeen(b, ALL)).toBe(b)
  })
})

describe('recordAppLaunch', () => {
  it('puts the app at the front of recentApps', () => {
    const b = { ...board(), recentApps: ['docx', 'xlsx'] }
    expect(recordAppLaunch(b, 'xlsx').recentApps).toEqual(['xlsx', 'docx'])
    expect(b.recentApps).toEqual(['docx', 'xlsx'])
  })
})

describe('setPinned', () => {
  it('adds a pin at the end, once', () => {
    const b = { ...board(), pinned: ['xmind', 'docx'] }
    const once = setPinned(b, 'md', true)
    expect(once.pinned).toEqual(['xmind', 'docx', 'md'])
    expect(setPinned(once, 'md', true).pinned).toEqual(['xmind', 'docx', 'md'])
    expect(b.pinned).toEqual(['xmind', 'docx'])
  })

  it('removes a pin', () => {
    const b = { ...board(), pinned: ['xmind', 'md', 'docx'] }
    expect(setPinned(b, 'md', false).pinned).toEqual(['xmind', 'docx'])
  })
})
