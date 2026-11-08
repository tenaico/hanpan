/**
 * Line icons for the AI Photo and AI Illustration tabs: a brush for photos, a
 * pen nib for illustrations. Drawn in currentColor, so the theme token of the
 * place they sit in colors them.
 */
export function GraphicsIcon({ kind }: { kind: 'photo' | 'illust' }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {kind === 'photo' ? (
        <>
          <path d="M20.6 3.4c.8.8.8 2 0 2.8L14 12.8 11.2 10l6.6-6.6c.8-.8 2-.8 2.8 0z" />
          <path d="M11.2 10c-2.9-.3-5.2 1.6-5.2 4.6 0 1.9-.7 3.6-2.5 5 4.3.9 8.6-.4 10-3.4.6-1.2.7-2.3.5-3.4" />
        </>
      ) : (
        <>
          <path d="M12 3 6.5 12 9 20.5h6l2.5-8.5z" />
          <path d="M12 3v7.5" />
          <circle cx="12" cy="12" r="1.5" />
        </>
      )}
    </svg>
  )
}
