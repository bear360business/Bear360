// Barrel for all mock fixtures + shared mock helpers.

export * from './plans'
export * from './restaurants'
export * from './tables'
export * from './menu'
export * from './orders'
export * from './stats'
export * from './inventory'
export * from './staff'
export * from './reservations'

/** Standard simulated network latency for mount timers (doc: ~600ms). */
export const MOCK_DELAY_MS = 600

/** Await a simulated network delay: `await mockDelay()` in a mount effect. */
export function mockDelay(ms: number = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
