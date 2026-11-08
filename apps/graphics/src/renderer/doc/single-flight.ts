/**
 * One save at a time: a menu save, the close question's save and a save the
 * app's own menu started could otherwise overlap, open two dialogs and take each
 * other's target. A call made while one runs gets that run's outcome.
 */
export function singleFlight<A extends unknown[], T>(
  run: (...args: A) => Promise<T>,
): (...args: A) => Promise<T> {
  let current: Promise<T> | null = null
  return (...args: A) => {
    if (current) return current
    const started = run(...args).finally(() => {
      current = null
    })
    current = started
    return started
  }
}
