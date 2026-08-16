// Kitchen display domain: the four stages a ticket moves through, its target
// prep time, and whether it is running late. "Delayed" is derived from the
// clock, never stored — a ticket becomes delayed the second it passes target.

import type { Order, OrderItem } from './types'

export type KitchenStage = 'new' | 'in-kitchen' | 'delayed' | 'completed'

export interface StageMeta {
  id: KitchenStage
  label: string
  /** Solid header / pill fill. */
  bar: string
  /** Text on that fill. */
  on: string
  /** Soft tint for the filter pill when inactive. */
  tint: string
  text: string
}

export const KITCHEN_STAGES: StageMeta[] = [
  {
    id: 'new',
    label: 'New Order',
    bar: 'bg-ink-800',
    on: 'text-white',
    tint: 'bg-surface-muted',
    text: 'text-foreground',
  },
  {
    id: 'in-kitchen',
    label: 'In Kitchen',
    bar: 'bg-warning',
    on: 'text-white',
    tint: 'bg-warning-tint',
    text: 'text-warning',
  },
  {
    id: 'delayed',
    label: 'Delayed',
    bar: 'bg-danger',
    on: 'text-white',
    tint: 'bg-danger-tint',
    text: 'text-danger',
  },
  {
    id: 'completed',
    label: 'Completed',
    bar: 'bg-success',
    on: 'text-white',
    tint: 'bg-success-tint',
    text: 'text-success',
  },
]

export function stageMeta(stage: KitchenStage): StageMeta {
  return KITCHEN_STAGES.find((s) => s.id === stage) ?? KITCHEN_STAGES[0]
}

/**
 * How long the kitchen is given for a ticket: a fixed set-up cost plus time
 * per dish, capped so a big party order doesn't get an absurd allowance.
 * 5 min + 2.5 min/dish matches a mid-size Indian kitchen; a 4-dish table gets
 * 15 minutes before the board calls it delayed.
 */
export function prepTargetSecFor(items: OrderItem[]): number {
  const units = items.reduce((sum, i) => sum + i.qty, 0)
  return Math.min(30 * 60, Math.round((5 + units * 2.5) * 60))
}

export function prepTargetSec(order: Order): number {
  return prepTargetSecFor(order.items)
}

export interface TicketTiming {
  stage: KitchenStage
  /** Seconds since the order was placed (frozen once served). */
  elapsedSec: number
  targetSec: number
  /** 0–1, clamped — drives the progress bar. */
  progress: number
  /** Seconds past target; 0 when on time. */
  overSec: number
  /**
   * Completed tickets only: seconds saved (positive) or lost (negative)
   * against the target.
   */
  varianceSec: number | null
}

export function ticketTiming(order: Order, nowMs: number): TicketTiming {
  const targetSec = prepTargetSec(order)
  const placedMs = new Date(order.placedAt).getTime()
  const done = order.status === 'ready' || order.status === 'completed'
  const endMs = done && order.servedAt ? new Date(order.servedAt).getTime() : nowMs
  const elapsedSec = Math.max(0, Math.floor((endMs - placedMs) / 1000))
  const overSec = Math.max(0, elapsedSec - targetSec)

  const stage: KitchenStage = done
    ? 'completed'
    : overSec > 0
      ? 'delayed'
      : order.status === 'preparing'
        ? 'in-kitchen'
        : 'new'

  return {
    stage,
    elapsedSec,
    targetSec,
    progress: targetSec === 0 ? 1 : Math.min(1, elapsedSec / targetSec),
    overSec,
    varianceSec: done ? targetSec - elapsedSec : null,
  }
}

/** "05:09" — the KDS never shows hours; a ticket that old is a problem, not a format. */
export function clock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Whole minutes, rounded — for "2 mins early" style copy. */
export function mins(totalSec: number): number {
  return Math.max(0, Math.round(Math.abs(totalSec) / 60))
}

/**
 * Minutes rounded *up*, floor 1 — for lateness. A ticket 20 seconds past
 * target is late by "1 min", never by "0 mins".
 */
export function minsLate(totalSec: number): number {
  return Math.max(1, Math.ceil(Math.abs(totalSec) / 60))
}

/** Human copy for a finished ticket's variance against target. */
export function varianceLabel(varianceSec: number): { text: string; good: boolean } {
  if (Math.abs(varianceSec) < 60) return { text: 'on time', good: true }
  const m = mins(varianceSec)
  return varianceSec > 0
    ? { text: `${m} min${m === 1 ? '' : 's'} early`, good: true }
    : { text: `${m} min${m === 1 ? '' : 's'} late`, good: false }
}
