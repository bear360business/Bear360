// Table reservations for tonight's book (admin Tables → Reservations).

import type { Reservation } from '@/lib/types'

/** Demo “today” — Friday 7 Aug 2026. */
export const RESERVATION_TODAY = '2026-08-07'

export const reservations: Reservation[] = [
  {
    id: 'res-01',
    guestName: 'Neha Kapoor',
    phone: '+91 98111 22001',
    partySize: 4,
    date: RESERVATION_TODAY,
    time: '19:30',
    durationMinutes: 90,
    status: 'confirmed',
    tableId: 't-09',
    occasion: 'Anniversary',
    note: 'Window seat if possible',
    createdAt: '2026-08-05T10:20:00',
  },
  {
    id: 'res-02',
    guestName: 'Vikram Joshi',
    phone: '+91 98222 33002',
    partySize: 2,
    date: RESERVATION_TODAY,
    time: '20:00',
    durationMinutes: 75,
    status: 'confirmed',
    createdAt: '2026-08-06T14:05:00',
  },
  {
    id: 'res-03',
    guestName: 'Meera Shah',
    phone: '+91 98333 44003',
    partySize: 2,
    date: RESERVATION_TODAY,
    time: '18:45',
    durationMinutes: 60,
    status: 'confirmed',
    tableId: 't-07',
    createdAt: '2026-08-07T09:10:00',
  },
  {
    id: 'res-04',
    guestName: 'Arjun Rao',
    phone: '+91 98444 55004',
    partySize: 6,
    date: RESERVATION_TODAY,
    time: '21:00',
    durationMinutes: 120,
    status: 'pending',
    occasion: 'Birthday',
    note: 'Cake at 9:30',
    createdAt: '2026-08-07T11:40:00',
  },
  {
    id: 'res-05',
    guestName: 'Sana Iqbal',
    phone: '+91 98555 66005',
    partySize: 3,
    date: RESERVATION_TODAY,
    time: '13:00',
    durationMinutes: 60,
    status: 'seated',
    tableId: 't-04',
    createdAt: '2026-08-06T18:00:00',
  },
  {
    id: 'res-06',
    guestName: 'Dev Patel',
    phone: '+91 98666 77006',
    partySize: 4,
    date: RESERVATION_TODAY,
    time: '12:30',
    durationMinutes: 90,
    status: 'no-show',
    createdAt: '2026-08-05T16:22:00',
  },
  {
    id: 'res-07',
    guestName: 'Isha Menon',
    phone: '+91 98777 88007',
    partySize: 2,
    date: '2026-08-08',
    time: '19:00',
    durationMinutes: 90,
    status: 'confirmed',
    createdAt: '2026-08-07T08:15:00',
  },
  {
    id: 'res-08',
    guestName: 'Kabir Malhotra',
    phone: '+91 98888 99008',
    partySize: 8,
    date: '2026-08-08',
    time: '20:30',
    durationMinutes: 150,
    status: 'pending',
    occasion: 'Client dinner',
    note: 'Needs Private zone',
    createdAt: '2026-08-07T12:00:00',
  },
]

export function getReservationById(id: string): Reservation | undefined {
  return reservations.find((r) => r.id === id)
}

export const todaysReservations = reservations.filter((r) => r.date === RESERVATION_TODAY)

export const upcomingReservationCount = todaysReservations.filter(
  (r) => r.status === 'pending' || r.status === 'confirmed',
).length

export const TIME_SLOTS = [
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
  '21:30',
]
