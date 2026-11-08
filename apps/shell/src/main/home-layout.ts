import { readAppSettings, writeAppSetting } from './app-settings'
import {
  HOME_LAYOUT_SETTING_KEY,
  normalizeHomeLayout,
  type HomeLayout,
} from '../shared/home-layout'

/** Home's layout as stored; a missing or damaged value gives the defaults */
export function readHomeLayout(path: string): HomeLayout {
  return normalizeHomeLayout(readAppSettings(path)[HOME_LAYOUT_SETTING_KEY])
}

/** Store what the renderer sent, cleaned up first; returns what was stored */
export function writeHomeLayout(path: string, raw: unknown): HomeLayout {
  const layout = normalizeHomeLayout(raw)
  writeAppSetting(path, HOME_LAYOUT_SETTING_KEY, layout)
  return layout
}
