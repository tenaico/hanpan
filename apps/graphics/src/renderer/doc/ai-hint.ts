/**
 * The one-time note after the first save of a new drawing as .vectorcraft:
 * where the .ai for Illustrator is (design 5.4.1). Remembered in localStorage;
 * once seen it never comes back.
 */
import type { GraphicsKind } from '../../shared/kinds'

export const AI_HINT_KEY = 'hanpan.illust.aiHintSeen'

type Store = Pick<Storage, 'getItem' | 'setItem'>

/** True when the note is due now; marks it seen. A tab that cannot remember stays quiet. */
export function takeAiHint(
  kind: GraphicsKind,
  save: { hadFile: boolean; format: string },
  store?: Store,
): boolean {
  if (kind !== 'illust' || save.hadFile || save.format !== 'vectorcraft') return false
  try {
    const storage = store ?? window.localStorage
    if (storage.getItem(AI_HINT_KEY)) return false
    storage.setItem(AI_HINT_KEY, '1')
    return true
  } catch {
    return false
  }
}
