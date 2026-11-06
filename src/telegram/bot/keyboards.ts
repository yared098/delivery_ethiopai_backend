import { CALLBACK_DATA, ORDERS_PAGE_SIZE } from '../telegram.constants';
import { Lang, LANGUAGES, t } from '../i18n/telegram.i18n';

export type ReplyMarkup = Record<string, unknown>;

interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

interface KeyboardOrder {
  id: string;
  trackingNumber: string;
}

export const REMOVE_KEYBOARD: ReplyMarkup = { remove_keyboard: true };

export function mainMenuKeyboard(lang: Lang): ReplyMarkup {
  return {
    keyboard: [
      [{ text: t(lang, 'btn.newOrder') }, { text: t(lang, 'btn.orders') }],
      [{ text: t(lang, 'btn.track') }, { text: t(lang, 'btn.account') }],
      [{ text: t(lang, 'btn.language') }, { text: t(lang, 'btn.help') }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

/** Maps a typed/button label back to an action id, whatever the language. */
export function resolveMenuAction(text: string): string | null {
  const normalised = text.trim().toLowerCase();
  const keys = [
    'btn.newOrder',
    'btn.orders',
    'btn.track',
    'btn.account',
    'btn.language',
    'btn.help',
    'btn.skip',
    'btn.register',
  ] as const;

  for (const key of keys) {
    for (const { code } of LANGUAGES) {
      if (t(code, key).toLowerCase() === normalised) return key;
    }
  }
  return null;
}

export function languageKeyboard(): ReplyMarkup {
  return {
    inline_keyboard: [
      LANGUAGES.map((language) => ({
        text: language.label,
        callback_data: `${CALLBACK_DATA.language}:${language.code}`,
      })),
    ],
  };
}

export function paymentPartyKeyboard(lang: Lang): ReplyMarkup {
  return {
    inline_keyboard: [
      [
        { text: t(lang, 'paySender'), callback_data: `${CALLBACK_DATA.payParty}:SENDER` },
        { text: t(lang, 'payReceiver'), callback_data: `${CALLBACK_DATA.payParty}:RECEIVER` },
      ],
      [{ text: t(lang, 'btn.cancel'), callback_data: CALLBACK_DATA.cancelFlow }],
    ],
  };
}

export function confirmOrderKeyboard(lang: Lang): ReplyMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: t(lang, 'btn.confirm'),
          callback_data: `${CALLBACK_DATA.confirmOrder}:yes`,
        },
      ],
      [{ text: t(lang, 'btn.cancel'), callback_data: CALLBACK_DATA.cancelFlow }],
    ],
  };
}

export function ordersListKeyboard(
  orders: KeyboardOrder[],
  page: number,
  totalPages: number,
  lang: Lang,
): ReplyMarkup {
  const rows: InlineButton[][] = orders.map((order) => [
    {
      text: order.trackingNumber,
      callback_data: `${CALLBACK_DATA.orderView}:${order.id}`,
    },
  ]);

  if (totalPages > 1) {
    const nav: InlineButton[] = [];
    if (page > 1) {
      nav.push({
        text: '<',
        callback_data: `${CALLBACK_DATA.ordersPage}:${page - 1}`,
      });
    }
    nav.push({
      text: `${page}/${totalPages}`,
      callback_data: `${CALLBACK_DATA.ordersPage}:${page}`,
    });
    if (page < totalPages) {
      nav.push({
        text: '>',
        callback_data: `${CALLBACK_DATA.ordersPage}:${page + 1}`,
      });
    }
    rows.push(nav);
  }

  rows.push([
    { text: t(lang, 'btn.newOrder'), callback_data: CALLBACK_DATA.newOrder },
  ]);

  return { inline_keyboard: rows };
}

export function orderCardKeyboard(
  orderId: string,
  trackingUrl: string | null,
  lang: Lang,
): ReplyMarkup {
  const rows: InlineButton[][] = [];
  if (trackingUrl && /^https?:\/\//i.test(trackingUrl)) {
    rows.push([{ text: t(lang, 'btn.openTracking'), url: trackingUrl }]);
  }
  rows.push([
    { text: t(lang, 'btn.refresh'), callback_data: `${CALLBACK_DATA.orderView}:${orderId}` },
    { text: t(lang, 'btn.orders'), callback_data: `${CALLBACK_DATA.ordersPage}:1` },
  ]);
  return { inline_keyboard: rows };
}

export function backToMenuKeyboard(lang: Lang): ReplyMarkup {
  return {
    inline_keyboard: [
      [{ text: t(lang, 'btn.newOrder'), callback_data: CALLBACK_DATA.newOrder }],
      [{ text: t(lang, 'btn.orders'), callback_data: `${CALLBACK_DATA.ordersPage}:1` }],
      [{ text: t(lang, 'btn.help'), callback_data: CALLBACK_DATA.help }],
    ],
  };
}

export const ORDERS_PER_PAGE = ORDERS_PAGE_SIZE;
