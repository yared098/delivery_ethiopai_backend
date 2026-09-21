# 📘 Deliver Ethiopia — API Documentation

Base URL (dev): `http://localhost:3000/api/v1`
Base URL (prod): `https://api.deliver.et/api/v1`

All responses are JSON. All requests with a body must send `Content-Type: application/json`.

---

## 🔐 Authentication Model

The API uses **JWT with access + refresh tokens**.

| Token | Lifetime | Purpose | How to send |
|-------|----------|---------|-------------|
| `accessToken` | 15 minutes | Authenticates requests | Header: `Authorization: Bearer <accessToken>` |
| `refreshToken` | 30 days | Gets new access token | Body of `/auth/refresh` |

### Token Lifecycle
