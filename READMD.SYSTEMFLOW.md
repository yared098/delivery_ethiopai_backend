# 🚚 Deliver Ethiopia — Complete System Documentation

**A multi-region express delivery platform for Ethiopia.**

One backend. Three apps. One flow. Every requirement captured.

---

## 📋 Table of Contents

1. [System Overview](#1-system-overview)
2. [Roles & Hierarchy](#2-roles--hierarchy)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Authentication Model](#5-authentication-model)
6. [Sender Flow — Order Creation](#6-sender-flow--order-creation)
7. [Receiver Flow — Unknown Location](#7-receiver-flow--unknown-location)
8. [QR Code Flow — Courier Pickup & Delivery](#8-qr-code-flow--courier-pickup--delivery)
9. [Live Tracking Flow](#9-live-tracking-flow)
10. [Payment Flow](#10-payment-flow)
11. [API Reference](#11-api-reference)
12. [Database Schema](#12-database-schema)
13. [Security Model](#13-security-model)
14. [Notifications](#14-notifications)
15. [Roles & Permissions Matrix](#15-roles--permissions-matrix)
16. [Build Roadmap](#16-build-roadmap)

---

## 1. System Overview

### 1.1 Architecture

```
                    ┌──────────────────────────┐
                    │    NESTJS BACKEND        │
                    │  REST + WebSocket        │
                    │  PostgreSQL + PostGIS    │
                    │  Redis + Prisma          │
                    └────────┬─────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐          ┌─────────┐         ┌─────────┐
   │ CUSTOMER│          │ COURIER │         │  ADMIN  │
   │ MOBILE  │          │ MOBILE  │         │  WEB    │
   │ FLUTTER │          │ FLUTTER │         │  REACT  │
   ├─────────┤          ├─────────┤         ├─────────┤
   │ Sender  │          │ Driver  │         │ Super   │
   │ Receiver│          │ Accept  │         │ Admin   │
   │ Pay     │          │ Scan QR │         │ Regional│
   │ Track   │          │ GPS     │         │ Branch  │
   └─────────┘          └─────────┘         └─────────┘
```

### 1.2 Three Entry Points

| Platform | Users | Access |
|----------|-------|--------|
| **Customer Mobile App (Flutter)** | Senders & Receivers | Login, create order, track, pay |
| **Courier Mobile App (Flutter)** | Delivery drivers | Accept jobs, scan QR, stream GPS |
| **Admin Web Panel (React)** | Super/Regional/Branch Admins | Full management |
| **Public Web Pages (React)** | Anyone (no login) | Receiver link, tracking link |

### 1.3 Key Principle

**One account, any platform.** A user logs in with phone + OTP once. The same JWT works on mobile, web, Telegram, or when opening a receiver link.

---

## 2. Roles & Hierarchy

### 2.1 Federal Model (Bank-Like Structure)

```
┌───────────────────────────────────────────────┐
│  👑 SUPER ADMIN (Addis Ababa HQ)              │
│  - Creates regions                            │
│  - Creates Regional Admins                    │
│  - Manages payment providers                  │
│  - Sees all data nationally                   │
└──────────────────┬────────────────────────────┘
                   │ creates
     ┌─────────────┼─────────────┬─────────────┐
     ▼             ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Oromia  │  │ Amhara  │  │ Sidama  │  │ Tigray  │
│Region   │  │Region   │  │Region   │  │Region   │
│Admin    │  │Admin    │  │Admin    │  │Admin    │
└────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
     │ creates    │            │            │
     ▼            ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Branch  │  │ Branch  │  │ Branch  │  │ Branch  │
│Manager  │  │Manager  │  │Manager  │  │Manager  │
└────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
     │ creates    │            │            │
     ▼            ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Couriers│  │ Couriers│  │ Couriers│  │ Couriers│
└─────────┘  └─────────┘  └─────────┘  └─────────┘
```

### 2.2 Role Table

| Role | Created By | Login Method | Scope |
|------|-----------|--------------|-------|
| **SUPER_ADMIN** | Seed script | Phone + OTP only | Global |
| **REGIONAL_ADMIN** | Super Admin | Phone + Password + OTP | One region |
| **BRANCH_MANAGER** | Super or Regional Admin | Phone + Password + OTP | One branch |
| **COURIER** | Branch Manager + approval | Phone + Password + OTP | Assigned jobs |
| **CUSTOMER** | Self-register via app OR Admin | Phone + OTP | Own orders |

### 2.3 The Super Admin Exception

**Only Super Admin logs in with phone + OTP (no password).**

Everyone else:
- Password set by the admin who created them
- Login = Phone → Password → OTP → Logged in
- **Two-factor authentication built in**

---

## 3. Tech Stack

| Layer | Backend | Customer App | Courier App | Admin Panel |
|-------|---------|--------------|-------------|-------------|
| Framework | NestJS (Node 20) | Flutter | Flutter | React 18 + Vite |
| Language | TypeScript | Dart | Dart | TypeScript |
| State | - | Provider | Provider | Zustand |
| HTTP | Axios | Dio | Dio | Axios |
| Realtime | Socket.io Server | Socket.io Client | Socket.io Client | Socket.io Client |
| DB | PostgreSQL 16 + PostGIS | - | - | - |
| ORM | Prisma 5 | - | - | - |
| Cache | Redis 7 | - | - | - |
| Maps | - | flutter_map (OSM) | flutter_map | react-leaflet |
| QR | `qrcode` | qr_flutter | mobile_scanner | qr display |
| SMS | AfroMessage | - | - | - |
| Payments | Chapa, Telebirr | Chapa SDK | - | - |
| Push | FCM | FCM | FCM | Web Push |

---

## 4. Project Structure

```
deliver-ethiopia/
├── api/                          ← NestJS backend
│   ├── src/
│   │   ├── auth/
│   │   ├── admin/
│   │   ├── regions/
│   │   ├── branches/
│   │   ├── couriers/
│   │   ├── customers/
│   │   ├── orders/
│   │   ├── receiver-links/
│   │   ├── tracking/
│   │   ├── payments/
│   │   └── integrations/afromessage/
│   ├── prisma/schema.prisma
│   └── uploads/
│
├── admin/                        ← React admin panel
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   └── .env
│
├── mobile/                       ← Flutter customer app
│   ├── lib/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── home/
│   │   │   ├── send/
│   │   │   ├── orders/
│   │   │   ├── tracking/
│   │   │   ├── receiver/
│   │   │   └── profile/
│   │   └── core/
│   └── pubspec.yaml
│
├── courier-app/                  ← Flutter courier app
│   ├── lib/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── jobs/
│   │   │   ├── scan/
│   │   │   ├── navigation/
│   │   │   ├── earnings/
│   │   │   └── profile/
│   │   └── core/
│   └── pubspec.yaml
│
├── public-web/                   ← React receiver + tracking pages
│   └── src/
│       ├── pages/ReceiverLink.tsx
│       ├── pages/PublicTracking.tsx
│       └── pages/PublicQR.tsx
│
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md                     ← this file
```

---

## 5. Authentication Model

### 5.1 Super Admin Login

```
1. Enter phone: 0911111111
2. Server checks: role === SUPER_ADMIN ✅
3. Server sends OTP via SMS
4. Enter OTP → JWT issued
```

**No password. OTP is the only gate.**

### 5.2 Staff Login (Regional / Branch / Courier)

```
Step 1: Enter phone + password
        ↓
        Server verifies password (argon2)
        ↓
        Sends OTP to phone
        Returns { tempToken, requiresOtp: true }
        ↓
Step 2: Enter OTP + tempToken
        ↓
        Server verifies OTP
        Issues JWT
```

**Two-factor: password + OTP.**

### 5.3 Customer Login

```
Method A (Primary):
  Enter phone → Send OTP → Enter OTP → JWT issued

Method B (Google):
  Tap "Sign in with Google" → ID token → Server verifies → JWT

Method C (Telegram):
  Open via Telegram WebApp → initData → Server verifies HMAC → JWT

Method D (Deep Link):
  Receive SMS with receiver link
  → Tap → app opens → auto-verifies receiver phone → logged in
```

### 5.4 Token Model

| Token | Lifetime | Purpose | Storage |
|-------|----------|---------|---------|
| Access | 15 min | Authenticates API calls | Secure storage (mobile) / memory (web) |
| Refresh | 30 days | Get new access token | DB (hashed) + secure storage |

**Refresh rotation + reuse detection**: if old refresh used again, entire family revoked.

---

## 6. Sender Flow — Order Creation

### 6.1 Flow Diagram

```
SENDER opens app
       ↓
1. Create Order
   - Enter receiver phone + name
   - Enter items (name, weight, fragile flags)
   - Enter pickup location
   ↓
2a. Sender knows receiver address?
    YES → enter address + GPS
    NO  → tap "Send location link"
       ↓
3. Review + Choose payment (sender/receiver/split)
       ↓
4. Pay (Telebirr / Chapa / Cash)
       ↓
5. Order created → QR generated → Driver assigned
```

### 6.2 Create Order JSON

**Case A — Sender knows receiver address:**

```json
{
  "sender": {
    "name": "Almaz Tesfaye",
    "phone": "0911223344",
    "address": "Bole, Addis Ababa",
    "lat": 9.0192,
    "lng": 38.7525
  },
  "receiver": {
    "name": "Kebede Alemu",
    "phone": "0915566778",
    "address": "Adama, Oromia",
    "lat": 8.54,
    "lng": 39.27
  },
  "items": [
    {
      "description": "Books",
      "quantity": 1,
      "weightKg": 2,
      "isFragile": false
    }
  ],
  "paymentParty": "SENDER",
  "autoAssignCourier": true
}
```

**Case B — Sender doesn't know receiver address:**

```json
{
  "sender": { ... },
  "receiver": {
    "name": "Kebede Alemu",
    "phone": "0915566778"
    // NO address, lat, lng
  },
  "items": [...],
  "paymentParty": "SENDER",
  "sendReceiverLink": true   ← triggers link generation
}
```

### 6.3 Order States

```
DRAFT
  ↓
AWAITING_RECEIVER_LOCATION  ← when sendReceiverLink: true
  ↓ (receiver fills location)
PENDING_PAYMENT
  ↓
PAID
  ↓
ASSIGNED (courier picked)
  ↓
PICKED_UP (courier scans QR at pickup)
  ↓
IN_TRANSIT
  ↓
OUT_FOR_DELIVERY
  ↓
DELIVERED (courier scans QR at receiver)
```

---

## 7. Receiver Flow — Unknown Location

### 7.1 The Full Journey

```
SENDER creates order without receiver address
       ↓
SYSTEM generates one-time link
  • shortCode: "ABC123XY"
  • token: 32-hex random
  • expiresAt: now + 48h
  • URL: https://deliver.et/r/ABC123XY
       ↓
SMS sent to receiver phone:
  "Almaz sent you a package. Share your delivery location:
   https://deliver.et/r/ABC123XY"
       ↓
RECEIVER taps link
       ↓
   ┌────────────────────┬───────────────────┐
   │                    │                   │
   ▼                    ▼                   ▼
NO APP              HAS APP             HAS APP
Opens in browser    Opens via deep      Auto-login via
                    link                SMS link
   │                    │                   │
   └────────────────────┼───────────────────┘
                        ↓
              ┌──────────────────────┐
              │ Share location page  │
              │  [📍 Share my GPS]   │
              │  [🗺️ Enter manually] │
              └──────────┬───────────┘
                         ↓
              Browser captures GPS:
              { lat: 8.54, lng: 39.27, accuracy: 15 }
                         ↓
              OTP verification
              [ _ _ _ _ _ _ ]
                         ↓
              ┌──────────────────────┐
              │ BACKEND updates:     │
              │ • receiverLat/Lng    │
              │ • locationSource     │
              │ • status = PENDING_  │
              │   PAYMENT            │
              │ • mark link as USED  │
              └──────────┬───────────┘
                         ↓
              Order ready → driver auto-assigned
                         ↓
              Link switches to TRACKING MODE
```

### 7.2 Link Has Two Modes

**Same URL:** `https://deliver.et/r/ABC123XY`

| Link State | Page Shown |
|------------|------------|
| `status = ACTIVE` | "Share your location" form |
| `status = USED` | Live tracking view (read-only) |
| `status = EXPIRED` | "Link expired. Contact sender." |
| `status = REVOKED` | "Link no longer available" |

**Backend logic:**

```typescript
async handleReceiverLink(shortCode: string) {
  const link = await findByShortCode(shortCode);

  if (link.status === 'USED') {
    return { mode: 'tracking', order: link.order };
  }

  if (link.status === 'ACTIVE' && link.expiresAt > now) {
    return { mode: 'onboarding', order: link.order };
  }

  throw new GoneException('Link expired or revoked');
}
```

### 7.3 Deep Link Redirect

**SMS link:** `https://deliver.et/r/ABC123XY`

**If app installed:**
- Android → Intent Filter → app opens
- iOS → Universal Link → app opens

**If app NOT installed:**
- Mobile browser → mobile-friendly web page
- Works 100% without app

---

## 8. QR Code Flow — Courier Pickup & Delivery

### 8.1 QR Generation

```
Order created with complete info
       ↓
BACKEND generates:
  • trackingNumber: ETH-2026-A1B2C3
  • QR URL: https://deliver.et/q/ETH-2026-A1B2C3?s=a1b2c3
  • HMAC signature (6 chars)
  • QR image (PNG)
       ↓
STORED:
  • Order.qrCodePayload
  • Order.qrCodeSignature
  • Order.qrCodeImageUrl
       ↓
Sender can:
  • View QR on phone
  • Download printable label
  • Attach to package
```

### 8.2 What QR Contains

**Encoded in QR:**
```
https://deliver.et/q/ETH-2026-A1B2C3?s=a1b2c3
```

**Backend returns (on scan):**

```json
{
  "trackingNumber": "ETH-2026-A1B2C3",
  "origin": { "city": "Addis Ababa", "branch": "Bole Branch" },
  "destination": { "city": "Adama", "branch": "Adama Branch" },
  "receiver": { "name": "Kebede A.", "phoneMasked": "+2519****6778" },
  "weightKg": 3.0,
  "isFragile": true,
  "status": "ASSIGNED",
  "signature": "a1b2c3"
}
```

**Never in QR:**
- Full phone numbers
- Full addresses
- Payment details
- Sender ID

### 8.3 Courier Pickup Flow

```
DRIVER receives assignment in app
       ↓
Navigates to sender's location
       ↓
Arrives at pickup
       ↓
Opens courier app → "Scan QR at Pickup"
       ↓
Camera scans package QR
       ↓
App sends:
  POST /courier/orders/scan-pickup
  { qrPayload, lat, lng }
       ↓
BACKEND verifies:
  ✓ HMAC signature valid
  ✓ Order exists
  ✓ Courier is assigned to this order
  ✓ Order status = ASSIGNED
  ✓ GPS matches pickup (within 500m)
       ↓
BACKEND updates:
  • Order.status = PICKED_UP
  • Order.pickedUpAt = now
  • Order.pickedUpByCourierId
  • Creates CourierEarning (PENDING)
  • Creates OrderEvent (isPublic: true)
       ↓
BROADCASTS via WebSocket:
  • Sender gets notified
  • Receiver gets notified
       ↓
DRIVER departs
```

### 8.4 Courier Delivery Flow

```
DRIVER arrives at receiver's location
       ↓
Notification: "Driver at your door" (proximity < 20m)
       ↓
DRIVER opens app → "Scan QR at Delivery"
       ↓
   ┌────────────────────┬─────────────────────┐
   │                    │                     │
   ▼                    ▼                     ▼
Driver scans        Receiver scans       Both scan
receiver's phone    driver's screen      (dual verify)
   │                    │                     │
   └────────────────────┼─────────────────────┘
                        ↓
       BACKEND verifies QR again
                        ↓
       RECEIVER confirms receipt
       (OTP or signature)
                        ↓
       BACKEND updates:
         • Order.status = DELIVERED
         • Order.deliveredAt = now
         • CourierEarning status = RELEASED
         • DeliveryProof created
                        ↓
       NOTIFIES:
         • Sender: "Delivered ✅"
         • Receiver: "Enjoy!"
         • Courier: "Earning +147 ETB"
```

### 8.5 QR Security

| Layer | Protection |
|-------|-----------|
| HMAC signature | Cannot forge QR |
| Courier auth required | Only assigned courier |
| GPS validation | Must be within 500m |
| One-time per transition | Cannot reuse |
| Server-side verification | Never trust client |
| Rate limiting | Prevents brute force |

---

## 9. Live Tracking Flow

### 9.1 Courier GPS Streaming

```
DRIVER app (background):
  Every 15 seconds:
    POST /courier/orders/:id/location
    { lat, lng }
       ↓
BACKEND:
  • Updates Courier.currentLat/Lng
  • Updates Order.lastCourierLat/Lng
  • Calculates distance to receiver
  • Calculates ETA (30 km/h avg)
       ↓
BROADCASTS via WebSocket:
  Room: order:{orderId}
  Event: 'location:update'
  Payload: { lat, lng, distance, eta, timestamp }
       ↓
SUBSCRIBERS receive:
  • Sender's app
  • Receiver's app (or browser)
  • Admin panel
       ↓
All show live map with moving courier
```

### 9.2 Proximity Alerts

```
BACKEND checks after each GPS update:

distance < 2000m → "Courier nearby" (yellow)
distance < 500m  → "5 minutes away" (blue)
distance < 100m  → "Arriving now" (orange)
distance < 20m   → "At your door" (green, sound)
```

**Each alert sent via:**
- WebSocket (for apps watching live)
- Push notification (FCM)
- SMS (for critical alerts)

### 9.3 Public Tracking (No Login)

```
Sender/Receiver share link:
  https://deliver.et/t/{trackingToken}?s={signature}
       ↓
ANYONE opens link (browser or app)
       ↓
Public page loads:
  • Order status badge
  • Live map with courier
  • Distance + ETA
  • Timeline of events
  • Masked names/phones
       ↓
Auto-subscribes to WebSocket
       ↓
Updates every few seconds
```

**Security:**
- 32-char random token
- HMAC signature
- 90-day expiry
- Revocable
- Data masking
- Rate limited (30 req/min/IP)
- Audit logged

---

## 10. Payment Flow

### 10.1 Who Pays?

| Payment Mode | Description | Use Case |
|--------------|-------------|----------|
| `SENDER` | Sender pays delivery fee | Gift, documents |
| `RECEIVER` | Receiver pays (COD) | Freight, B2B |
| `SPLIT` | Custom split | Negotiated |
| `PREPAID` | Sender paid online | E-commerce |

### 10.2 Payment Methods

| Provider | Type | Integration |
|----------|------|-------------|
| **Telebirr** | Mobile money | SDK + API |
| **Chapa** | Card + wallet | Redirect + webhook |
| **CBE Birr** | Bank wallet | API |
| **Cash** | On delivery | Manual record |
| **Bank Transfer** | Manual | Admin confirms |

### 10.3 Payment Flow

```
Order created
       ↓
Payment party determined (SENDER/RECEIVER)
       ↓
   ┌───────────────────┬──────────────────┐
   │                   │                  │
   ▼                   ▼                  ▼
Online pay          COD               Cash
   ↓                   ↓                  ↓
Chapa/Telebirr     Receiver pays     Courier collects
redirect           at delivery       at delivery
   ↓                   ↓                  ↓
Webhook confirms    Mark paid          Mark paid
   ↓                   ↓                  ↓
Order.status = PAID
       ↓
Courier assignment triggers
```

### 10.4 Courier Earning

```
Courier earns 60% of delivery fee
Platform keeps 40%

Example:
  Delivery fee: 245 ETB
  Courier: 147 ETB (60%)
  Platform: 98 ETB (40%)
```

**Earning states:**
```
PENDING   → order in progress
RELEASED  → order delivered, ready to pay
PAID      → payout processed
CANCELLED → order cancelled
```

**Payout cycle:**
- Weekly / bi-weekly
- Batch all RELEASED earnings
- Process via Telebirr / bank
- Mark as PAID

---

## 11. API Reference

### 11.1 Auth

| Method | Endpoint | Auth | Purpose |
|--------|----------|:-:|---------|
| POST | `/auth/super-admin/otp/request` | ❌ | Super admin OTP |
| POST | `/auth/super-admin/otp/verify` | ❌ | Super admin login |
| POST | `/auth/staff/login` | ❌ | Staff step 1 (password) |
| POST | `/auth/staff/login/verify` | ❌ | Staff step 2 (OTP) |
| POST | `/auth/customer/otp/request` | ❌ | Customer OTP |
| POST | `/auth/customer/otp/verify` | ❌ | Customer login |
| POST | `/auth/courier/otp/request` | ❌ | Courier OTP |
| POST | `/auth/courier/otp/verify` | ❌ | Courier login |
| POST | `/auth/refresh` | ❌ | Refresh token |
| POST | `/auth/logout` | ❌ | Logout |

### 11.2 Customer

| Method | Endpoint | Auth | Purpose |
|--------|----------|:-:|---------|
| POST | `/customer/orders` | ✅ | Create order |
| GET | `/customer/orders` | ✅ | My orders (sent+received) |
| GET | `/customer/orders/:id` | ✅ | Order detail |
| POST | `/customer/orders/:id/pay` | ✅ | Initiate payment |
| POST | `/customer/orders/:id/share` | ✅ | Share tracking link |

### 11.3 Public (No Login)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/public/track/:token` | Tracking view |
| GET | `/r/:shortCode` | Receiver link lookup |
| POST | `/r/:shortCode/otp/request` | Send OTP |
| POST | `/r/:shortCode/otp/verify` | Verify OTP |
| POST | `/r/:shortCode/complete` | Save GPS + complete |
| GET | `/public/qr/:trackingNumber` | QR scan info |
| POST | `/public/qr/:trackingNumber/verify` | Verify QR |

### 11.4 Courier

| Method | Endpoint | Auth | Purpose |
|--------|----------|:-:|---------|
| GET | `/courier/orders?status=ACTIVE` | ✅ | My jobs |
| POST | `/courier/orders/:id/accept` | ✅ | Accept |
| POST | `/courier/orders/:id/reject` | ✅ | Reject |
| POST | `/courier/orders/:id/scan-pickup` | ✅ | QR at pickup |
| POST | `/courier/orders/:id/location` | ✅ | GPS stream |
| POST | `/courier/orders/:id/scan-deliver` | ✅ | QR at delivery |
| POST | `/courier/orders/:id/fail` | ✅ | Failed |
| GET | `/courier/earnings` | ✅ | Earnings |

### 11.5 Admin

| Method | Endpoint | Auth | Roles |
|--------|----------|:-:|-------|
| POST | `/admin/regions` | ✅ | SUPER |
| GET | `/admin/regions` | ✅ | SUPER |
| POST | `/admin/branches` | ✅ | SUPER, REGIONAL |
| POST | `/admin/staff/regional-admin` | ✅ | SUPER |
| POST | `/admin/staff/branch-manager` | ✅ | SUPER, REGIONAL |
| POST | `/admin/couriers` | ✅ | SUPER, REGIONAL, BRANCH |
| POST | `/admin/orders` | ✅ | SUPER, REGIONAL, BRANCH |
| POST | `/admin/orders/:id/assign-courier` | ✅ | SUPER, REGIONAL, BRANCH |
| POST | `/admin/orders/:id/auto-assign` | ✅ | SUPER, REGIONAL, BRANCH |
| POST | `/admin/orders/:id/unassign-courier` | ✅ | SUPER, REGIONAL |
| POST | `/admin/orders/:id/send-receiver-link` | ✅ | SUPER, REGIONAL, BRANCH |
| POST | `/admin/orders/:id/revoke-tracking` | ✅ | SUPER, REGIONAL, BRANCH |
| POST | `/admin/payment-providers` | ✅ | SUPER |

### 11.6 WebSocket Events

**Namespace:** `/tracking`

| Direction | Event | Payload |
|-----------|-------|---------|
| → Server | `order:subscribe` | `{ orderId }` |
| → Server | `order:subscribe-public` | `{ trackingToken, signature }` |
| ← Client | `location:update` | `{ lat, lng, distance, eta, timestamp }` |
| ← Client | `status:change` | `{ status, note, timestamp }` |
| ← Client | `proximity:alert` | `{ level, distance, message }` |
| ← Client | `order:event` | `{ event }` |
| ← Client | `order:end` | `{ outcome, message }` |

---

## 12. Database Schema

### 12.1 Models

```
Staff         → Super/Regional/Branch admins
Courier       → Drivers
Customer      → Senders + Receivers
Region        → Ethiopian regions (Oromia, Amhara, etc.)
Branch        → Cities within regions
Order         → Delivery orders
OrderItem     → Items within an order
OrderEvent    → Audit trail + public feed
ReceiverLink  → One-time receiver onboarding
Payment       → Payment records
PaymentProvider → Telebirr, Chapa, etc.
CourierEarning → Per-order courier earnings
Payout        → Batch payouts
RefreshToken  → Session management
OtpCode       → OTP verification
TrackingView  → Public tracking audit
```

### 12.2 Key Relationships

```
Region 1─N Branch
Branch 1─N Staff
Branch 1─N Courier
Region 1─N Courier
Order N─1 Customer (sender)
Order N─1 Customer (receiver)
Order N─1 Courier
Order N─1 Branch (origin)
Order N─1 Branch (destination)
Order 1─N OrderItem
Order 1─N OrderEvent
Order 1─N ReceiverLink
Order 1─N Payment
Order 1─N CourierEarning
Courier 1─N Payout
```

### 12.3 Migration Command

```bash
pnpm prisma migrate dev --name <description>
pnpm prisma generate
```

---

## 13. Security Model

### 13.1 Defense in Depth

| Layer | Protection |
|-------|-----------|
| **Network** | HTTPS, HSTS, rate limit |
| **Application** | Helmet, CORS, CSP |
| **Auth** | JWT + refresh rotation |
| **Password** | argon2 hashing |
| **OTP** | argon2 hash, 5-min expiry, 3 attempts |
| **Receiver link** | Signed token, OTP lock, single-use, 48h expiry |
| **Tracking link** | 32-hex token, HMAC, mask data, revocable |
| **QR** | HMAC signature, courier check, GPS validation |
| **Data** | Region-scoped queries, role checks |
| **Audit** | Every action logged |

### 13.2 Super Admin Exception

**Rule:** Only Super Admin uses OTP-only login. Everyone else needs password + OTP.

**Why:** Super Admin is the bootstrap account. Adding a password would mean another secret to leak.

### 13.3 Data Masking Rules

On **public** pages (tracking links, receiver links):

| Data | Shown |
|------|-------|
| Name | `Almaz T.` (first + initial) |
| Phone | `+2519****6778` (masked) |
| Address | City only |
| GPS | Only when IN_TRANSIT |
| Payment | Never |

---

## 14. Notifications

### 14.1 Channels

| Channel | When | Provider |
|---------|------|----------|
| **SMS** | OTP, receiver link, critical alerts | AfroMessage |
| **Push** | Status changes, proximity | FCM |
| **Telegram** | Bot commands, tracking | Telegraf |
| **WhatsApp** | Optional future | WhatsApp Business |
| **WebSocket** | Live updates on open apps | Socket.io |

### 14.2 Notification Matrix

| Event | Sender | Receiver | Courier |
|-------|:-:|:-:|:-:|
| Order created | Push | SMS | - |
| Receiver link sent | - | SMS | - |
| Receiver shared location | Push | - | - |
| Courier assigned | Push | Push | Push |
| Picked up | Push | Push | - |
| In transit | - | Push | - |
| Nearby (2km) | - | Push | - |
| Arriving (500m) | - | Push + SMS | - |
| At door (20m) | - | Push + sound | - |
| Delivered | Push + SMS | Push | Push + Earning |
| Failed | Push | Push | Push |

---

## 15. Roles & Permissions Matrix

### 15.1 Sidebar Visibility (Admin Panel)

| Menu | Super | Regional | Branch |
|------|:-:|:-:|:-:|
| Dashboard | ✅ | ✅ | ✅ |
| Regions | ✅ | ❌ | ❌ |
| Branches | ✅ | ✅ | ❌ |
| Staff | ✅ | ✅ | ❌ |
| Couriers | ✅ | ✅ | ✅ |
| Customers | ✅ | ✅ | ✅ |
| Orders | ✅ | ✅ | ✅ |
| Payment Providers | ✅ | ❌ | ❌ |

### 15.2 API Permission Matrix

| Endpoint | Super | Regional | Branch | Courier | Customer |
|----------|:-:|:-:|:-:|:-:|:-:|
| Create region | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create branch | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create staff | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create courier | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create order | ✅ | ✅ | ✅ | ❌ | ✅ |
| Assign courier | ✅ | ✅ | ✅ | ❌ | ❌ |
| Scan QR pickup | ❌ | ❌ | ❌ | ✅ | ❌ |
| Scan QR deliver | ❌ | ❌ | ❌ | ✅ | ❌ |
| View own orders | - | - | - | ✅ | ✅ |
| View all orders | ✅ | ✅ (region) | ✅ (branch) | ❌ | ❌ |

### 15.3 Region Scoping

| Role | Data Access |
|------|------------|
| Super Admin | All data |
| Regional Admin | Only their region |
| Branch Manager | Only their branch |
| Courier | Only assigned orders |
| Customer | Only own orders (sent + received) |

**Enforced via:** `@StaffRoles()` guard + `regionId` filter in every query.

---

## 16. Build Roadmap

### Phase 1 — Backend Foundation (Weeks 1-2)
- [x] NestJS + Prisma + PostgreSQL setup
- [x] Auth module (OTP + JWT + Google)
- [x] Staff/Courier/Customer split
- [x] Region + Branch CRUD
- [x] Payment providers

### Phase 2 — Core Business (Weeks 3-4)
- [x] Order creation
- [x] Items management
- [x] Courier assignment (auto + manual)
- [x] Receiver links
- [ ] SMS integration (AfroMessage)
- [ ] Public receiver API

### Phase 3 — QR + Tracking (Week 5)
- [ ] QR generation (HMAC)
- [ ] QR scan endpoints
- [ ] Live GPS tracking (WebSocket)
- [ ] Proximity alerts
- [ ] Public tracking page

### Phase 4 — Customer App (Weeks 6-7)
- [ ] Flutter project setup
- [ ] Auth flow (OTP + Google)
- [ ] Home + Orders list
- [ ] Send package (4-step)
- [ ] Track order (live map)
- [ ] Payment integration
- [ ] Chat + notifications

### Phase 5 — Courier App (Weeks 8-9)
- [ ] Flutter courier app
- [ ] Auth + job list
- [ ] QR scanner
- [ ] GPS streaming
- [ ] Delivery proof
- [ ] Earnings dashboard

### Phase 6 — Polish (Week 10)
- [ ] Amharic translations
- [ ] Testing on real networks
- [ ] Production deployment
- [ ] Analytics + monitoring

**Total: ~10 weeks for full MVP.**

---

## 📞 Quick Commands

### Start Backend
```bash
cd api
docker compose up -d
pnpm install
pnpm prisma migrate dev
pnpm run seed:super-admin
pnpm run start:dev
```

### Start Admin Panel
```bash
cd admin
pnpm install
pnpm run dev
```

### Start Customer App
```bash
cd mobile
flutter pub get
flutter run
```

### Start Courier App
```bash
cd courier-app
flutter pub get
flutter run
```

---

## 🔗 Related Repos

| Repo | Purpose |
|------|---------|
| `delivery_ethiopia_backend` | NestJS API |
| `delivery_ethiopia_admin` | React admin panel |
| `delivery_ethiopia_mobile` | Flutter customer app |
| `delivery_ethiopia_courier` | Flutter courier app |
| `delivery_ethiopia_public` | Public receiver + tracking pages |

---

## 📄 License

MIT © 2026 Deliver Ethiopia

---

**Last Updated:** 2026-09-22
**Version:** 1.0.0