# Phase 2 Backend API Reference

CMPE-131 group project — Travel Agent SaaS Platform ("The Thrifty Backpacker" scenario).

This document describes every backend endpoint implemented in Phase 2. The team built two API groups defined by the Phase 2 spec:

- **Group 1 — Search APIs:** flights, accommodations, activities, trip recommendations, tenant branding
- **Group 2 — Booking & Persistence APIs:** bookings (create, list, get, cancel) backed by SQLite via Sequelize

Live Swagger UI is available at `http://localhost:3000/api-docs` once the server is running.

---

## Quick Start

```bash
cd phase2-backend/phase2-backend
npm install
cp .env.example .env       # then edit JWT_SECRET inside .env
node seed.js               # creates database.sqlite with 3 tenants, 3 users
npm run dev                # starts server on http://localhost:3000
```

**Seeded login credentials** (all use password `password123`):

| Tenant | Email | tenantDomain |
|---|---|---|
| Agency A (blue theme) | `violet@agency-a.com` | `agency-a.com` |
| Agency B (green theme) | `user@agency-b.com` | `agency-b.com` |
| Agency C (no theme — tests AC 4.3 fallback) | `user@agency-c.com` | `agency-c.com` |

---

## Authentication

The booking endpoints require a JWT. Get one from `/api/auth/login` and send it as `Authorization: Bearer <token>` on every protected call.

### `POST /api/auth/signup`

Register a new user under a specific tenant.

**Body:**
```json
{
  "email": "new@agency-a.com",
  "password": "test123",
  "name": "Test User",
  "tenantDomain": "agency-a.com"
}
```

**Response 201:**
```json
{
  "token": "eyJhbGci...",
  "user": { "id": 4, "email": "new@agency-a.com", "name": "Test User", "tenantId": 1 }
}
```

**Errors:** `400` missing fields or unknown `tenantDomain`. `409` email already registered for that tenant.

### `POST /api/auth/login`

Verify credentials and receive a JWT (24-hour expiry).

**Body:**
```json
{
  "email": "violet@agency-a.com",
  "password": "password123",
  "tenantDomain": "agency-a.com"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGci...",
  "user": { "id": 1, "email": "violet@agency-a.com", "name": "Violet Backpacker", "tenantId": 1 }
}
```

**Errors:** `400` missing fields. `401 "Invalid credentials"` for any failure (does not disclose whether email or password was wrong — by design).

The JWT payload contains `{ userId, tenantId }` — every protected endpoint reads `tenantId` from this signed claim, never from the request body.

---

## Search APIs (Group 1)

### `GET /api/flights/search`

Returns flights matching the destination and dates. Optional `budget` caps results to flights `<= budget`.

**Query params:** `destination` (IATA, e.g. `LON`), `departDate` (YYYY-MM-DD), `returnDate`, `travelers` (int), `budget` (number, optional).

**Example:**
```bash
curl "http://localhost:3000/api/flights/search?destination=LON&departDate=2026-06-10&returnDate=2026-06-17&travelers=1"
```

**Response 200:**
```json
{
  "results": [
    {
      "flightId": "FL001",
      "airline": "Budget Air",
      "departureAirport": "SFO",
      "arrivalAirport": "LON",
      "departDate": "2026-06-10",
      "returnDate": "2026-06-17",
      "travelers": 1,
      "price": 620,
      "currency": "USD"
    }
  ],
  "count": 1,
  "message": "Flights found"
}
```

### `GET /api/accommodations/search`

Returns accommodations for the destination, with `nights` and `totalPrice` computed from check-in/check-out.

**Query params:** `destination`, `checkIn`, `checkOut`, `guests`, `budget` (optional cap on total).

**Example:**
```bash
curl "http://localhost:3000/api/accommodations/search?destination=LON&checkIn=2026-06-10&checkOut=2026-06-17&guests=1"
```

### `GET /api/activities/search`

Returns activities filtered by an optional price bucket.

**Query params:** `destination`, `priceFilter` (one of `free`, `under25`, `25to75`, `75plus`).

**Example — return only free activities (TC-04):**
```bash
curl "http://localhost:3000/api/activities/search?destination=LON&priceFilter=free"
```

Each result includes a `priceLabel` (e.g. `"Free"` or `"$22"`).

### `GET /api/trips/recommendations`

**This is the core Phase-1 budget aggregation feature (AC 1.2, AC 1.3, AC 1.4, TC-01, TC-02).** Combines every flight × every matching accommodation, computes the combined total, filters to combos `<= budget`, and sorts cheapest first.

**Query params:** `destination`, `departDate`, `returnDate`, `travelers`, `guests`, `budget` (all required).

**Example — TC-01 happy path:**
```bash
curl "http://localhost:3000/api/trips/recommendations?destination=LON&departDate=2026-06-10&returnDate=2026-06-17&travelers=1&guests=1&budget=1500"
```

**Response 200 (combos found):** array of `{ flight, accommodation, flightCost, accommodationCost, combinedTotal, budget, remainingBudget, ... }` objects. Cheapest combo first.

**Response 200 (TC-02 sad path, budget too small):**
```json
{ "results": [], "count": 0, "message": "No trips found within $50." }
```

**Errors:** `400` for missing params, non-numeric budget, budget out of `$1–$100,000`, or `returnDate <= departDate`.

### `GET /api/tenants/{domain}/branding`

Returns the tenant's logo and theme color. Used by the frontend to render per-tenant branding (US-4 / TC-08).

**Example:**
```bash
curl "http://localhost:3000/api/tenants/agency-a.com/branding"
```

**Response 200:** `{ "name": "Agency A", "logoUrl": "...", "themeColor": "#0066cc" }`. For tenants without configured branding (e.g. Agency C), `logoUrl` is `null` and `themeColor` falls back to `#0057b8` so the UI never breaks (AC 4.3).

**Errors:** `404` if `domain` is unknown.

---

## Booking APIs (Group 2)

All four booking endpoints require `Authorization: Bearer <token>`. The `tenantId` for every operation comes from the JWT — request bodies and URL paths cannot override it. Cross-tenant access returns `404` (not `403`) to avoid leaking row existence (TC-07).

### `POST /api/bookings`

Create a booking. The server computes `totalAmount` from the cached flight price plus accommodation `pricePerNight × nights`. The client never sends a price.

**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`

**Body:**
```json
{
  "flightId": "FL001",
  "accommodationId": "AC001",
  "startDate": "2026-06-10",
  "endDate": "2026-06-17"
}
```

At least one of `flightId` or `accommodationId` is required.

**Response 201:**
```json
{
  "booking": {
    "id": 1,
    "tenantId": 1,
    "userId": 1,
    "flightId": "FL001",
    "accommodationId": "AC001",
    "totalAmount": 865,
    "startDate": "2026-06-10",
    "endDate": "2026-06-17",
    "status": "Pending",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Errors:** `400` for missing dates, invalid date range, missing IDs, or unknown flight/accommodation. `401` for missing or invalid JWT.

### `GET /api/bookings`

List bookings belonging to the authenticated user within their tenant. Other tenants' bookings are never returned — this is the multi-tenant isolation guarantee (TC-07).

**Headers:** `Authorization: Bearer <token>`

**Response 200:** `{ "results": [Booking, ...], "count": N }`. Empty array if the user has no bookings.

### `GET /api/bookings/{id}`

Fetch a single booking by ID. The lookup is scoped to the caller's `tenantId`; if the booking exists but belongs to another tenant, the response is `404` (same as if the ID didn't exist at all).

**Headers:** `Authorization: Bearer <token>`

**Response 200:** `{ "booking": {...} }`

**Errors:** `404 "Booking not found"` (not in caller's tenant or doesn't exist). `401` for missing or invalid JWT.

### `PATCH /api/bookings/{id}/cancel`

Set a booking's `status` to `"Cancelled"`. Same tenant-scoping rules as `getById` — only the owning tenant can cancel.

**Headers:** `Authorization: Bearer <token>`

**Response 200:** `{ "booking": {...} }` with `status: "Cancelled"`.

**Errors:** `404` if the booking isn't in the caller's tenant. `401` for missing or invalid JWT.

---

## Booking Lifecycle

`Booking.status` is an ENUM with three values from the Phase-1 spec § 3.3:

| Status | When set |
|---|---|
| `Pending` | Default on `POST /api/bookings`. |
| `Confirmed` | Reserved for future "confirm payment" flow (not implemented in Phase 2). |
| `Cancelled` | Set by `PATCH /api/bookings/{id}/cancel`. |

---

## Common Error Format

All error responses use the same shape:

```json
{ "message": "Human-readable reason" }
```

| Status | Meaning |
|---|---|
| `400` | Bad request — missing fields, validation failure, malformed body. |
| `401` | Authentication missing, malformed, or invalid (booking endpoints). Login failures also return `401`. |
| `404` | Resource not found. Also returned for cross-tenant booking access (intentional, see TC-07). |
| `409` | Conflict — e.g. signing up with an email that already exists in the same tenant. |
| `500` | Server error. Check server logs. |

---

## Database Schema

SQLite via Sequelize ORM. Five tables, scoped for multi-tenancy:

- `Tenants` — id, name, domain (unique), logoUrl, themeColor
- `Users` — id, **tenantId (FK)**, email, passwordHash, name, role. Unique on `(tenantId, email)`.
- `Flights` — id, airline, departureAirport, arrivalAirport, departDate, returnDate, price (cache table)
- `Accommodations` — id, name, location, pricePerNight (cache table)
- `Bookings` — id, **tenantId (FK)**, **userId (FK)**, flightId, accommodationId, totalAmount, startDate, endDate, **status** ENUM(`Pending`, `Confirmed`, `Cancelled`)

Seed script (`node seed.js`) drops all tables and recreates 3 tenants, 1 user per tenant, plus the cache tables populated from `data/flights.json` and `data/accommodations.json`.

---

## Phase-1 Traceability

| User Story / AC / TC | Endpoint(s) |
|---|---|
| US-1 / AC 1.2, 1.3, 1.4, 1.5 / TC-01, TC-02, TC-03 | `GET /api/trips/recommendations` |
| US-2 / AC 2.1, 2.2, 2.4 / TC-04 | `GET /api/activities/search` (with `priceFilter`) |
| US-3 / AC 3.x / TC-05, TC-06 | Frontend logic on top of bookings + trips endpoints |
| US-4 / AC 4.1, 4.3 / TC-08 | `GET /api/tenants/{domain}/branding` |
| US-4 / AC 4.2 / TC-07 | All `/api/bookings/*` endpoints (tenant guard via JWT) |
| Phase-1 § 3.3 Persistence + status lifecycle | `POST /api/bookings`, `PATCH /api/bookings/{id}/cancel` |
| Phase-1 § 3.4 JWT auth | `POST /api/auth/signup`, `POST /api/auth/login` |
