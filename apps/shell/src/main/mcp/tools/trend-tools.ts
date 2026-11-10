import { TREND_SITE, type TrendForecast } from '../../../shared/trend-forecast'
import type { McpToolDefinition } from '../mcp-server'

/**
 * read_trend_forecast (0.19.1): the forecast the Home trend card already
 * stored on this PC (userData/trend-forecast.json), for an AI writing a
 * report or plan that should reflect today's trends. It reads that copy only:
 * no request leaves the PC for it, so the privacy policy's trend section
 * stays as it is.
 */
export interface TrendToolsDeps {
  /** the stored forecast, or null when the card has none (offline, removed, test build) */
  read: () => TrendForecast | null
}

export function createTrendTools(deps: TrendToolsDeps): McpToolDefinition[] {
  return [
    {
      name: 'read_trend_forecast',
      description:
        "Read today's Trend Radar forecast that Hanpan's Home trend card has on this PC: ten fields " +
        '(AI, open-source AI, local AI, AI safety, stocks, economy, semiconductors, real estate, ' +
        'exchange rates, crypto), each with a weather word (signal 2 = clear/overheated … -2 = storm/' +
        "slump), a one-line headline and a link, plus the day's one-line summary. Quote only these " +
        'numbers and words; it is not investment advice. Use it when a document should reflect ' +
        "today's trends.",
      handler: () => {
        const forecast = deps.read()
        if (!forecast) {
          return {
            available: false,
            reason:
              'No forecast on this PC yet: the Home trend card fetches it once Hanpan is online, and not at all when the card is removed.',
          }
        }
        return {
          available: true,
          date: forecast.date,
          asOf: forecast.asOf,
          line: forecast.line,
          source: TREND_SITE,
          fields: forecast.fields.map((f) => ({
            field: f.title,
            signal: f.s,
            weather: f.s === null ? null : f.label,
            headline: f.s === null ? null : f.head,
            link: `${TREND_SITE}${f.path}`,
          })),
        }
      },
    },
  ]
}
