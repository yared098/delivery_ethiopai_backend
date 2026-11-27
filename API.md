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

### Customer Telegram connection

Customer app requests below require `Authorization: Bearer <accessToken>`.

1. `GET /auth/customer/telegram` returns the connection state:

```json
{ "connected": true, "otpDeliveryEnabled": true }
```

2. `POST /auth/customer/telegram/link` creates a one-time Telegram deep link:

```json
{
	"connected": false,
	"otpDeliveryEnabled": false,
	"linkUrl": "https://t.me/<bot>?start=link_<one-time-token>",
	"expiresInSeconds": 600
}
```

Open `linkUrl` in Telegram and tap **Start** to finish linking. The token expires
after the returned duration and can only be used once. Older Telegram links are
not eligible for OTP delivery until they are paired again this way.

3. `DELETE /auth/customer/telegram` disconnects the linked bot. Customer OTPs
are sent to Telegram when `otpDeliveryEnabled` is true; otherwise they use SMS.
Telegram delivery falls back to SMS if sending the Telegram message fails.
`POST /auth/customer/otp/request` includes `deliveryMethod` (`telegram` or `sms`)
in its response.

### Courier Telegram connection

Courier app requests below require a courier access token in the `Authorization`
header:

1. `GET /auth/courier/telegram` reports connection status and OTP eligibility:

```json
{ "connected": true, "otpDeliveryEnabled": true }
```

2. `POST /auth/courier/telegram/link` creates a short-lived, one-use Telegram
deep link using the same response shape as the customer link endpoint. Open the
returned `linkUrl` in Telegram and tap **Start** to finish pairing.

3. `DELETE /auth/courier/telegram` disconnects the linked bot. Courier login
OTPs are sent to Telegram when enabled, with SMS fallback; the courier OTP
request response includes `deliveryMethod`. Courier job offers and status
updates are also sent to a linked Telegram chat.

Customer and courier Telegram links are mutually exclusive for a Telegram chat.
Disconnect one account before linking the chat to another account.
Apply the courier Telegram database migration before deploying:
`npm run prisma:migrate:deploy`.

### Token Lifecycle

## Receiver location links

When an order is created without the receiver's full address and location, the API
creates a receiver link and automatically sends it to the receiver by SMS. Staff can
send a fresh link using `POST /admin/orders/:id/send-receiver-link`; this revokes
the previous active link and sends the new link by SMS by default. Send
`{"sendSms": false}` to create a fresh link without sending an SMS.

The resend response includes `link` and `smsSent` (`true` when the provider accepted
the SMS, `false` when delivery was not accepted, or `null` when SMS was disabled).

## Receiver delivery confirmation

The courier scans the order at the destination using
`POST /courier/orders/:id/scan-deliver` or `POST /courier/jobs/:id/scan-deliver`.
This moves the order to `OUT_FOR_DELIVERY`; it does not mark the delivery complete.

The receiver must sign in to the customer app and scan the order QR code, then
submit the scanned QR text:

```http
POST /customer/orders/scan-delivery
Authorization: Bearer <customer access token>
Content-Type: application/json
```

```json
{ "code": "https://<web-app>/q/<tracking-number>?s=<signature>" }
```

The API validates the QR signature and checks that the authenticated customer is
the order receiver (by receiver account or, for older orders without a linked
receiver account, by matching phone number). A valid receiver scan changes the
order to `DELIVERED`, records receiver confirmation, and releases courier earnings.
