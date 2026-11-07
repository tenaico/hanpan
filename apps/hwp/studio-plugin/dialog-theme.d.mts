/** Type surface for studio-plugin/dialog-theme.mjs (plain JS, bundled by Vite). */

export declare const DIALOG_THEME_VERSION: number
export declare const DIALOG_THEME_STYLE_ID: string
export declare const DIALOG_THEME_ATTRIBUTE: string
export declare const DIALOG_THEME_CSS: string
/** Installs the dialog skin once; returns whether it is currently on. */
export declare function installDialogTheme(doc?: Document): boolean
/** Hides the toolbar buttons the scrolling toolbar cuts at its edges; returns how many. */
export declare function markClippedToolbarButtons(doc?: Document): number
/** Keeps markClippedToolbarButtons current on scroll and resize. */
export declare function installToolbarClipGuard(doc?: Document): boolean
