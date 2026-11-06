export const TELEGRAM_API_BASE = 'https://api.telegram.org';
export const TELEGRAM_CALL_TIMEOUT_MS = 15_000;
export const TELEGRAM_POLL_TIMEOUT_SEC = 25;
export const TELEGRAM_POLL_BACKOFF_MS = 3_000;
export const TELEGRAM_MAX_MESSAGE_LENGTH = 4_096;
export const TELEGRAM_SAFE_CHUNK_LENGTH = 3_800;

/** How long a half-finished conversation (order wizard, registration) survives. */
export const SESSION_TTL_MS = 30 * 60 * 1_000;

export const ORDERS_PAGE_SIZE = 5;

/** callback_data is capped at 64 bytes by Telegram — keep prefixes short. */
export const CALLBACK_DATA = {
  menu: 'menu',
  language: 'lang',
  newOrder: 'new',
  orders: 'orders',
  account: 'account',
  help: 'help',
  trackPrompt: 'track',
  orderView: 'ord',
  ordersPage: 'opg',
  payParty: 'pay',
  confirmOrder: 'cfm',
  cancelFlow: 'abort',
} as const;

export const BOT_COMMANDS = [
  { command: 'start', description: 'Main menu' },
  { command: 'neworder', description: 'Create a new order' },
  { command: 'orders', description: 'My orders' },
  { command: 'track', description: 'Track an order: /track ETH-2026-XXXXXX' },
  { command: 'register', description: 'Create an account' },
  { command: 'link', description: 'Link account: /link 0912345678' },
  { command: 'me', description: 'My profile' },
  { command: 'language', description: 'Change language' },
  { command: 'help', description: 'Help' },
  { command: 'cancel', description: 'Cancel the current step' },
] as const;
