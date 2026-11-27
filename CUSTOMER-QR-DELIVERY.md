# Customer QR Delivery Confirmation

Implement this flow in the customer mobile app. The receiver scans the order QR
code to confirm they received the package.

## Flow

1. The receiver signs in and opens **Scan delivery QR** in the customer app.
2. Scan the order QR code and keep the **entire scanned text**. It should look
   like `https://<web-app>/q/<tracking-number>?s=<signature>`.
3. Send that exact text to the API:

   ```http
   POST <API_BASE_URL>/customer/orders/scan-delivery
   Authorization: Bearer <customer access token>
   Content-Type: application/json
   ```

   ```json
   {
     "code": "https://<web-app>/q/<tracking-number>?s=<signature>"
   }
   ```

4. On success, show the confirmation message and refresh the order. The API
   changes the status to `DELIVERED` and records receiver confirmation.

## Success response

```json
{
  "success": true,
  "message": "Order #<tracking-number> delivery confirmed",
  "order": {
    "id": "<order-id>",
    "status": "DELIVERED",
    "receiverConfirmed": true
  }
}
```

The `order` object contains additional order fields.

## Endpoint URL and backend code

The API base URL already includes `/api/v1`. Use the matching environment:

- Local: `http://localhost:3000/api/v1/customer/orders/scan-delivery`
- Android emulator: `http://10.0.2.2:3000/api/v1/customer/orders/scan-delivery`
- Production: `<PRODUCTION_API_BASE_URL>/customer/orders/scan-delivery`
  (set `PRODUCTION_API_BASE_URL` to your deployed API URL ending in `/api/v1`).

The backend endpoint and implementation are here:

- Route and customer authentication: `src/customer-orders/customer-orders.controller.ts`
  (`POST /customer/orders/scan-delivery`)
- QR validation, receiver ownership check, and completion: `src/orders/orders.service.ts`
  (`confirmReceiverDelivery`)
- Request body validation: `src/customer-orders/dto/confirm-delivery.dto.ts`

## Important

- Require a signed-in **customer**. Do not call the courier delivery-scan API.
- Send the complete QR value, including `?s=<signature>`. A tracking number
  without its signature is not enough.
- The backend verifies the QR signature, checks that the signed-in customer is
  the receiver, and checks that the order is ready for receiver confirmation.
- Do not mark an order delivered in the app yourself; only do so after the API
  returns success.
- If the request fails, show the API error and let the receiver retry scanning.
- In production, replace the base URL with the deployed API base URL; keep the
  path `/customer/orders/scan-delivery`.
