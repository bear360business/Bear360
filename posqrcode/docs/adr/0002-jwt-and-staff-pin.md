# ADR 0002: JWT access/refresh + argon2 staff PIN

## Status

Accepted

## Context

Four roles exist in the UI: super, restaurant, kitchen, staff (PIN). Passwords must not be stored in plaintext; staff need fast POS unlock.

## Decision

- Short-lived **access JWT** with `sub`, `role`, `restaurantIds`, optional `employeeId`
- **Refresh tokens** hashed (SHA-256) in `RefreshToken` table and rotated
- Staff PIN verified with **argon2**; staff access tokens are issued without persistent refresh rows in v1

## Consequences

- Guards enforce tenant membership on every ops route
- Staff logout is client-side token discard until refresh persistence is added for staff
