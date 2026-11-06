import { OrderStatus } from '@prisma/client';
import { Lang, statusLabel, t } from '../i18n/telegram.i18n';
import { toLocalPhone } from '../../common/utils/phone.util';

const TIME_ZONE = 'Africa/Addis_Ababa';

export interface OrderEventView {
  status: OrderStatus;
  note: string | null;
  createdAt: Date;
}

export interface OrderCardView {
  id: string;
  trackingNumber: string;
  status: OrderStatus;
  senderName: string;
  senderPhone: string;
  receiverName: string | null;
  receiverPhone: string;
  deliveryFee: number;
  totalWeightKg: number;
  trackingUrl: string | null;
  courierName: string | null;
  courierPhone: string | null;
  createdAt: Date;
  events: OrderEventView[];
}

export function formatMoney(amount: number): string {
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ETB`;
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: TIME_ZONE,
  }).format(date);
}

/** Public view: hide part of a name so a tracking number cannot leak identity. */
export function maskName(name: string | null | undefined): string {
  if (!name) return '-';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
}

export function formatOrderCard(order: OrderCardView, lang: Lang): string {
  const lines: string[] = [
    t(lang, 'orderDetailsTitle', { tracking: order.trackingNumber }),
    '',
    `${t(lang, 'statusLabel')}: ${statusLabel(lang, order.status)}`,
    `${t(lang, 'senderLabel')}: ${order.senderName} (${toLocalPhone(order.senderPhone)})`,
    `${t(lang, 'receiverLabel')}: ${order.receiverName ?? '-'} (${toLocalPhone(order.receiverPhone)})`,
    `${t(lang, 'weightLabel')}: ${order.totalWeightKg} kg`,
    `${t(lang, 'feeLabel')}: ${formatMoney(order.deliveryFee)}`,
  ];

  if (order.courierName) {
    const phone = order.courierPhone ? ` (${toLocalPhone(order.courierPhone)})` : '';
    lines.push(`${t(lang, 'courierLabel')}: ${order.courierName}${phone}`);
  }

  lines.push(`${t(lang, 'trackingLabel')}: ${formatDateTime(order.createdAt)}`);
  lines.push('', t(lang, 'eventsTitle'));

  if (order.events.length === 0) {
    lines.push(t(lang, 'noEvents'));
  } else {
    for (const event of order.events.slice(0, 5)) {
      const note = event.note ? ` - ${event.note}` : '';
      lines.push(
        `- ${formatDateTime(event.createdAt)} ${statusLabel(lang, event.status)}${note}`,
      );
    }
  }

  return lines.join('\n');
}

/** Public tracking card: names and phones are masked. */
export function formatTrackingCard(order: OrderCardView, lang: Lang): string {
  const lines: string[] = [
    t(lang, 'trackTitle', { tracking: order.trackingNumber }),
    '',
    `${t(lang, 'statusLabel')}: ${statusLabel(lang, order.status)}`,
    `${t(lang, 'senderLabel')}: ${maskName(order.senderName)}`,
    `${t(lang, 'receiverLabel')}: ${maskName(order.receiverName)}`,
    `${t(lang, 'weightLabel')}: ${order.totalWeightKg} kg`,
  ];

  if (order.courierName) {
    lines.push(
      `${t(lang, 'courierLabel')}: ${maskName(order.courierName)} (${maskPhone(order.courierPhone)})`,
    );
  }

  lines.push('', t(lang, 'eventsTitle'));

  if (order.events.length === 0) {
    lines.push(t(lang, 'noEvents'));
  } else {
    for (const event of order.events.slice(0, 5)) {
      const note = event.note ? ` - ${event.note}` : '';
      lines.push(
        `- ${formatDateTime(event.createdAt)} ${statusLabel(lang, event.status)}${note}`,
      );
    }
  }

  return lines.join('\n');
}

export function formatOrderListLine(
  order: { trackingNumber: string; status: OrderStatus; createdAt: Date },
  lang: Lang,
): string {
  return `${order.trackingNumber}  ${statusLabel(lang, order.status)}  ${formatDateTime(
    order.createdAt,
  )}`;
}
