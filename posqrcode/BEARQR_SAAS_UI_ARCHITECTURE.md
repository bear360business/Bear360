# Bear 360 — Multi-Tenant AI Restaurant SaaS · UI Architecture (v2)

> **Scope.** UI/product architecture only: navigation, screen flow, feature
> hierarchy, component structure, responsive behaviour, states, design tokens,
> subscription-gating UX and AI-insight UX.
> **Out of scope by instruction:** backend logic, API contracts, database
> schema, authentication implementation. Where this document says "the tenant
> context provides X", treat X as a UI-layer contract, not an endpoint.
>
> **Relationship to v1.** `BEARQR_UI_ARCHITECTURE.md` specified the QR-ordering
> MVP (18 screens, built). This document supersedes it for everything beyond QR
> ordering and re-frames the whole product as a plan-gated multi-tenant SaaS.
> §14 lists exactly what already exists in `src/` and what is net-new.

---

## Table of contents

| §  | Section | Deliverable |
|----|---------|-------------|
| 0  | Product concept & tenancy model | — |
| 1  | Design tokens | ⑧ Design token summary |
| 2  | Information architecture | ① IA |
| 3  | Role-based navigation | ② Role navigation |
| 4  | Subscription model & feature matrix | — |
| 5  | Subscription gating UX | ⑨ Gating UX |
| 6  | Screen inventory | ③ Screen inventory |
| 7  | Super Admin screens (wireframes) | ④ Layouts |
| 8  | Restaurant Admin screens (wireframes) | ④ Layouts |
| 9  | Staff screens (wireframes) | ④ Layouts |
| 10 | Customer screens (wireframes) | ④ Layouts |
| 11 | Component hierarchy | ⑤ Components |
| 12 | Responsive behaviour matrix | ⑥ Responsive |
| 13 | Empty · loading · error states | ⑦ States |
| 14 | AI insight UX patterns | ⑩ AI UX |
| 15 | Build delta against the current repo | — |

---

## 0. Product concept & tenancy model

### 0.1 One sentence

Bear 360 is a subscription-based, multi-tenant restaurant operating system: the
platform owner provisions restaurant accounts, each account's data is isolated,
and every module a restaurant can see is a function of its plan.

### 0.2 The four actors

| Role | Shell | Enters at | Owns |
|------|-------|-----------|------|
| **Super Admin** | `SuperAdminLayout` (dark rail + top header) | `/super/login` | Tenants, plans, industries, feature grants, platform revenue, support |
| **Restaurant Admin** | `RestaurantAdminLayout` (collapsible rail) | `/login` | One tenant: ordering, POS, inventory, staff, reports, AI, billing |
| **Staff** | `StaffLayout` (task-first, no rail) | `/login` (role routes them) | Their shift: cashier, kitchen, attendance |
| **Customer** | `CustomerLayout` (480px PWA column) | QR scan | Their own order only |

### 0.3 Tenancy in the UI layer

Every screen below `RestaurantAdminLayout` and `StaffLayout` renders inside a
**TenantShell** that resolves one object once and shares it by context:

```
useTenant() → {
  tenant   : { id, name, logo, branches[], activeBranchId, gstin, currency }
  plan     : { id: 'basic'|'professional'|'enterprise', label, renewsOn, status }
  features : Record<FeatureKey, boolean>      // effective grants — see §5.1
  limits   : Record<LimitKey, { used, max }>  // max = null ⇒ unlimited
  status   : 'trial' | 'active' | 'past_due' | 'suspended' | 'expired'
}
```

Three UI rules follow from this and are non-negotiable:

1. **No screen fetches its own entitlement.** A component asks
   `useFeature('inventory')`, never "which plan is this".
2. **Branch is a global selector, not a filter per screen.** Switching branch in
   the header re-scopes every number on the page. Enterprise only.
3. **Tenant identity is always visible.** The sidebar footer shows restaurant
   name + plan badge, so a support agent screen-sharing always knows the tenant.

This mirrors the pattern already shipping in `src/hooks/use-platform-config.tsx`
and `use-service-config.tsx` (context + localStorage + cross-tab `storage` sync).

### 0.4 Industry profiles (core platform layer)

Bear 360 is one shared product core (catalog, orders, QR, POS, plans) plus
**industry packs** — not separate Hotel/Cafe apps. Ten venues (Restaurants,
Cafes, Cloud Kitchens, Mess & Canteens, Catering, Hotels, Resorts, Bakeries,
Nutrition Centers, Food Trucks) each have an `IndustryProfile`:

| Field | Role |
|-------|------|
| `featureDefaults` | Absent key = allow; `false` = industry blocks even if the plan grants |
| `serviceDefaults` | Order types + counter QR applied on industry change |
| `labels` | Soft copy: venue / space / spaces / catalog (e.g. Room, Rooms, Menu) |
| `navHints.hide` | Paths removed from admin nav (e.g. `/tables` for cloud kitchens) |

**Effective entitlement formula** (implemented in `resolveFeatures` / `useTenant`):

```
effective(feature) =
  planGrants[feature]
  && industryDefaults[feature] !== false
  && platformGrants[feature] !== false
  && superOverride[feature] !== false
```

Platform grants today map `kitchen` ← `platform.service.kitchenDisplay` and
`qrOrdering` ← `platform.service.onlineOrdering`. Industry-blocked modules are
**hidden** from nav (not upgrade-locked). Hitting the route shows an
industry-unavailable page, not a plan upsell.

| Source | Path |
|--------|------|
| Seed packs | `src/lib/industries.ts` |
| Super-editable catalog | `src/lib/industries-catalog.ts` + `useIndustries` → `/super/industries` |
| Copy helper | `useIndustryCopy()` / `useIndustryProfile()` |
| Apply service defaults | `useServiceConfig().applyIndustryDefaults(id)` |

Super Admin owns industry packs the same way it owns plans. Changing a venue's
`industryId` (Settings → Profile or create/edit restaurant) re-applies that
pack's service defaults and re-resolves features live.

---

## 1. Design tokens

### 1.1 Colour

Tokens are declared as HSL triplets on `:root` so Tailwind can compose alpha
(`hsl(var(--primary) / <alpha-value>)`), exactly as `src/styles/globals.css`
already does. **Change from v1: primary moves from yellow to green.** The
existing `data-theme` engine keeps the yellow set available as an alternate.

| Token | Hex | HSL triplet | Use |
|-------|-----|-------------|-----|
| `--primary` | `#16A34A` | `142 76% 36%` | Primary buttons, active nav, chart series 1, focus ring |
| `--primary-hover` | `#15803D` | `142 72% 29%` | Hover / pressed |
| `--primary-foreground` | `#FFFFFF` | `0 0% 100%` | Text on primary (green is dark enough — do **not** reuse v1's dark-on-yellow) |
| `--primary-tint` | `#DCFCE7` | `141 84% 93%` | Selected rows, badge backgrounds, chart fills |
| `--background` | `#F8FAFC` | `210 40% 98%` | Page canvas |
| `--surface` | `#FFFFFF` | `0 0% 100%` | Cards, sheets, popovers, table body |
| `--surface-muted` | `#F1F5F9` | `210 40% 96%` | Table headers, disabled fills, skeleton base |
| `--border` | `#E5E7EB` | `220 13% 91%` | 1px hairlines, card borders, dividers |
| `--foreground` | `#0F172A` | `222 47% 11%` | Body + headings |
| `--muted-foreground` | `#64748B` | `215 16% 47%` | Captions, table meta, placeholder |
| `--success` | `#16A34A` | `142 76% 36%` | Paid, in stock, present, completed |
| `--warning` | `#F59E0B` | `38 92% 50%` | Low stock, expiring plan, late shift |
| `--danger` | `#EF4444` | `0 84% 60%` | Out of stock, failed payment, suspended |
| `--info` | `#2563EB` | `217 91% 60%` | AI opportunity, neutral notices |
| `--sidebar` | `#0F172A` | `222 47% 11%` | Dark rail background |

Each semantic colour also ships a `-tint` (≈93% L light / ≈14% L dark) for badge
and banner fills. Dark mode overrides the same variable names under `.dark`; no
component ever hard-codes a hex.

> **Contrast contract.** `--warning` on white fails AA for text. Amber is only
> ever used as a fill, dot, or bar — warning *text* uses `#B45309` (`32 95% 33%`).

### 1.2 Type — Inter

| Style | Size / line | Weight | Use |
|-------|-------------|--------|-----|
| Display | 28 / 34 | 700 | Stat values, POS totals, token number |
| H1 | 24 / 32 | 700 | Page title |
| H2 | 18 / 26 | 600 | Card title, section |
| H3 | 15 / 22 | 600 | Sub-section, table caption |
| Body | 14 / 20 | 400 | Default |
| Body-strong | 14 / 20 | 500 | Table primary cell, labels |
| Caption | 12 / 16 | 400 | Meta, helper, timestamps |
| Overline | 11 / 14 | 600, `tracking-[0.14em]`, uppercase | Sidebar group labels, KPI labels |
| Numeric | any | `tabular-nums` | **Every** money and quantity column |

### 1.3 Space · radius · elevation · motion

- **Space:** 8px system — `4 8 12 16 24 32 48 64`. Card padding 24 (desktop) /
  16 (mobile). Grid gutter 16. Section gap 24.
- **Radius:** card `16`, input/button `10`, pill `999`, chip `8`, modal `20`.
- **Elevation:** `card` `0 1px 2px rgb(15 23 42 / .06)` · `raised`
  `0 4px 12px rgb(15 23 42 / .08)` · `float` `0 8px 24px rgb(15 23 42 / .12)`
  (only for POS cart, FAB, sticky bars). Never more than one elevation step
  between adjacent surfaces.
- **Motion:** 150ms `ease-out` for hover/press, 200ms for popovers, 250ms for
  sheets/drawers. Skeleton shimmer 1.4s. All wrapped in `motion-reduce:` guards.
- **Density:** table row 48px default / 40px compact (a per-table toggle on
  Inventory and Staff, persisted per user).
- **Focus:** 2px `--primary` ring at 2px offset. Never removed.

### 1.4 Layout frame

```
Content max-width 1440   ·   Sidebar 264 expanded / 72 collapsed
TopHeader 64             ·   Mobile BottomNav 64 + safe-area
Page padding 32 desktop / 24 tablet / 16 mobile
Dashboard grid: 12 cols desktop · 8 tablet · 4 mobile, 16 gutter
```

---

## 2. Information architecture

### 2.1 Full route map

```
PUBLIC
  /                                  Portal chooser (all sign-ins + demos)
  /login                             Restaurant sign-in (routes by role after auth)
  /super/login                       Platform sign-in
  /qr-test                           QR board (dev/demo aid)

SUPER ADMIN                          shell: SuperAdminLayout
  /super/dashboard                   Platform KPIs, revenue, growth
  /super/customers                   Tenant list  ← primary work surface
  /super/customers/new               Provision tenant (wizard)
  /super/customers/:id               Tenant detail
        ├ ?tab=overview              Usage, health, branches
        ├ ?tab=features              Per-tenant feature grants  (§7.4)
        ├ ?tab=subscription          Plan, term, invoices
        ├ ?tab=users                 Owner + staff seats
        └ ?tab=activity              Audit trail
  /super/subscriptions               All subscriptions: renewals, dunning, trials
  /super/feature-control             Bulk/global feature + rollout control
  /super/plans                       Plan catalogue editor
  /super/industries                  Industry packs (features, labels, defaults)
  /super/revenue                     MRR, ARR, churn, cohorts, invoices
  /super/support                     Ticket queue + impersonation launcher
  /super/settings                    Platform defaults, branding, notifications

RESTAURANT ADMIN                     shell: RestaurantAdminLayout (TenantShell)
  /dashboard                         Today at a glance + AI strip
  /qr-ordering                       QR generation, print sheets, live table map
  /tables                            Table CRUD, zones, status
  /menu                              Categories, items, modifiers, availability
  /orders                            Order list / kanban / detail
  /pos                    [PRO]      Counter billing terminal
  /inventory              [PRO]      ├ /inventory            Stock overview
                                     ├ /inventory/items      Ingredient master
                                     ├ /inventory/purchases  Purchase entries
                                     ├ /inventory/wastage    Wastage log
                                     └ /inventory/suppliers  Suppliers
  /staff                  [PRO]      ├ /staff                Employee list
                                     ├ /staff/roles          Roles & permissions
                                     ├ /staff/schedule       Shift scheduler
                                     ├ /staff/attendance     Attendance
                                     └ /staff/payroll        Payroll summary
  /reports                           ├ /reports/sales        (Basic: sales only)
                                     ├ /reports/orders
                                     ├ /reports/profit       [PRO]
                                     ├ /reports/labour       [PRO]
                                     ├ /reports/inventory    [PRO]
                                     └ /reports/custom       [ENT]
  /ai                     [ENT]      AI assistant + insight feed
  /billing                           Plan, usage, invoices, payment method
  /settings                          Profile, service, appearance, QR, users
  /kitchen                           Full-screen KDS (exits the shell)

STAFF PORTAL                         shell: StaffLayout
  /staff/pos                         Cashier mode (simplified POS)
  /staff/orders                      Waiter order list
  /staff/kitchen                     KDS
  /staff/attendance                  Clock in / out

CUSTOMER                             shell: CustomerLayout
  /r/:restaurantId/table/:tableId    Table QR landing
  /r/:restaurantId                   Counter QR landing (no table) ✅ shipped
  …/menu  ·  …/cart  ·  …/success    Same three screens under either base
```

> **⚠ Route collision — flagged.** The brief places the admin module at `/staff`
> and the staff portal at `/staff/pos`. React Router resolves these correctly
> (static segments out-rank the shorter path), but they render in **different
> shells for different roles**, and prefix-based active-nav matching will light
> up "Staff" in the admin sidebar while a cashier is on `/staff/pos`.
> **Recommendation:** move the staff portal to `/crew/pos · /crew/orders ·
> /crew/kitchen · /crew/attendance` and leave the admin module at `/staff`.
> The rest of this document uses `/staff/*` as specified; every occurrence maps
> 1:1 to `/crew/*` if you take the recommendation.

### 2.2 Depth rule

No destination is more than **three clicks** from its portal home:
`sidebar module → sub-tab → row/detail`. Anything deeper becomes a drawer or a
sheet over the current screen, never a fourth route level.

### 2.3 Cross-module deep links

The IA is a graph, not a tree. These edges must exist and must carry state:

| From | To | Carries |
|------|-----|---------|
| Dashboard low-stock card | `/inventory?filter=low` | Filter |
| AI insight "reorder paneer" | `/inventory/purchases/new` | Item + suggested qty |
| POS checkout complete | `/orders/:id` | Order id (toast link) |
| Reports > top items row | `/menu?item=:id` | Item focus |
| Locked module click | `/billing?upgrade=inventory` | Intended feature |
| Super support ticket | tenant impersonation → `/dashboard` | Tenant + banner |
| Staff attendance anomaly | `/staff/schedule?date=…` | Date |

---

## 3. Role-based navigation

### 3.1 Super Admin — top navigation + secondary rail

Platform work is wide, shallow and comparison-heavy, so the super shell leads
with a **top nav** (the brief's requirement) and drops a contextual rail only
inside a tenant detail.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🐻 Bear 360 SUPER │ Dashboard Customers Subscriptions Features Revenue      │
│                 │ Support Settings          [⌘K search] [🔔 3] [AA ▾]     │
└──────────────────────────────────────────────────────────────────────────┘
```

- Active item: 2px `--primary` underline + `--foreground` text.
- `⌘K` searches **tenants first**, then screens — a support agent types a
  restaurant name, not a page name.
- Notification bell groups: payment failed · trial ending · support escalation.
- Avatar menu: Profile · Platform settings · **Exit impersonation** (only while
  impersonating, rendered in danger colour) · Sign out.

### 3.2 Restaurant Admin — collapsible left rail

```
GENERAL     Dashboard
OPERATIONS  QR Ordering · Tables · Menu · Orders · POS 🔒 · Kitchen ↗
CONTROL     Inventory 🔒 · Staff 🔒
INSIGHTS    Reports · AI ✨🔒
ACCOUNT     Billing · Settings
────────────────────────────────────
[RS] Riya Sharma          [PRO]  ⏻
     Masala Bear · Bandra ▾
```

- Groups are ordered by daily frequency, not by importance-on-paper.
- `🔒` = present but not entitled (§5). `↗` = opens outside the shell.
- Badge counts only where a human must act: Orders (pending), Inventory (below
  threshold), Staff (unapproved attendance).
- Collapsed rail (72px): icon + tooltip; badges become a 6px dot.
- Footer carries tenant identity, **plan badge** and the branch switcher
  (Enterprise). The plan badge is a button → `/billing`.

### 3.3 Staff — task shell, no rail

Staff get one job per screen and thumb-reachable controls.

```
Mobile / tablet:  [ POS ] [ Orders ] [ Kitchen ] [ Me ]        ← BottomNav 64h
Counter tablet:   top strip only — shift timer, tenant, ⏻
```

- No breadcrumbs, no search, no settings. A staff member never sees money
  totals beyond the ticket in front of them unless their role grants Reports.
- KDS runs full-screen with the app chrome hidden entirely (`KitchenLayout`).

### 3.4 Customer — bottom nav

Unchanged from v1 and already shipped: Menu · Cart (badge) · Status, plus the
floating cart pill. Works identically under the table base and the counter base.

### 3.5 Navigation state matrix

| Nav item state | Visual | Click behaviour |
|---|---|---|
| Available | Icon + label, hover tint | Navigate |
| Active | `--primary-tint` fill, 3px left bar, `--primary` icon | — |
| Entitled but empty | Normal | Navigate → EmptyState |
| **Locked (plan)** | 60% opacity + `🔒` + plan chip | Upgrade drawer (§5.3) |
| **Disabled (super admin)** | Hidden entirely | — |
| Limit reached | Normal + amber dot | Navigate → in-page limit banner |

---

## 4. Subscription model & feature matrix

### 4.1 Plans

| | **Basic** | **Professional** | **Enterprise** |
|---|---|---|---|
| Positioning | Single counter, QR-first | Full-service restaurant | Group / multi-branch |
| Price line | ₹999 /mo | ₹2,499 /mo | Custom |
| QR ordering | ✅ | ✅ | ✅ |
| Tables | 10 | Unlimited | Unlimited |
| Menu items | 50 | Unlimited | Unlimited |
| Orders / month | 1,000 | Unlimited | Unlimited |
| POS | — | ✅ | ✅ |
| Kitchen display | — | ✅ | ✅ |
| Inventory | — | ✅ | ✅ + forecasting |
| Staff seats | 2 | 5 | Unlimited |
| Shift scheduler | — | ✅ | ✅ |
| Payroll summary | — | ✅ | ✅ |
| Reports | Sales + Orders | + Profit, Labour, Inventory | + Custom builder, exports |
| AI insights | — | — | ✅ |
| Branches | 1 | 1 | Unlimited |
| Support | Email | Priority | SLA + CSM |

> **Naming migration.** `src/lib/mock/plans.ts` currently ships
> `starter · pro · enterprise`. Canonical ids become
> `basic · professional · enterprise`; keep the old ids as aliases in the mock
> so existing fixtures don't break.

### 4.2 Feature keys

`qrOrdering · pos · kitchen · inventory · staff · scheduler · payroll ·
reportsBasic · reportsAdvanced · reportsCustom · ai · multiBranch · export ·
apiAccess`

### 4.3 Limit keys

`tables · menuItems · ordersPerMonth · staffSeats · branches · storageMb`

Each limit renders through one component (`UsageMeter`) so "12 of 50 used" looks
identical on Billing, on Settings and inside the blocking dialog.

---

## 5. Subscription gating UX

The single most important UX surface in a plan-gated SaaS. Get it wrong and you
generate support tickets ("where did POS go?") and zero upgrades.

### 5.1 Grant resolution

```
effective(feature) = planGrants[feature]           // what they bought
                  && industryDefaults[feature]     // industry pack (§0.4), default allow
                  && platformGrants[feature]       // platform kill-switch, default true
                  && superOverride[feature]        // per-tenant kill-switch, default true
                  && tenantPref[feature]           // owner hid it from their own team
```

(`tenantPref` is nav-only via `useNavConfig` — it does not flip `useFeature`.)

Each falsy source produces a **different** UI, because the remedy differs:

| Falsy source | Nav treatment | Screen treatment | CTA |
|---|---|---|---|
| `planGrants` | Locked + plan chip | Upgrade page (§5.4) | "Upgrade to Professional" |
| `industryDefaults` | Hidden | Industry-unavailable page | Settings → change industry |
| `platformGrants` / `superOverride` | Hidden | 404-equivalent → Dashboard | none (support only) |
| `tenantPref` | Hidden for staff, shown greyed to owner in Settings | — | Settings toggle |

### 5.2 Four gate styles — pick by intent

**A · Locked nav item** (default for whole modules)
Keep it visible. Discovery is the point.
```
│ 📦 Inventory                          🔒 PRO │   ← 60% opacity
```

**B · Upgrade page** (route guard)
Never 404 an unentitled route. Render a real page that sells.
```
┌───────────────────────────────────────────────────────────┐
│  📦  Inventory is a Professional feature                   │
│  Track stock automatically as orders are billed, and get   │
│  alerted before an ingredient runs out.                    │
│                                                            │
│  ✓ Auto-deduct from every sale   ✓ Low-stock alerts        │
│  ✓ Wastage log                   ✓ Supplier + cost history │
│                                                            │
│  ┌── blurred, non-interactive screenshot of the module ──┐ │
│  └────────────────────────────────────────────────────────┘ │
│  [ Upgrade to Professional — ₹2,499/mo ]  [ Compare plans ] │
│  Caption: You're on Basic. Upgrades apply immediately;      │
│           you're billed the prorated difference.            │
└───────────────────────────────────────────────────────────┘
```

**C · Inline partial gate** (a screen the tenant *does* own, with premium parts)
Reports is the canonical case: Sales and Orders tabs work; Profit / Labour /
Inventory tabs carry a lock chip and swap the chart body for a blurred preview +
one CTA. Never hide the tab — the tab *is* the advertisement.

**D · Limit gate** (they own the feature, they've run out of room)
```
Soft  (≥80%)  amber inline banner: "42 of 50 menu items used."  [Upgrade]
Hard  (100%)  the create action stays visible but disabled; clicking it opens
              a dialog: what the limit is, what they'd get, one primary CTA,
              and a secondary "Free up space" that deep-links to the list
              sorted by least-used. Never an unexplained disabled button.
```

### 5.3 Upgrade drawer

Clicking any lock opens a right-side `Sheet` (480px, full-screen on mobile) —
not a route change, so the user never loses their place:

```
Header      Unlock Inventory
Body        3 benefit rows (icon + line)
            Plan compare strip: [Basic ✓ current] [Professional ← needed] [Ent]
            Price delta line: "+₹1,500/mo · prorated ₹840 today"
Footer      [ Upgrade now ]  [ Talk to sales ]        ← sticky
```

`?upgrade=<featureKey>` on `/billing` opens the same drawer on load, so the deep
link from a locked nav item and the in-page CTA share one implementation.

### 5.4 Lifecycle states — tenant-wide banners

One banner slot at the top of the content area, one banner maximum, ranked:

| Status | Banner | Colour | Behaviour |
|---|---|---|---|
| `trial` | "14 days left in your trial" + progress | info | Dismissible daily; last 3 days not dismissible |
| `past_due` | "Payment failed — update your card by 12 Aug" | warning | Persistent, links to Billing |
| `suspended` | "Account suspended — contact support" | danger | Persistent; app is **read-only** |
| `expired` | "Subscription ended" | danger | Read-only + export allowed |
| `active` | none | — | — |

**Read-only mode** is a first-class UI state, not an error: every create/edit
control renders disabled with a shared tooltip ("Reactivate to make changes"),
lists and reports still render, and Export stays enabled. Losing access to your
own historical data is the fastest way to lose a renewal.

### 5.5 What the Super Admin sees

The same tenant, from the platform side, exposes the mirror control (§7.4):
per-feature toggles that write `superOverride`. Turning one off shows a
confirmation naming the blast radius: *"Riya Sharma and 6 staff will lose access
to POS immediately."*

---

## 6. Screen inventory

`Plan` = minimum plan. Status: ✅ built · 🔶 partial · ⬜ new.

### Super Admin

| # | Screen | Route | Status | Notes |
|---|--------|-------|--------|-------|
| S1 | Login | `/super/login` | ✅ | — |
| S2 | Dashboard | `/super/dashboard` | 🔶 | Add MRR, churn, trial-conversion widgets |
| S3 | Customers | `/super/customers` | 🔶 | Rename of `/super/restaurants` + plan/expiry/usage columns |
| S4 | Provision tenant | `/super/customers/new` | 🔶 | Wizard-ify existing create form |
| S5 | Tenant detail | `/super/customers/:id` | ⬜ | 5 tabs |
| S6 | Feature control | `/super/feature-control` | ⬜ | Bulk toggles + rollout |
| S7 | Subscriptions | `/super/subscriptions` | ⬜ | Renewals, dunning, trials |
| S8 | Plans | `/super/plans` | ✅ | Feature-matrix editor |
| S8b | Industries | `/super/industries` | ✅ | Industry packs + matrix |
| S9 | Revenue | `/super/revenue` | ⬜ | MRR/ARR/churn/cohorts |
| S10 | Support | `/super/support` | ⬜ | Queue + impersonation |
| S11 | Settings | `/super/settings` | ✅ | — |

### Restaurant Admin

| # | Screen | Route | Plan | Status |
|---|--------|-------|------|--------|
| A1 | Dashboard | `/dashboard` | Basic | 🔶 add low-stock, staff-present, AI strip |
| A2 | QR ordering | `/qr-ordering` | Basic | 🔶 exists as `/qr-test`; needs print sheets |
| A3 | Tables | `/tables` | Basic | ✅ |
| A4 | Menu | `/menu` | Basic | ✅ |
| A5 | Orders | `/orders` | Basic | ✅ |
| A6 | POS | `/pos` | Pro | ✅ add payment panel + split |
| A7 | Kitchen (KDS) | `/kitchen` | Pro | ✅ |
| A8 | Stock overview | `/inventory` | Pro | ⬜ |
| A9 | Ingredients | `/inventory/items` | Pro | ⬜ |
| A10 | Purchases | `/inventory/purchases` | Pro | ⬜ |
| A11 | Wastage | `/inventory/wastage` | Pro | ⬜ |
| A12 | Suppliers | `/inventory/suppliers` | Pro | ⬜ |
| A13 | Employees | `/staff` | Pro | ⬜ |
| A14 | Roles | `/staff/roles` | Pro | ⬜ |
| A15 | Scheduler | `/staff/schedule` | Pro | ⬜ |
| A16 | Attendance | `/staff/attendance` | Pro | ⬜ |
| A17 | Payroll | `/staff/payroll` | Pro | ⬜ |
| A18 | Reports | `/reports/*` | Basic→Ent | 🔶 tabs + gating |
| A19 | AI assistant | `/ai` | Ent | ⬜ |
| A20 | Billing | `/billing` | Basic | ⬜ |
| A21 | Settings | `/settings` | Basic | ✅ |

### Staff & Customer

| # | Screen | Route | Status |
|---|--------|-------|--------|
| T1 | Cashier POS | `/staff/pos` | ⬜ (simplified `/pos`) |
| T2 | Orders | `/staff/orders` | ⬜ |
| T3 | KDS | `/staff/kitchen` | ✅ reuse |
| T4 | Attendance | `/staff/attendance` | ⬜ |
| C1 | Table landing | `/r/:r/table/:t` | ✅ |
| C2 | Counter landing | `/r/:r` | ✅ |
| C3 | Menu | `…/menu` | ✅ |
| C4 | Cart | `…/cart` | ✅ |
| C5 | Success | `…/success` | ✅ |

**Totals:** 11 super · 21 admin · 4 staff · 5 customer = **41 screens**
(18 built, 8 partial, 15 new).

---

## 7. Super Admin screens

### 7.1 Dashboard `/super/dashboard`

```
┌───────────────────── TopNav (§3.1) ──────────────────────────────────────┐
├──────────────────────────────────────────────────────────────────────────┤
│ pad 32 · max-w 1440                                                      │
│ H1 Platform overview                    [Last 30 days ▾]  [⤓ Export]     │
│                                                                    g 24  │
│ ┌ Stat ────┐┌ Stat ────┐┌ Stat ────┐┌ Stat ────┐┌ Stat ────┐  5 × cols   │
│ │Customers ││ Active   ││   MRR    ││  Churn   ││  Trial   │             │
│ │   128    ││   114    ││ ₹4.2L    ││  2.1%    ││  conv 38%│             │
│ │ ▲12% ↗   ││ ▲6% ↗    ││ ▲8% ↗    ││ ▼0.4% ↘  ││ ▲5pt ↗   │             │
│ └──────────┘└──────────┘└──────────┘└──────────┘└──────────┘             │
│                                                                    g 24  │
│ ┌ ChartCard  Revenue trend (span 8) ──────┐┌ ChartCard Plan mix (4) ┐    │
│ │ area, ₹ MRR by month, primary fill 20%  ││ donut · Basic/Pro/Ent  │    │
│ │ secondary dashed line = new MRR         ││ legend w/ count + %    │    │
│ └─────────────────────────────────────────┘└────────────────────────┘    │
│ ┌ ChartCard  Subscription growth (span 12) ───────────────────────────┐  │
│ │ stacked bars: new · upgraded · churned per month                     │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                                    g 24  │
│ ┌ Card Recent customers (6) ─────┐┌ Card Expiring ≤14d (6) ──────────┐   │
│ │ Name · Plan · Created · Status ││ Name · Plan · Expires · [Remind]  │   │
│ └────────────────────────────────┘└───────────────────────────────────┘   │
│ ┌ Card Open support tickets (12) ─────────────────────────────────────┐   │
│ │ Sev · Tenant · Subject · Age · Assignee · [Open]                     │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Hierarchy:** `SuperAdminLayout > PageHeader > StatCard×5 > grid-12
  (ChartCard 8 + ChartCard 4, ChartCard 12) > Card×3 (DataTable)`
- **Why 5 stats:** MRR, churn and trial-conversion are the three numbers a
  platform owner checks daily; customers/active give them denominators.
- **States:** each card fails independently (inline `Alert` + Retry). New
  platform → charts show EmptyState with "Create your first customer" CTA.
- **Responsive:** ≥1280 5 stats in a row · 1024 3+2 · 768 2×3 · mobile 1-col,
  charts 220h, tables → stacked rows.

### 7.2 Customers `/super/customers`

```
│ H1 Customers  (128)                    [+ New customer]                  │
│ ┌ Toolbar ──────────────────────────────────────────────────────────┐    │
│ │ [🔍 Search name, owner, city]  [Plan ▾][Status ▾][Expiry ▾]  [⤓]  │    │
│ └───────────────────────────────────────────────────────────────────┘    │
│ ┌ Card ─────────────────────────────────────────────────────────────┐    │
│ │ ☐ │ RESTAURANT      │ PLAN │ STATUS  │ EXPIRES │ BR │ USERS │ ⋮   │    │
│ │ ☐ │ 🍛 Masala Bear  │ PRO  │ ●Active │ 12 Sep  │ 1  │ 6/5 ⚠ │ ⋮   │    │
│ │   │ Riya · Mumbai   │      │         │ 36 d    │    │       │     │    │
│ │ ☐ │ 🍕 Napoli Cafe  │ BASIC│ ●Trial  │ 3 d ⚠   │ 1  │ 2/2   │ ⋮   │    │
│ │ ☐ │ 🍜 Wok Street   │ ENT  │ ●Susp.  │ —       │ 4  │ 31/∞  │ ⋮   │    │
│ └───────────────────────────────────────────────────────────────────┘    │
│ Showing 1–20 of 128            [‹ 1 2 3 … 7 ›]   Rows [20 ▾]             │
```

- Row is 2-line: primary (emoji + name) over caption (owner · city).
- `USERS 6/5 ⚠` — over-limit is surfaced *in the cell*, amber, with tooltip.
- `⋮` menu: View · **Impersonate** · Upgrade/Downgrade · Manage features ·
  Reset owner password · Suspend (danger, confirm dialog naming the tenant) ·
  Cancel subscription (danger + type-to-confirm).
- Bulk bar appears on selection: "3 selected — Email · Extend trial · Suspend".
- **Impersonation** is the highest-risk action in the product: confirm dialog →
  new session with a persistent danger-red top strip
  `⚠ Viewing Masala Bear as Riya Sharma  [Exit]`, and every write is blocked by
  default (read-only impersonation is the safe default; a "request write access"
  toggle is a deliberate second step).

### 7.3 Tenant detail `/super/customers/:id`

```
│ ← Customers                                                              │
│ 🍛 Masala Bear      [PRO] [●Active]        [Impersonate] [Manage plan ▾]  │
│ Riya Sharma · riya@masalabear.in · Mumbai · Customer since Jan 2025       │
│ ┌ Tabs: Overview │ Features │ Subscription │ Users │ Activity ───────────┐│
│ │ OVERVIEW                                                              ││
│ │ ┌Usage──────────────────────────────────────────────────────────────┐ ││
│ │ │ Tables      12 / ∞     ████████░░  Orders (Aug)  4,281 / ∞        │ ││
│ │ │ Menu items  47 / ∞     ████░░░░░░  Staff seats   6 / 5   ⚠ over   │ ││
│ │ │ Storage     420MB / 2GB ██░░░░░░░░ Branches      1 / 1            │ ││
│ │ └───────────────────────────────────────────────────────────────────┘ ││
│ │ ┌Health─────────────┐┌Adoption (last 30d)──────────────────────────┐ ││
│ │ │ Last login  2h    ││ QR ████████ POS ██████ Inventory ██ AI ░░   │ ││
│ │ │ Orders/day  142   ││ Caption: Inventory barely used → churn risk │ ││
│ │ │ Risk  ●Low        │└─────────────────────────────────────────────┘ ││
│ └───────────────────────────────────────────────────────────────────────┘│
```

The **Adoption bar per module** is the retention instrument: it tells the
platform owner which paid module is unused *before* the renewal conversation.

### 7.4 Feature control

Two surfaces share one component.

**Per tenant** (`/super/customers/:id?tab=features`):

```
│ Feature access · Masala Bear                     Plan: Professional      │
│ Caption: Plan grants are automatic. Overrides below take effect instantly.│
│                                                                          │
│ ┌ FeatureToggleCard ─────────────┐┌ FeatureToggleCard ─────────────────┐ │
│ │ 📱 QR Ordering        [ ●ON ]  ││ 🧾 POS                  [ ●ON ]    │ │
│ │ In plan · used daily           ││ In plan · 2,140 bills/mo           │ │
│ └────────────────────────────────┘└────────────────────────────────────┘ │
│ ┌────────────────────────────────┐┌────────────────────────────────────┐ │
│ │ 📦 Inventory          [ ●ON ]  ││ ✨ AI Insights         [ ○OFF ]    │ │
│ │ In plan · ⚠ low adoption 4%    ││ Not in plan — Enterprise           │ │
│ │                                ││ [ Grant as trial (30d) ]           │ │
│ └────────────────────────────────┘└────────────────────────────────────┘ │
```

- Card anatomy: icon tile 40 · title · state line (in plan / not in plan /
  overridden) · usage evidence · Switch.
- **Grant-as-trial** on out-of-plan features is the platform's sales lever and
  belongs in the UI: it sets a dated override and shows an expiry chip.
- Turning something **off** opens a confirm dialog naming affected users.
- An override that contradicts the plan renders an amber "Overridden" chip so
  nobody debugs a phantom entitlement.

**Global** (`/super/feature-control`): the same cards at platform scope, plus a
rollout row per feature — `Off · Beta (n tenants) · All` with a tenant picker,
and a kill-switch styled in danger for incident response.

### 7.5 Subscriptions `/super/subscriptions`

Tabs: **Active · Trials · Expiring (30d) · Past due · Cancelled**, each a table.
Past due gets a dunning column (attempt 1/3, next retry) and a `[Retry]` action.
Trials get days-remaining as a progress pill and `[Extend 7d]`.

### 7.6 Revenue `/super/revenue`

Stat row: MRR · ARR · ARPU · Net revenue retention · LTV:CAC.
Charts: MRR waterfall (new / expansion / contraction / churn), cohort retention
heat-map, revenue by plan. Table: invoices with status chips + `[Download]`.
Every currency cell `tabular-nums`, compact units (₹4.2L, ₹1.2Cr) via the
existing `formatCompactInr()`.

### 7.7 Support `/super/support`

Two-pane: ticket list (left 360, severity dot + tenant + age) / thread (right).
Right pane header carries **[Open tenant] [Impersonate]** so an agent moves from
complaint to the actual screen in one click. Sev-1 rows pulse amber until
acknowledged.

---

## 8. Restaurant Admin screens

### 8.1 Dashboard `/dashboard`

```
┌ Sidebar ┬─────────────── TopHeader ─────────────────────────────────────┐
│ 264     │ pad 32                                                        │
│         │ H1 Today          Wed 7 Aug · 2:14 PM   [Today ▾] [⤓]         │
│         │ ┌ ⚠ trial/past-due banner slot (§5.4) ──────────────────────┐ │
│         │ └───────────────────────────────────────────────────────────┘ │
│         │ ┌Stat────┐┌Stat────┐┌Stat────┐┌Stat────┐┌Stat────┐┌Stat────┐ │
│         │ │Sales   ││Orders  ││ AOV    ││Active  ││Low     ││Staff   │ │
│         │ │₹48,230 ││  142   ││ ₹340   ││tables  ││stock   ││present │ │
│         │ │▲12% ↗  ││▲8% ↗   ││▼2% ↘   ││ 7/12   ││  4 ⚠   ││ 6/8    │ │
│         │ └────────┘└────────┘└────────┘└────────┘└────────┘└────────┘ │
│         │                                                         g 24  │
│         │ ┌ AI strip (Enterprise) ───────────────────────────────────┐  │
│         │ │ ✨ 3 new insights   [Paneer runs out in 2 days →]  [All] │  │
│         │ └──────────────────────────────────────────────────────────┘  │
│         │ ┌ ChartCard Hourly sales (8) ─────┐┌ Card Quick actions (4)┐  │
│         │ │ bars 11am–11pm, peak highlighted││ [New POS bill]        │  │
│         │ │ overlay line = same day last wk ││ [Add stock entry]     │  │
│         │ └─────────────────────────────────┘│ [Mark item sold out]  │  │
│         │ ┌ ChartCard Weekly revenue (6) ───┐│ [Print QR sheet]      │  │
│         │ │ area, 7 days                    │└───────────────────────┘  │
│         │ └─────────────────────────────────┘┌ Card Inventory alerts ┐  │
│         │ ┌ ChartCard Category perf. (6) ───┐│ 🔴 Paneer  0.4kg      │  │
│         │ │ horizontal bars, top 6 categories││ 🟠 Butter  1.2kg      │  │
│         │ └─────────────────────────────────┘│ [View inventory →]    │  │
│         │ ┌ Card Recent orders (12) ─────────┴───────────────────────┐  │
│         │ │ #  · Table/Type · Items · Total · Status · Time · [View] │  │
│         │ └──────────────────────────────────────────────────────────┘  │
```

- **Six stats, not four**, because low-stock and staff-present are the two
  numbers that change a manager's next action. Both are gated: on Basic those
  two tiles are replaced by a single locked `UpgradeStatCard`.
- Quick actions are the top-4 *write* actions; they respect entitlement (POS
  action hidden on Basic rather than locked — a disabled quick action is noise).
- **Responsive:** 6 stats → 3×2 tablet → 2×3 mobile; charts stack; Quick actions
  become a horizontal scroller directly under the stats on mobile.

### 8.2 QR ordering `/qr-ordering`

Tabs **Live map · QR codes · Print**.

- *Live map*: table grid (`TableCard`), colour = status, badge = elapsed time,
  click → order drawer. Counter QR pinned as the first card (already shipped).
- *QR codes*: per-table QR, size selector, logo toggle, `[Download PNG/SVG]`.
- *Print*: A4 sheet composer — 1/2/4/8 per page, table-tent or sticker template,
  preview at true aspect, `[Print]`. This is the screen a new customer uses on
  day one; it must not be buried inside Tables.

### 8.3 POS `/pos` (Professional) — the fast path

```
┌ Sidebar(collapsed 72) ┬──────────────────────────────────────────────────┐
│ │ ┌ Order type ──────────────────────────┐ ┌ TICKET (sticky 380w) ─────┐ │
│ │ │ [🍽 Dine-in][🥡 Takeaway][🛵 Delivery]│ │ Table T-04 ▾  Order #142  │ │
│ │ └──────────────────────────────────────┘ │ ─────────────────────────  │ │
│ │ [T-01][T-02]…[T-12]  ← table strip       │ Paneer Tikka   ⊖ 2 ⊕  ₹498│ │
│ │ ┌ Categories ─────────────────────────┐  │ Butter Naan    ⊖ 3 ⊕  ₹147│ │
│ │ │ [All][Starters][Mains][Breads][…]   │  │ ─────────────────────────  │ │
│ │ └─────────────────────────────────────┘  │ Subtotal          ₹645.00 │ │
│ │ [🔍 Search or scan]                      │ CGST 2.5%          ₹16.13 │ │
│ │ ┌────┐┌────┐┌────┐┌────┐  item grid      │ SGST 2.5%          ₹16.13 │ │
│ │ │IMG ││IMG ││IMG ││IMG │  4–6 cols       │ Discount           −₹0.00 │ │
│ │ │Name││Name││Name││Name│  min 96×96 tap  │ ═════════════════════════ │ │
│ │ │₹249││₹79 ││₹149││₹99 │                 │ TOTAL           ₹677.26   │ │
│ │ └────┘└────┘└────┘└────┘                 │ [+ Note] [% Discount]     │ │
│ │ ┌────┐┌────┐┌────┐┌────┐                 │ ┌───────────────────────┐ │ │
│ │ │ …  ││ …  ││ …  ││ …  │                 │ │   CHARGE  ₹677.26     │ │ │
│ │ └────┘└────┘└────┘└────┘                 │ └───────────────────────┘ │ │
│ │                                          │ [Hold] [KOT] [Clear]      │ │
└─┴──────────────────────────────────────────┴───────────────────────────┴─┘
```

- **Layout law:** the ticket never scrolls out of view (sticky, own
  `overflow-y`, `max-h: calc(100vh - header)`). On mobile it becomes a bottom
  sheet at 30% peek, drag to full — and it renders **before** the item grid in
  DOM order so it isn't 48 items down the page (already handled in `PosPage`).
- Item tap = add 1 with a 120ms scale pulse; long-press/`⋮` = modifiers sheet.
- Keyboard for counter speed: `/` search, `1–9` category, `+`/`-` qty,
  `Enter` charge, `Esc` clear. A visible `?` shortcut sheet.
- **Payment panel** (sheet over the ticket on `CHARGE`):
```
│ Amount due ₹677.26                                                │
│ [ 💵 Cash ] [ 📱 UPI ] [ 💳 Card ] [ ⇗ Split ]                     │
│ CASH:  Tendered [ 1000 ]   Quick: [500][1000][2000][Exact]        │
│        Change to return   ₹322.74     ← 28px display, high contrast│
│ SPLIT: rows of [method ▾][amount] · remaining ₹0.00 turns green   │
│ [ Complete payment ]   then → receipt: [Print][Share][New order]  │
```
- On completion: order → Orders, sales → Dashboard/Reports, and **inventory
  deduction fires**. Show the deduction as a toast link — "Stock updated · 3
  items" → `/inventory` — so the automatic behaviour is visible, not magic.
- Offline: queue bills locally, amber "Offline — 3 bills queued" strip, auto-sync
  chip on reconnect. A POS that dies with the wifi is not a POS.

### 8.4 Inventory (Professional)

**A8 Stock overview `/inventory`**

```
│ H1 Inventory        [Branch ▾]        [+ Purchase entry] [Record wastage] │
│ ┌Stat──────┐┌Stat──────┐┌Stat──────┐┌Stat──────┐                         │
│ │Stock val.││Low stock ││Out of st.││Wastage   │                          │
│ │₹1,24,500 ││   4 ⚠    ││   1 🔴   ││₹2,340 mo │                          │
│ └──────────┘└──────────┘└──────────┘└──────────┘                          │
│ ┌ Toolbar [🔍][Category ▾][Status ▾][Supplier ▾]  [⤓ Export] [◫ density] │
│ ┌ Card ────────────────────────────────────────────────────────────────┐  │
│ │ INGREDIENT   │ STOCK      │ LEVEL        │ REORDER│ COST │ SUPPLIER  │  │
│ │ 🔴 Paneer    │ 0.4 kg     │ ██░░░░░░░░   │ 5 kg   │ ₹320 │ Amul   ⋮ │  │
│ │ 🟠 Butter    │ 1.2 kg     │ ████░░░░░░   │ 3 kg   │ ₹540 │ Amul   ⋮ │  │
│ │ 🟢 Basmati   │ 24 kg      │ ████████░░   │ 10 kg  │ ₹110 │ Kohinoor⋮│  │
│ └──────────────────────────────────────────────────────────────────────┘  │
```

- **Colour-coded stock indicator** is one component (`StockLevelBar`) used in
  every list: 🔴 out (`≤0`) · 🟠 low (`≤ reorder`) · 🟡 watch (`≤ 1.5×`) ·
  🟢 healthy. Colour is never the only signal — the dot carries a shape/label
  for colour-blind users, and the numeric value is always present.
- Row `⋮`: Adjust stock · Add purchase · Record wastage · Edit item · History.
- **Auto-deduction transparency:** each row's History drawer shows a ledger —
  `Opening · +Purchases · −Sales (auto) · −Wastage · = Closing` — so a manager
  can reconcile. Automatic deduction without an audit trail destroys trust the
  first time a number looks wrong.

**A9 Ingredients `/inventory/items`** — master data: name, unit (kg/g/L/ml/pc),
category, reorder threshold, cost/unit, supplier, and **recipe mapping**
(menu item → ingredient quantities) which is what makes deduction possible. The
mapping editor is a sheet: menu item on the left, ingredient rows with quantity
+ unit on the right, live "cost per plate ₹86 · margin 65%" readout.

**A10 Purchases `/inventory/purchases`** — list + `[+ New entry]` sheet:
supplier, invoice #, date, line items (ingredient, qty, unit cost, total), GST,
attachment. Saving raises stock and writes the ledger.

**A11 Wastage `/inventory/wastage`** — quick-entry form (item, qty, reason chips:
Spoiled · Overcooked · Returned · Spillage · Expired, note, photo) plus a
"wastage by reason" donut and trend. Reason chips, not free text, because the
report is the point.

**A12 Suppliers** — cards: name, contact, items supplied, last order, spend MTD.

### 8.5 Staff (Professional)

**A13 Employees `/staff`** — `EmployeeCard` grid (avatar, name, role chip,
status dot, phone, shift today) with a list-view toggle. `[+ Add employee]`
sheet. Seat limit enforced here with `UsageMeter` — "5 of 5 seats used".

**A14 Roles `/staff/roles`** — permission matrix, roles as columns, permissions
as rows, checkbox cells:

```
│ PERMISSION            │ Cashier │ Kitchen │ Waiter │ Manager │            │
│ Take orders           │   ✓     │         │   ✓    │   ✓     │            │
│ Accept payment        │   ✓     │         │        │   ✓     │            │
│ Apply discount        │   ▣ ≤10%│         │        │   ✓     │            │
│ Void bill             │         │         │        │   ✓     │            │
│ View reports          │         │         │        │   ✓     │            │
│ Manage inventory      │         │   ✓     │        │   ✓     │            │
```

`▣` = conditional grant (opens a small popover for the bound value). Changing a
permission shows "affects 3 people" inline before save.

**A15 Scheduler `/staff/schedule`** — week grid, employees as rows, days as
columns, `ShiftCard` chips (role-coloured, time + hours). Drag to move, resize
to change duration, click empty cell to add. Header per column shows
**coverage vs forecast**: `Mon · 3 staff · forecast peak 7pm ⚠ understaffed`.
Publishing a week is an explicit action with a diff summary.

**A16 Attendance `/staff/attendance`** — day view: employee, scheduled, clocked
in/out, hours, variance chip (`+12m late`, `−30m early`), status. Manager
approves anomalies inline. Month view = heat-map calendar per employee.

**A17 Payroll `/staff/payroll`** — period selector, per-employee row: hours,
overtime, rate, gross, deductions, net; footer totals; `[Export]`. Explicitly
a *summary* — it feeds a payroll system, it is not one, and the screen says so.

### 8.6 Reports `/reports/*`

```
│ H1 Reports                                                               │
│ ┌ Tabs: Sales │ Orders │ Profit 🔒 │ Labour 🔒 │ Inventory 🔒 │ Custom 🔒 ││
│ ┌ Filter bar (sticky) ────────────────────────────────────────────────┐  │
│ │ [Today][Week][Month][Custom 📅]  [Branch ▾][Channel ▾]  [⤓ CSV/PDF] │  │
│ └─────────────────────────────────────────────────────────────────────┘  │
│ ┌Stat┐┌Stat┐┌Stat┐┌Stat┐   contextual to the active tab                  │
│ ┌ ChartCard primary (span 8) ─────────┐┌ ChartCard breakdown (4) ┐       │
│ ┌ Card  detail table + column chooser ─────────────────────────────┐      │
│ │ …  comparison column vs previous period, ▲▼ deltas                │      │
```

- **Comparison is default, not an option.** Every reports table carries a
  previous-period column; a number without a baseline is not a report.
- Sales: revenue, orders, AOV, tax collected · by day/hour/channel/payment.
- Profit `[PRO]`: revenue − food cost (from inventory) − labour (from staff) =
  gross margin; waterfall chart. This tab is the strongest upgrade argument in
  the product, which is why its locked preview shows a *real* waterfall shape.
- Labour `[PRO]`: labour cost %, hours by role, cost per order, overtime.
- Inventory `[PRO]`: consumption, wastage %, cost variance, top-consumed.
- Top items / Peak hours live as panels inside Sales, not separate routes.
- Custom `[ENT]`: dimension/measure picker → saved reports + schedule.

### 8.7 AI assistant `/ai` (Enterprise) — see §14 for the pattern rules

```
│ ✨ AI Assistant          Last analysed 12 min ago  [↻]  [⚙ Preferences]  │
│ ┌ Ask bar ───────────────────────────────────────────────────────────┐   │
│ │ Ask about your restaurant…                                    [→]  │   │
│ │ Try: "Why did Tuesday dip?" · "What should I prep for Friday?"      │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│ ┌ Tabs: All (7) │ Opportunities (3) │ Risks (2) │ Operations (2) │ Done ─┐│
│ ┌ AIInsightCard ─────────────────────────────────────────────────────┐   │
│ │ 🟠 RISK · Inventory              High confidence · 2h ago      [⋯] │   │
│ │ Paneer runs out in ~2 days                                          │   │
│ │ You're using 6.2 kg/day and have 12 kg. At this rate you'll stock   │   │
│ │ out Friday — your second-busiest day.                               │   │
│ │ Based on 14 days of sales · 3,240 orders   [How we calculated ▾]    │   │
│ │ [ Create purchase order · 40 kg ]   [ Snooze 7d ]  [ Not useful 👎 ]│   │
│ └────────────────────────────────────────────────────────────────────┘   │
│ ┌ AIInsightCard  🔵 OPPORTUNITY · Menu ──────────────────────────────┐   │
│ │ Butter Naan is under-attached                                       │   │
│ │ Only 31% of Paneer Tikka orders add naan (peers: 58%). Bundling     │   │
│ │ could add ≈₹18,000/month.                                           │   │
│ │ [ Create combo in Menu ]  [ Snooze ]  [ 👍 ]                        │   │
```

### 8.8 Billing `/billing`

```
│ ┌ Current plan ───────────────────────────┐┌ Payment method ──────────┐  │
│ │ Professional        ₹2,499 /mo           ││ 💳 HDFC •••• 4242        │  │
│ │ Renews 12 Sep 2026 · auto-renew ON       ││ Expires 08/28  [Update]  │  │
│ │ [ Upgrade to Enterprise ] [Change plan ▾]│└──────────────────────────┘  │
│ └──────────────────────────────────────────┘                              │
│ ┌ Usage this period ──────────────────────────────────────────────────┐   │
│ │ Staff seats   ████████░░  5 / 5   at limit   [Add seats +₹199 ea]   │   │
│ │ Orders        ███░░░░░░░  4,281 / ∞                                  │   │
│ │ Branches      ██████████  1 / 1              [Upgrade for multi]     │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
│ ┌ Plan comparison (3 columns, current highlighted, upgrade CTA) ──────┐   │
│ ┌ Invoices  date · number · amount · status · [⤓] ────────────────────┐   │
```

Downgrade is an explicit, honest flow: a dialog listing exactly what turns off
and what data is retained vs archived, with type-to-confirm. Surprise data loss
is the fastest route to a chargeback.

### 8.9 Settings `/settings`

Tabs: **Profile · Service · Appearance · QR & branding · Users · Notifications**
(Billing moved out to its own route). Service already carries order types,
delivery fee, table-free ordering, hours, GST rate and GSTIN (shipped).

---

## 9. Staff screens

### 9.1 Cashier POS `/staff/pos`

Same engine as `/pos`, stripped: no sidebar, no reports links, no discount above
the role's cap, no void. Header shows shift timer + name. Larger targets
(item tile ≥ 112px, charge button 64h). Optimised for a 10" tablet in landscape.

### 9.2 Orders `/staff/orders`

Single column of `OrderCard`s, newest first, filter chips
`All · New · Preparing · Ready · Served`. Primary action per card advances the
status — one tap, no menus. Pull-to-refresh; live badge on new arrivals.

### 9.3 Kitchen `/staff/kitchen` (KDS)

```
┌ NEW (3) ─────────┬ PREPARING (4) ────┬ READY (2) ───────────────────────┐
│ ┌──────────────┐ │ ┌──────────────┐  │ ┌──────────────┐                 │
│ │ #142 · T-04  │ │ │ #139 · 🥡    │  │ │ #137 · T-02  │                 │
│ │ 2× Paneer T. │ │ │ 1× Biryani   │  │ │ 3× Naan      │                 │
│ │ 3× Naan      │ │ │ ⏱ 08:12 🟠   │  │ │ ⏱ 12:40 🔴   │                 │
│ │ 📝 less spicy│ │ │              │  │ │              │                 │
│ │ ⏱ 01:20 🟢   │ │ │ [ READY → ]  │  │ │ [ SERVED → ] │                 │
│ │ [ START → ]  │ │ └──────────────┘  │ └──────────────┘                 │
└──────────────────┴───────────────────┴──────────────────────────────────┘
```

Full-screen, no chrome, 18px+ text readable at 1.5m, buttons ≥ 56px, colour by
elapsed time (🟢 <5m · 🟠 5–10m · 🔴 >10m), audible chime on new ticket with a
mute toggle. Never require scrolling to see a column header count.

### 9.4 Attendance `/staff/attendance`

One big primary control:
```
│            Riya · Cashier                    │
│         ┌──────────────────────┐             │
│         │      CLOCK IN        │  72h tall   │
│         └──────────────────────┘             │
│   Shift 11:00–19:00 · starts in 12 min       │
│   ─────────────────────────────────────      │
│   This week   Mon ✓ 8h · Tue ✓ 8h · Wed —    │
```
State flips to `CLOCK OUT` with a live elapsed timer once clocked in. Late
clock-in prompts a one-line reason (chips, optional).

---

## 10. Customer screens

Shipped and unchanged; recorded here for completeness.

- **Landing** — hero (cover, name, rating, open/closed) + context chip
  (`Table 4` on a table QR, `Takeaway · Delivery` on the counter QR) + one CTA.
- **Menu** — sticky restaurant header, sticky category chips with scroll-spy,
  search, `MenuItemCard` with veg/spice badges, floating cart pill.
- **Cart** — order-type picker (dine-in only when a table exists), item rows
  with steppers, delivery address when relevant, kitchen note, GST-split bill
  (Subtotal · Delivery · CGST · SGST · Total), GSTIN line, sticky place-order.
- **Success** — token card, live status tracker adapted to order type,
  collapsible summary, order-more.

Gating note: on Basic, the counter/table flow is fully functional — QR ordering
is never gated, because it's the wedge that sells everything else.

---

## 11. Component hierarchy

### 11.1 Layer model

```
layouts/     SuperAdminLayout · RestaurantAdminLayout · StaffLayout
             KitchenLayout · CustomerLayout · AuthLayout
             └ each composes: chrome + <Outlet/> + banner slot

components/app/   product components (own the product's opinions)
components/ui/    shadcn primitives (own nothing but behaviour)
```

Rule: an `app/` component may use `ui/` primitives; a `ui/` primitive never
imports from `app/`. No feature screen re-implements a primitive.

### 11.2 Shell components

| Component | Props (shape) | Notes |
|---|---|---|
| `AppSidebar` | `variant, collapsed, sections, onNavigate` | Sections filtered by entitlement; renders `🔒` from `NavItem.locked` |
| `TopHeader` | `portal, onMenuClick, onToggleCollapse, floating` | Breadcrumb · ⌘K · dark-mode · bell · avatar (shipped) |
| `TopNavBar` | `items, active` | Super Admin horizontal nav (shipped) |
| `BottomNav` | — (reads cart/role) | Customer + staff mobile |
| `TenantBanner` | `status, plan, daysLeft` | The single banner slot (§5.4) |
| `BranchSwitcher` | `branches, activeId` | Enterprise only |
| `ImpersonationBar` | `tenant, user, onExit` | Danger strip, always on top |

### 11.3 Data-display components

| Component | Anatomy | Used by |
|---|---|---|
| `StatCard` | icon tile 40 · label (Overline) · value (Display, tabular) · delta chip · optional sparkline | every dashboard |
| `UpgradeStatCard` | same frame, blurred value, 🔒 + CTA | gated KPIs |
| `ChartCard` | H2 · control slot · chart · legend · footnote | all charts |
| `DataTable` | toolbar (search/filters/density/export) · header (sortable, sticky) · rows · selection bar · pagination | 14 screens |
| `TableCard` | table number · seats · status dot · elapsed · amount | QR live map |
| `MenuItemCard` | image 72 · name · badges · price · stepper | menu (admin + customer) |
| `OrderCard` | number · type chip · items · total · status · time · action | orders, staff |
| `KitchenCard` | number · type · item lines · note · timer · advance button | KDS |
| `InventoryRow` | name · qty+unit · `StockLevelBar` · reorder · cost · supplier · ⋮ | inventory |
| `StockLevelBar` | 10-segment bar + colour + label | inventory, dashboard |
| `EmployeeCard` | avatar · name · role chip · status dot · shift today | staff |
| `ShiftCard` | role-coloured chip · time range · hours · drag handles | scheduler |
| `AIInsightCard` | §14.1 | AI, dashboard strip |
| `FeatureToggleCard` | icon · title · state line · evidence · Switch | super feature control |
| `UsageMeter` | label · used/max · bar · state colour · optional CTA | billing, tenant detail, limit dialogs |
| `PlanBadge` | plan colour chip (Basic grey · Pro primary · Ent slate-900) | everywhere a tenant appears |
| `StatusBadge` | dot + label, single source in `lib/status.ts` | everywhere |
| `EmptyState` | icon · title · description · action | §13 |
| `LoadingSkeleton` | card / table / chart / list variants | §13 |

### 11.4 POS-specific

`PosItemGrid` · `PosTicketPanel` (sticky, own scroll) · `PosLineRow` ·
`PaymentPanel` (method tabs + `CashTender` + `SplitPaymentRows`) ·
`ReceiptPreview` · `PosShortcutSheet` · `OfflineQueueChip`.

### 11.5 Gating components

`FeatureGate` (wraps children; renders lock variant by `mode="nav"|"page"|
"inline"`) · `UpgradeDrawer` · `LimitDialog` · `LockedPreview` (blurred child +
overlay CTA). Every lock in the product routes through these four — one visual
language, one place to change the sales copy.

### 11.6 Composition example (Inventory overview)

```
RestaurantAdminLayout
└ TenantShell (context)
  └ FeatureGate feature="inventory" mode="page"
    └ PageHeader (title, actions)
      ├ TenantBanner?
      ├ StatCard × 4
      └ Card
        └ DataTable
          ├ DataTableToolbar (search, filters, density, export)
          ├ InventoryRow × n  →  StockLevelBar, StatusBadge, DropdownMenu
          ├ EmptyState | LoadingSkeleton("table")
          └ Pagination
```

---

## 12. Responsive behaviour matrix

Breakpoints: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`.

| Surface | ≥1280 desktop | 768–1279 tablet | <768 mobile |
|---|---|---|---|
| Admin shell | Rail 264 + header 64 | Rail 72 icons | Rail → Sheet; BottomNav |
| Super shell | Top nav full | Top nav, overflow "More ▾" | Hamburger sheet |
| Dashboard stats | 6 across | 3 × 2 | 2 × 3, then scroll |
| Charts | 8/4 and 6/6 splits | stacked full-width | stacked, height 220 |
| DataTable | full columns | hide 2 lowest-priority | **stacked rows**: primary line + meta caption + chevron → detail sheet |
| POS | grid 6 cols + ticket 380 sticky | grid 4 + ticket 320 | grid 3 + ticket as bottom sheet (peek 30%) |
| Payment | inline panel | inline panel | full-screen sheet |
| Inventory | full table | drop supplier + cost | card rows: name, qty, level bar, ⋮ |
| Scheduler | 7-day grid | 7-day, horizontal scroll | **1 day at a time** + day pager |
| Roles matrix | full matrix | horizontal scroll, sticky first col | role selector → permission list |
| KDS | 3 columns | 2 columns + swipe | 1 column + status pager |
| Reports | filter bar inline | filters collapse to `[Filters (2)]` | filters in a sheet |
| Customer | 480 centred | 480 centred | full width |

**Touch rules:** minimum target 44×44 (POS/KDS 56×56); primary actions within
thumb reach (bottom third) on mobile; sticky action bars respect
`env(safe-area-inset-bottom)`; no hover-only affordance anywhere — every hover
action has a tap equivalent (`⋮` or long-press).

---

## 13. Empty · loading · error states

### 13.1 Empty states — three kinds, three treatments

**First-run (no data yet, user can create)** — illustration + one-line what it
is + primary CTA + a "learn more" link.

| Screen | Title | Body | CTA |
|---|---|---|---|
| Orders | "No orders yet today" | "Orders from QR, POS and staff land here in real time." | Open POS |
| Inventory | "No ingredients yet" | "Add ingredients to track stock automatically as you bill." | Add ingredient · Import CSV |
| Staff | "No employees yet" | "Add your team to schedule shifts and track attendance." | Add employee |
| Reports | "No data for this range" | "Once you take orders, reports fill in automatically." | Change range |
| AI | "Insights unlock after 14 days" | "We need ~2 weeks of orders to spot patterns. 9 days to go." | — + progress bar |
| Scheduler | "No shifts this week" | "Copy last week or add shifts to get started." | Copy last week |
| Super customers | "No customers yet" | "Provision your first restaurant to get started." | New customer |

**Filtered-empty (data exists, filters hide it)** — different copy, different
CTA: "No items match 'panner'" + `[Clear filters]`. Never show a first-run CTA
to someone who just typed a search.

**Permission-empty** — "Your role doesn't include this" + who to ask. Not a lock
(that's for plans), because upgrading isn't the remedy.

### 13.2 Loading

- **Skeletons, never spinners, for known layouts.** Stat cards, table rows
  (7 rows), chart bodies (fixed height so nothing jumps), card grids.
- **Skeleton shape must match the real shape** — same heights, same column
  widths — or the page visibly reflows and feels slow even when it isn't.
- Inline spinners only for in-place actions (button `Saving…`, ≤ 3s expected).
- **Optimistic** for POS item add, qty steppers, status advances, toggles: apply
  instantly, reconcile silently, revert with a toast on failure. A cashier
  cannot wait 400ms per tap.
- Progress bar (determinate) for exports, imports, QR sheet generation.
- Reports > 3s: skeleton + "Crunching 42,000 orders…" so the wait is explained.

### 13.3 Errors

| Class | Treatment |
|---|---|
| Field validation | Inline under field, danger text + red border, focus first error, never a toast |
| Form submit | `Alert` at the top of the form, summarising, with anchors to fields |
| Card/widget | The card fails alone: inline `Alert` + `[Retry]`. One dead chart must not blank a dashboard |
| Whole screen | Full `EmptyState` in danger tone + `[Retry]` + `[Contact support]` |
| Offline | Persistent amber strip + queued-writes count + auto-retry chip |
| Destructive confirm | Dialog naming the object ("Suspend **Masala Bear**?") + consequence line + type-to-confirm for cancel/delete |
| Conflict | "Someone else changed this" + [Reload] / [Overwrite] with a diff |
| Payment failure (POS) | Never lose the ticket — keep it, show the error, offer another method |

**Toast policy:** success only, 3s, one line, with an action link where useful
("Order #142 saved · View"). Errors are never toast-only — a toast that
disappears is not an error message.

---

## 14. AI insight UX patterns

The AI module is the Enterprise differentiator; it lives or dies on trust.

### 14.1 `AIInsightCard` anatomy — fixed, every time

```
┌──────────────────────────────────────────────────────────────────┐
│ [severity dot] CATEGORY · MODULE      confidence · freshness  [⋯] │  1 meta
│ Title in one line, ≤ 60 chars                                     │  2 claim
│ Two sentences: what's happening, and why it matters — with the    │  3 insight
│ number bolded and the business consequence stated.                │
│ Based on 14 days · 3,240 orders   [ How we calculated ▾ ]         │  4 evidence
│ [ Primary action ]      [ Snooze ▾ ]      [ 👍 ] [ 👎 ]           │  5 action
└──────────────────────────────────────────────────────────────────┘
```

Five bands, always in this order. A card missing evidence (band 4) or an action
(band 5) does not ship — an insight you can't verify and can't act on is noise.

### 14.2 Severity → colour → verb

| Category | Dot | Verb in title | Example |
|---|---|---|---|
| Opportunity | 🔵 info | "could / consider" | "Butter Naan is under-attached" |
| Risk | 🟠 warning | "will / runs out" | "Paneer runs out in ~2 days" |
| Anomaly | 🔴 danger | "dropped / spiked" | "Wastage spiked 3× on Tuesday" |
| Win | 🟢 success | "up / beat" | "Weekend revenue up 18%" |

Colour is reinforced by the category word — never colour alone.

### 14.3 Trust mechanics (non-negotiable)

1. **Confidence chip** — High / Medium / Low, always shown. Hiding uncertainty
   is what makes users distrust the whole feature after one miss.
2. **"How we calculated this"** popover — plain-language method, the window, the
   sample size, and the assumption. Two sentences, not a model card.
3. **Freshness stamp** — "2h ago" + a manual `[↻]`. Stale advice about a live
   restaurant is worse than none.
4. **Never auto-execute.** AI proposes; a human approves. The primary action
   always opens the pre-filled destination — "Create purchase order · 40 kg"
   lands on `/inventory/purchases/new` with the item and quantity filled in and
   **editable**, one confirm away from done.
5. **Dismiss with a reason** — 👎 opens three chips (Not accurate · Not useful ·
   Already handled). This is the feedback loop, and users must see it change
   things: "We'll show fewer inventory insights."
6. **Snooze, don't just dismiss** — 7d / 30d / until it changes.
7. **No insight without a baseline.** Every number is stated against something:
   last period, peer benchmark, or forecast.

### 14.4 Where insights surface

| Surface | Treatment |
|---|---|
| `/ai` feed | Full cards, tabs by category, resolved history |
| Dashboard strip | One highest-severity card, collapsed to one line + count |
| Module-contextual | Inventory shows its own stock insights inline at the top of the list; Reports shows a "what changed" note under the chart |
| Notification bell | Only `Risk` and `Anomaly`, capped at 3/day. An AI that notifies constantly gets muted permanently |

### 14.5 The ask bar

Natural-language query with suggested prompts. Answer renders as: a one-sentence
answer, then the chart or table that supports it, then "Sources: Sales Aug 1–7,
Inventory ledger". **The chart is the answer's proof, not decoration.** If the
question can't be answered from the tenant's data, say exactly that and name
what's missing ("I'd need recipe mappings to answer this — set them up in
Inventory > Ingredients").

### 14.6 Progressive disclosure for non-Enterprise

Basic/Professional see one *real* insight per week on the dashboard, computed
from data they already have, with the rest blurred behind the upgrade CTA. A
free sample that's genuinely useful converts; a fake screenshot does not.

---

## 15. Build delta against the current repo

### 15.1 What exists today (`src/`)

Shipped and reusable as-is: `AppSidebar`, `TopHeader`, `TopNavBar`, `BottomNav`,
`StatCard`, `ChartCard`, `TableCard`, `MenuItemCard`, `OrderCard`,
`KitchenCard`, `QuantityStepper`, `StatusBadge`, `EmptyState`,
`LoadingSkeleton`, `PageHeader`, `charts.tsx`, plus 21 shadcn primitives.
Screens: super login/dashboard/restaurants/create/plans/settings; admin
login/dashboard/pos/tables/menu/orders/kitchen/reports/settings; customer
landing/menu/cart/success (table **and** counter); portals; QR board.
Infrastructure worth reusing rather than re-inventing:

- `hooks/use-platform-config.tsx` — super-admin flags, cross-tab sync. This is
  already 60% of `superOverride` (§5.1).
- `hooks/use-service-config.tsx` — per-tenant service prefs, same pattern.
- `hooks/use-appearance.tsx` + `lib/appearance.ts` — theme/nav-layout/dark-mode
  engine; the green re-token in §1.1 is a `:root` change, not a refactor.
- `lib/tax.ts`, `lib/currency.ts` — GST split and ₹ formatting; every new money
  surface (POS payment, purchases, payroll, revenue) must route through these.
- `lib/status.ts` — single source for status colour.

### 15.2 Suggested build order

| Phase | Ships | Why first |
|---|---|---|
| 1 | Green token swap · `TenantShell` · `FeatureGate` · `UpgradeDrawer` · `LimitDialog` · `PlanBadge` · `UsageMeter` | Nothing else can be gated correctly until these exist |
| 2 | `/billing` · super `/customers` + tenant detail + feature control | Closes the provisioning ↔ entitlement loop end to end |
| 3 | POS payment panel + split + receipt + offline queue | Completes the highest-value shipped module |
| 4 | Inventory (5 screens) + recipe mapping + auto-deduction ledger | Unlocks Profit reporting |
| 5 | Staff (5 screens) | Unlocks Labour reporting |
| 6 | Reports tabs (Profit, Labour, Inventory) | Payoff of phases 4–5 |
| 7 | Staff portal (`/crew/*`) | Needs roles from phase 5 |
| 8 | AI module + dashboard strip | Needs 14 days of the above |
| 9 | Super revenue · subscriptions · support | Scales with tenant count |

### 15.3 Decisions this document makes (flagged for sign-off)

1. **Primary green `#16A34A` replaces yellow** as the `:root` token set; yellow
   survives as a selectable theme. Affects every screenshot in v1.
2. **Plan ids rename** `starter/pro → basic/professional`, aliases retained.
3. **Staff portal should move to `/crew/*`** to avoid the `/staff` collision
   (§2.1). Documented both ways; recommendation is `/crew`.
4. **Locked-not-hidden** is the default gating stance for plan-gated modules.
5. **Read-only, not locked-out**, for expired/suspended tenants.
6. **AI never auto-executes** — every action is a pre-filled human confirmation.

*End of document.*
