import { describe, expect, it, vi } from 'vitest'
import {
  pathsOpenInTabs,
  trashFilesClosingTabs,
  type OpenTabRef,
} from '../src/main/delete-open-files'

/** 0.17 리뷰 v2 shell #2: deleting a file that is open in a tab */

const canonical = (path: string) => path.replace(/\//g, '\\').toLowerCase()

function setup(open: OpenTabRef[], refuse: string[] = []) {
  let tabs = [...open]
  const closeTab = vi.fn(async (id: string) => {
    if (!refuse.includes(id)) tabs = tabs.filter((tab) => tab.id !== id)
  })
  const trash = vi.fn(async () => undefined)
  return { deps: { tabs: () => tabs, canonical, closeTab, trash }, closeTab, trash }
}

describe('deleting files open in tabs', () => {
  it('names the files that are open, in any spelling of their path', () => {
    const { deps } = setup([{ id: 'home' }, { id: 't1', filePath: 'C:\\Docs\\Plan.docx' }])
    expect(pathsOpenInTabs(['c:/docs/plan.docx', 'C:\\docs\\other.hwp'], deps)).toEqual([
      'c:/docs/plan.docx',
    ])
  })

  it('closes the tab before the file goes to the trash', async () => {
    const { deps, closeTab, trash } = setup([{ id: 't1', filePath: 'C:\\docs\\plan.docx' }])
    const done = await trashFilesClosingTabs(['C:\\docs\\plan.docx', 'C:\\docs\\b.hwp'], deps)
    expect(closeTab).toHaveBeenCalledWith('t1')
    expect(closeTab.mock.invocationCallOrder[0]).toBeLessThan(trash.mock.invocationCallOrder[0]!)
    expect(trash).toHaveBeenCalledTimes(2)
    expect(done).toEqual(['C:\\docs\\plan.docx', 'C:\\docs\\b.hwp'])
  })

  it('leaves a file alone when its tab stays open (save question cancelled)', async () => {
    const { deps, trash } = setup([{ id: 't1', filePath: 'C:\\docs\\plan.docx' }], ['t1'])
    const done = await trashFilesClosingTabs(['C:\\docs\\plan.docx'], deps)
    expect(trash).not.toHaveBeenCalled()
    expect(done).toEqual([])
  })
})
