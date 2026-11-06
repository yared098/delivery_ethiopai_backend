# 📘 Truest Express — API Documentation

Base URL (dev): `http://localhost:3000/api/v1`
Base URL (prod): `https://api.deliver.et/api/v1`

All responses are JSON. All requests with a body must send `Content-Type: application/json`.

---

## 🔐 Authentication Model

The API uses **JWT with access + refresh tokens**.
Each account can have only one active login session. Logging in on another device
revokes the previous session immediately; requests from the previous device receive
`401 Unauthorized` and must log in again.

| Token | Lifetime | Purpose | How to send |
|-------|----------|---------|-------------|
| `accessToken` | 15 minutes | Authenticates requests | Header: `Authorization: Bearer <accessToken>` |
| `refreshToken` | 30 days | Gets new access token | Body of `/auth/refresh` |

### Token Lifecycle

## Receiver location links

When an order is created without the receiver's full address and location, the API
creates a receiver link and automatically sends it to the receiver by SMS. Staff can
send a fresh link using `POST /admin/orders/:id/send-receiver-link`; this revokes
the previous active link and sends the new link by SMS by default. Send
`{"sendSms": false}` to create a fresh link without sending an SMS.

The resend response includes `link` and `smsSent` (`true` when the provider accepted
the SMS, `false` when delivery was not accepted, or `null` when SMS was disabled).
