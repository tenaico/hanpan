import type { GraphicsKind } from '../../shared/kinds'
import type { GraphicsPageApi } from '../frame/page-api'
import { createIllustAdapter } from './illust'
import { createPhotoAdapter } from './photo'
import type { GraphicsAdapter } from './types'

export type { DocInfo, GraphicsAdapter } from './types'
export { HOST_EXPORT_PREFIX, hostExportName } from './types'

/** The adapter for a tab's app. */
export function createAdapter(kind: GraphicsKind, api: GraphicsPageApi): GraphicsAdapter {
  return kind === 'illust' ? createIllustAdapter(api) : createPhotoAdapter(api)
}
