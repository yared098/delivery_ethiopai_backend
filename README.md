# Deliver Ethiopia — Backend API 🚚

Backend API for a multi-region express delivery platform in Ethiopia.

Built for scale: federal-region hierarchy, OTP-verified users, QR-tracked packages, and live courier tracking.

---

## 📦 Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 10 + TypeScript |
| Database | PostgreSQL 16 + PostGIS |
| Cache / Queue | Redis 7 |
| ORM | Prisma 5 |
| Auth | Phone OTP + JWT (access + refresh) + Google OAuth |
| SMS Gateway | AfroMessage (Ethiopia) |
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Package Manager | pnpm 9 |

---

## 👥 Roles

```
SUPER_ADMIN      → Manages entire country, creates regions & regional admins
REGIONAL_ADMIN   → Manages one region (Oromia, Amhara, Sidama, etc.)
BRANCH_MANAGER   → Manages a branch (city-level)
COURIER          → Delivers packages
CUSTOMER         → Sends / receives packages
```

---

## 🚀 Quick Start

### Requirements

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- Docker + Docker Compose

### Setup

```bash
# 1. Clone
git clone https://github.com/yared098/delivery_ethiopai_backend.git
cd delivery_ethiopai_backend

# 2. Install dependencies
pnpm install

# 3. Setup environment
cp .env.example .env
# Edit .env — set DATABASE_URL, REDIS_URL, JWT secrets

# 4. Start databases
docker compose up -d

# 5. Run migrations
npx prisma migrate dev

# 6. Generate Prisma client
npx prisma generate

# 7. Seed Super Admin
pnpm run seed:super-admin

# 8. Start dev server
pnpm run start:dev
```

API runs at **`http://localhost:3000/api/v1`**

---

## 🔑 Environment Variables

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://deliver:deliver_secret@localhost:5433/deliver?schema=public
REDIS_URL=redis://localhost:6380

JWT_ACCESS_SECRET=<64+ char secret>
JWT_REFRESH_SECRET=<different 64+ char secret>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=3
OTP_RATE_LIMIT_PER_10MIN=3

AFROMESSAGE_TOKEN=
AFROMESSAGE_SENDER=DELIVER

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

SUPER_ADMIN_PHONE=0911111111
SUPER_ADMIN_NAME=Super Admin
```

**Generate JWT secrets:**
```bash
openssl rand -hex 32
```

---

## 🧪 API Endpoints — Auth

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/api/v1/auth/otp/request` | Public | Send OTP to phone |
| POST | `/api/v1/auth/otp/verify` | Public | Verify OTP → JWT tokens |
| POST | `/api/v1/auth/google` | Public | Login with Google ID token |
| POST | `/api/v1/auth/link-phone/request` | Bearer | Request OTP to link phone |
| POST | `/api/v1/auth/link-phone/verify` | Bearer | Verify + link phone |
| POST | `/api/v1/auth/refresh` | Public | Refresh access token |
| POST | `/api/v1/auth/logout` | Public | Revoke current session |
| POST | `/api/v1/auth/logout-all` | Bearer | Revoke all sessions |
| GET | `/api/v1/users/me` | Bearer | Current user info |

### Example Flow

```bash
# 1. Request OTP
curl -X POST http://localhost:3000/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone":"0911111111"}'
# → { "message": "OTP sent successfully" }
# In dev, OTP prints to server console: [DEV] OTP for 251911111111: 123456

# 2. Verify OTP
curl -X POST http://localhost:3000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone":"0911111111","code":"123456"}'
# → { user, accessToken, refreshToken }

# 3. Use access token
curl http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer <accessToken>"
```

---

## 🔐 Security

- ✅ OTP hashed with **argon2** — never stored plaintext
- ✅ OTP expiry: **5 minutes** · Max attempts: **3**
- ✅ OTP rate limit: **3 per 10 minutes** per phone (Redis-backed)
- ✅ Access token: **15 minutes**
- ✅ Refresh token: **30 days**, stored **hashed** in DB
- ✅ Refresh rotation + **reuse detection** → entire token family revoked on theft
- ✅ Global `JwtAuthGuard` — every route requires JWT unless `@Public()`
- ✅ Role-based access control (RBAC) with `@Roles()` decorator
- ✅ Region-scoped queries for multi-tenant isolation
- ✅ Helmet, CORS, class-validator input sanitization

---

## 🗄️ Database Models

```
User              → phone, email, googleId, role, regionId, branchId, telegramId
Region            → name, code (Oromia, Amhara, Sidama...)
Branch            → belongs to Region, has lat/lng
OtpCode           → hashed OTP, expiry, attempts, purpose
RefreshToken      → hashed token, family (for rotation), revokedAt
```

---

## 📁 Project Structure

```
src/
├── main.ts
├── app.module.ts
├── common/
│   ├── decorators/     @Public @CurrentUser @Roles
│   ├── guards/         JwtAuthGuard RolesGuard
│   └── filters/        GlobalExceptionFilter
├── prisma/             PrismaModule, PrismaService
├── integrations/
│   └── afromessage/    SMS OTP sender
├── users/              User CRUD
└── auth/
    ├── auth.controller.ts
    ├── auth.service.ts
    ├── otp.service.ts
    ├── token.service.ts
    ├── google.service.ts
    ├── jwt.strategy.ts
    └── dto/
```

---

## 🐳 Docker

### Development databases only

```bash
docker compose up -d
```

Runs PostgreSQL (port **5433**) + Redis (port **6380**).

### Full stack (production)

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Build API image

```bash
docker build -t deliver-api ./api
```

---

## 🔄 CI/CD

GitHub Actions workflows:

- **`.github/workflows/ci.yml`** — Lint + build on every push and PR
- **`.github/workflows/cd.yml`** — Build Docker image, push to GitHub Container Registry on `main`

---

## 📜 Scripts

```bash
pnpm run start:dev           # Dev server with watch
pnpm run start:prod          # Production server
pnpm run build               # Compile to dist/
pnpm run prisma:generate     # Regenerate Prisma client
pnpm run prisma:migrate      # Run new migration
pnpm run prisma:studio       # Visual DB editor (port 5555)
pnpm run seed:super-admin    # Create Super Admin (one-time)
```

---

## 🗺️ Roadmap

- [x] Auth — OTP + JWT + Google
- [ ] Regions + Regional Admins
- [ ] Branches
- [ ] Couriers + registration approval
- [ ] Orders + QR codes
- [ ] Live tracking + geofencing
- [ ] Payments (Telebirr, Chapa, COD)
- [ ] Telegram bot + Mini App
- [ ] Mobile app (Flutter)

---

## 📄 License

MIT © 2026 Deliver Ethiopia# delivery_ethiopai_backend
