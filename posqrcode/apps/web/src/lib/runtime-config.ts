/** App always talks to Nest API — mock/local fixtures are disabled. */

export function useMockData(): boolean {
  return false
}

export function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001/api/v1'
}

export function wsBaseUrl(): string {
  return (import.meta.env.VITE_WS_URL as string | undefined) ?? 'http://localhost:3001/realtime'
}
