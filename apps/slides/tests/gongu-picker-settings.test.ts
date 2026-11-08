// 공유마당 그림: 키가 없으면 대화상자를 열자마자 안내와 "연동 설정 열기" 단추가 나온다.
// 슬라이드 쪽은 그 단추를 설정 → 연동으로 잇는다(0.17 점검 v2 slides-mindmap #4).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const read = (rel: string) => readFileSync(join(here, '..', rel), 'utf8')

describe('Gongu picker → Settings → Integrations', () => {
  it('the insert tab passes onOpenSettings to the picker', () => {
    expect(read('src/renderer/components/RibbonInsertTab.tsx')).toMatch(
      /onOpenSettings=\{\(\) => void window\.slidesApi\.openIntegrationSettings\(\)\.catch\(\(\) => \{\}\)\}/,
    )
  })
  it('the preload asks the shell for the integrations section', () => {
    expect(read('src/preload/index.ts')).toMatch(
      /openIntegrationSettings: \(\) => ipcRenderer\.invoke\('ai:open-model-settings', 'integrations'\)/,
    )
  })
})
