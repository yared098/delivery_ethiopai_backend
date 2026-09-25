import { OrderStatus } from '@prisma/client';

export type Template = { title: string; body: string };

// ── Order status → notification text ──
export const ORDER_STATUS_TEMPLATES: Partial<Record<OrderStatus, Template>> = {
  AWAITING_RECEIVER_LOCATION: {
    title: 'Receiver Location Needed 📍',
    body: 'Please share the receiver location to continue.',
  },
  PENDING_PAYMENT: {
    title: 'Payment Pending 💳',
    body: 'Complete payment to confirm your delivery.',
  },
  PAID: {
    title: 'Payment Confirmed ✅',
    body: 'We are finding a courier for you.',
  },
  ASSIGNED: {
    title: 'Courier Assigned 🛵',
    body: 'A courier has been assigned to your order.',
  },
  PICKED_UP: {
    title: 'Picked Up 📦',
    body: 'Your parcel has been picked up.',
  },
  IN_TRANSIT: {
    title: 'In Transit 🚚',
    body: 'Your parcel is on the way.',
  },
  OUT_FOR_DELIVERY: {
    title: 'Out for Delivery 🏃',
    body: 'Your parcel will arrive soon.',
  },
  DELIVERED: {
    title: 'Delivered 🎉',
    body: 'Your parcel has been delivered. Thank you!',
  },
  FAILED: {
    title: 'Delivery Failed ⚠️',
    body: 'Delivery attempt failed. We will retry.',
  },
  CANCELLED: {
    title: 'Order Cancelled ❌',
    body: 'Your order was cancelled.',
  },
  RETURNED: {
    title: 'Order Returned ↩️',
    body: 'Your parcel is being returned.',
  },
};

// ── Standalone event templates ──
export const TEMPLATES = {
  WELCOME_CUSTOMER: {
    title: 'Welcome to Deliver Ethiopia 🎉',
    body: 'Your account is ready. Start sending parcels today!',
  },
  COURIER_APPROVED: {
    title: 'Account Approved 🎉',
    body: 'You can now start accepting deliveries.',
  },
  COURIER_REJECTED: {
    title: 'Application Rejected',
    body: 'Your courier application was not approved.',
  },
  NEW_ASSIGNMENT: {
    title: 'New Delivery Assigned 📦',
    body: 'You have a new pickup waiting.',
  },
  PAYOUT_PAID: {
    title: 'Payout Sent 💰',
    body: 'Your payout has been processed.',
  },
  RECEIVER_LINK: {
    title: 'Share Your Location 📍',
    body: 'Tap to share your delivery location.',
  },
  TEST: {
    title: 'Test Notification 🔔',
    body: 'If you see this, FCM is working perfectly.',
  },
} as const;