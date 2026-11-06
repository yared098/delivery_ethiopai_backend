import { OrderStatus } from '@prisma/client';

export type Lang = 'en' | 'am';

export const LANGUAGES: ReadonlyArray<{ code: Lang; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'አማርኛ' },
];

export const DEFAULT_LANG: Lang = 'en';

export type TranslationKey =
  // buttons
  | 'btn.newOrder'
  | 'btn.orders'
  | 'btn.track'
  | 'btn.account'
  | 'btn.help'
  | 'btn.language'
  | 'btn.skip'
  | 'btn.confirm'
  | 'btn.cancel'
  | 'btn.back'
  | 'btn.refresh'
  | 'btn.openTracking'
  | 'btn.register'
  | 'btn.callSupport'
  // common
  | 'welcome'
  | 'welcomeBack'
  | 'help'
  | 'unknownCommand'
  | 'cancelled'
  | 'notRegistered'
  | 'registeredAs'
  | 'mainMenu'
  // language
  | 'languageTitle'
  | 'languageSet'
  // account
  | 'askName'
  | 'askPhone'
  | 'askAddress'
  | 'registrationDone'
  | 'registrationFailed'
  | 'accountLinked'
  | 'accountLinkFailed'
  | 'accountInUse'
  | 'accountUnlinked'
  | 'noLinkedAccount'
  | 'profileTitle'
  | 'nameLabel'
  | 'phoneLabel'
  | 'addressLabel'
  | 'notSet'
  // orders
  | 'orderAskReceiverName'
  | 'orderAskReceiverPhone'
  | 'orderAskItem'
  | 'orderAskWeight'
  | 'orderAskPaymentParty'
  | 'paySender'
  | 'payReceiver'
  | 'orderConfirmTitle'
  | 'orderConfirmHint'
  | 'orderCreated'
  | 'orderCreateFailed'
  | 'noOrders'
  | 'ordersTitle'
  | 'ordersPageOf'
  | 'orderDetailsTitle'
  | 'senderLabel'
  | 'receiverLabel'
  | 'feeLabel'
  | 'weightLabel'
  | 'statusLabel'
  | 'trackingLabel'
  | 'courierLabel'
  | 'eventsTitle'
  | 'noEvents'
  | 'estimateFrom'
  // tracking
  | 'trackAsk'
  | 'trackNotFound'
  | 'trackTitle'
  | 'orderStatusPush'
  // validation
  | 'invalidPhone'
  | 'invalidWeight'
  | 'invalidName'
  | 'invalidItem';

type Dictionary = Record<TranslationKey, string>;

const en: Dictionary = {
  'btn.newOrder': 'New order',
  'btn.orders': 'My orders',
  'btn.track': 'Track',
  'btn.account': 'Account',
  'btn.help': 'Help',
  'btn.language': 'Language',
  'btn.skip': 'Skip',
  'btn.confirm': 'Confirm order',
  'btn.cancel': 'Cancel',
  'btn.back': 'Back',
  'btn.refresh': 'Refresh',
  'btn.openTracking': 'Live tracking',
  'btn.register': 'Register',
  'btn.callSupport': 'Call support',

  welcome:
    'Welcome to Deliver Ethiopia.\nSend a parcel anywhere in Ethiopia and follow it in real time.',
  welcomeBack: 'Welcome back, {name}.',
  help:
    'Available commands:\n' +
    '/neworder - create an order\n' +
    '/orders - my orders\n' +
    '/track <number> - follow an order\n' +
    '/register - create an account\n' +
    '/link <phone> - link an existing account\n' +
    '/me - my profile\n' +
    '/language - change language\n' +
    '/cancel - cancel the current step',
  unknownCommand: 'I did not understand that. Send /help to see what I can do.',
  cancelled: 'Cancelled.',
  notRegistered:
    'Your Telegram is not linked to a Deliver Ethiopia account yet.\nSend /register to create one, or /link 0912345678 to connect an existing account.',
  registeredAs: 'Signed in as {name}.',
  mainMenu: 'What would you like to do?',

  languageTitle: 'Choose a language:',
  languageSet: 'Language set to English.',

  askName: 'Send your full name:',
  askPhone: 'Send your phone number, for example 0912345678:',
  askAddress: 'Send your address, or tap Skip:',
  registrationDone:
    'Registration complete. You can create an order now with /neworder.',
  registrationFailed: 'Registration failed: {reason}',
  accountLinked: 'Account linked. Signed in as {name}.',
  accountLinkFailed: 'No account found for that phone number.',
  accountInUse:
    'That account is already linked to another Telegram user. Contact support to move it.',
  accountUnlinked: 'Account unlinked from this Telegram.',
  noLinkedAccount: 'This Telegram is not linked to an account.',
  profileTitle: 'Your profile',
  nameLabel: 'Name',
  phoneLabel: 'Phone',
  addressLabel: 'Address',
  notSet: 'not set',

  orderAskReceiverName: 'Receiver name:',
  orderAskReceiverPhone: 'Receiver phone, for example 0912345678:',
  orderAskItem: 'What are you sending? Describe the item:',
  orderAskWeight: 'Weight in kg, for example 2.5:',
  orderAskPaymentParty: 'Who pays the delivery fee?',
  paySender: 'I pay',
  payReceiver: 'Receiver pays',
  orderConfirmTitle: 'Please confirm the order',
  orderConfirmHint:
    'The final fee depends on the delivery distance. The receiver will get a link to share the drop-off location.',
  orderCreated:
    'Order created.\nTracking number: {tracking}\nEstimated fee: {fee}\n\nSend the tracking number to the receiver so they can share the drop-off location.',
  orderCreateFailed: 'Could not create the order: {reason}',
  noOrders: 'You have no orders yet. Tap New order to create one.',
  ordersTitle: 'Your orders',
  ordersPageOf: 'Page {page} of {pages}',
  orderDetailsTitle: 'Order {tracking}',
  senderLabel: 'Sender',
  receiverLabel: 'Receiver',
  feeLabel: 'Fee',
  weightLabel: 'Weight',
  statusLabel: 'Status',
  trackingLabel: 'Tracking',
  courierLabel: 'Courier',
  eventsTitle: 'Latest updates',
  noEvents: 'No updates yet.',
  estimateFrom: 'from {fee}',

  trackAsk: 'Send /track <tracking number>, for example /track ETH-2026-ABC123',
  trackNotFound: 'No order found for {number}.',
  trackTitle: 'Tracking {tracking}',

  orderStatusPush: 'Order {tracking}\nNew status: {status}',

  invalidPhone: 'That phone number does not look right. Use 0912345678 or +251912345678.',
  invalidWeight: 'Send the weight as a number between 0.01 and 5000 kg.',
  invalidName: 'Send at least 2 characters.',
  invalidItem: 'Describe the item in at least 2 characters.',
};

const am: Dictionary = {
  'btn.newOrder': 'አዲስ ትዕዛዝ',
  'btn.orders': 'ትዕዛዞቼ',
  'btn.track': 'ክትትል',
  'btn.account': 'አካውንት',
  'btn.help': 'እርዳታ',
  'btn.language': 'ቋንቋ',
  'btn.skip': 'ዝለል',
  'btn.confirm': 'ትዕዛዙን አረጋግጥ',
  'btn.cancel': 'ሰርዝ',
  'btn.back': 'ተመለስ',
  'btn.refresh': 'አድስ',
  'btn.openTracking': 'ቀጥታ ክትትል',
  'btn.register': 'ተመዝገብ',
  'btn.callSupport': 'ድጋፍ ይደውሉ',

  welcome:
    'እንኳን ወደ ዴሊቨር ኢትዮጵያ በደህና መጡ።\nበኢትዮጵያ ውስጥ በማንኛውም ቦታ ፓርሴል ይላኩ እና በቀጥታ ይከታተሉ።',
  welcomeBack: 'እንኳን ደህና መጡ፣ {name}።',
  help:
    'የሚገኙ ትዕዛዞች፦\n' +
    '/neworder - አዲስ ትዕዛዝ መፍጠር\n' +
    '/orders - የእኔ ትዕዛዞች\n' +
    '/track <ቁጥር> - ትዕዛዝ መከታተል\n' +
    '/register - አካውንት መክፈት\n' +
    '/link <ስልክ> - ያለውን አካውንት ማገናኘት\n' +
    '/me - መገለጫዬ\n' +
    '/language - ቋንቋ መቀየር\n' +
    '/cancel - የአሁኑን ደረጃ መሰረዝ',
  unknownCommand: 'ያንን አልተረዳሁም። ሊያደርጉ የሚችሉትን ለማየት /help ይላኩ።',
  cancelled: 'ተሰርዟል።',
  notRegistered:
    'ይህ ቴሌግራም ከዴሊቨር ኢትዮጵያ አካውንት ጋር አልተገናኘም።\nአዲስ ለመክፈት /register ይላኩ፤ ያለውን ለማገናኘት /link 0912345678 ይላኩ።',
  registeredAs: 'እንደ {name} ገብተዋል።',
  mainMenu: 'ምን ማድረግ ይፈልጋሉ?',

  languageTitle: 'ቋንቋ ይምረጡ፦',
  languageSet: 'ቋንቋ ወደ አማርኛ ተቀይሯል።',

  askName: 'ሙሉ ስምዎን ይላኩ፦',
  askPhone: 'የስልክ ቁጥርዎን ይላኩ፣ ለምሳሌ 0912345678፦',
  askAddress: 'አድራሻዎን ይላኩ ወይም ዝለል ይጫኑ፦',
  registrationDone: 'ምዝገባ ተጠናቅቋል። አሁን /neworder በመላክ ትዕዛዝ መስጠት ይችላሉ።',
  registrationFailed: 'ምዝገባ አልተሳካም፦ {reason}',
  accountLinked: 'አካውንት ተገናኝቷል። እንደ {name} ገብተዋል።',
  accountLinkFailed: 'በዚህ ስልክ ቁጥር አካውንት አልተገኘም።',
  accountInUse: 'ይህ አካውንት ከሌላ ቴሌግራም ተጠቃሚ ጋር ተገናኝቷል። ለማስተላለፍ ድጋፍን ያግኙ።',
  accountUnlinked: 'አካውንት ከዚህ ቴሌግራም ተላቋል።',
  noLinkedAccount: 'ይህ ቴሌግራም ከአካውንት ጋር አልተገናኘም።',
  profileTitle: 'የእኔ መገለጫ',
  nameLabel: 'ስም',
  phoneLabel: 'ስልክ',
  addressLabel: 'አድራሻ',
  notSet: 'አልተሞላም',

  orderAskReceiverName: 'የተቀባዩ ስም፦',
  orderAskReceiverPhone: 'የተቀባዩ ስልክ ቁጥር፣ ለምሳሌ 0912345678፦',
  orderAskItem: 'ምን ይላካሉ? እቃውን ይግለጹ፦',
  orderAskWeight: 'ክብደት በኪሎግራም፣ ለምሳሌ 2.5፦',
  orderAskPaymentParty: 'የማድረሻውን ክፍያ ማን ይከፍላል?',
  paySender: 'እኔ እከፍላለሁ',
  payReceiver: 'ተቀባዩ ይከፍላል',
  orderConfirmTitle: 'ትዕዛዙን ያረጋግጡ',
  orderConfirmHint:
    'የመጨረሻው ክፍያ በማድረሻ ርቀት ላይ ይወሰናል። ተቀባዩ የማድረሻ ቦታውን ለማጋራት ሊንክ ይደርሰዋል።',
  orderCreated:
    'ትዕዛዝ ተፈጥሯል።\nየክትትል ቁጥር፦ {tracking}\nየሚገመት ክፍያ፦ {fee}\n\nተቀባዩ የማድረሻ ቦታውን እንዲያጋራ የክትትል ቁጥሩን ይላኩላቸው።',
  orderCreateFailed: 'ትዕዛዙን መፍጠር አልተቻለም፦ {reason}',
  noOrders: 'እስካሁን ትዕዛዝ የለዎትም። አዲስ ትዕዛዝ ለመስጠት "አዲስ ትዕዛዝ" ይጫኑ።',
  ordersTitle: 'የእኔ ትዕዛዞች',
  ordersPageOf: 'ገጽ {page} ከ {pages}',
  orderDetailsTitle: 'ትዕዛዝ {tracking}',
  senderLabel: 'ላኪ',
  receiverLabel: 'ተቀባይ',
  feeLabel: 'ክፍያ',
  weightLabel: 'ክብደት',
  statusLabel: 'ሁኔታ',
  trackingLabel: 'ክትትል',
  courierLabel: 'ማድረሻ ሰራተኛ',
  eventsTitle: 'የቅርብ ጊዜ መረጃዎች',
  noEvents: 'እስካሁን መረጃ የለም።',
  estimateFrom: 'ከ {fee} ጀምሮ',

  trackAsk: 'የክትትል ቁጥሩን ይላኩ፣ ለምሳሌ /track ETH-2026-ABC123',
  trackNotFound: 'በ {number} ትዕዛዝ አልተገኘም።',
  trackTitle: 'ክትትል {tracking}',

  orderStatusPush: 'ትዕዛዝ {tracking}\nአዲስ ሁኔታ፦ {status}',

  invalidPhone: 'ስልክ ቁጥሩ ትክክል አይደለም። 0912345678 ወይም +251912345678 ይጠቀሙ።',
  invalidWeight: 'ክብደቱን ከ 0.01 እስከ 5000 ኪሎግራም በቁጥር ይላኩ።',
  invalidName: 'ቢያንስ 2 ፊደሎች ይላኩ።',
  invalidItem: 'እቃውን ቢያንስ በ2 ፊደሎች ይግለጹ።',
};

const DICTIONARIES: Record<Lang, Dictionary> = { en, am };

const STATUS_LABELS: Record<Lang, Record<OrderStatus, string>> = {
  en: {
    [OrderStatus.DRAFT]: 'Draft',
    [OrderStatus.AWAITING_RECEIVER_LOCATION]: 'Waiting for drop-off location',
    [OrderStatus.PENDING_PAYMENT]: 'Pending payment',
    [OrderStatus.PAID]: 'Paid',
    [OrderStatus.ASSIGNED]: 'Courier assigned',
    [OrderStatus.PICKED_UP]: 'Picked up',
    [OrderStatus.IN_TRANSIT]: 'In transit',
    [OrderStatus.OUT_FOR_DELIVERY]: 'Out for delivery',
    [OrderStatus.DELIVERED]: 'Delivered',
    [OrderStatus.FAILED]: 'Delivery failed',
    [OrderStatus.CANCELLED]: 'Cancelled',
    [OrderStatus.RETURNED]: 'Returned',
  },
  am: {
    [OrderStatus.DRAFT]: 'ረቂቅ',
    [OrderStatus.AWAITING_RECEIVER_LOCATION]: 'የማድረሻ ቦታ በመጠበቅ ላይ',
    [OrderStatus.PENDING_PAYMENT]: 'ክፍያ በመጠበቅ ላይ',
    [OrderStatus.PAID]: 'ተከፍሏል',
    [OrderStatus.ASSIGNED]: 'ሰራተኛ ተመድቧል',
    [OrderStatus.PICKED_UP]: 'ተወስዷል',
    [OrderStatus.IN_TRANSIT]: 'በመንገድ ላይ',
    [OrderStatus.OUT_FOR_DELIVERY]: 'ለማድረስ ወጥቷል',
    [OrderStatus.DELIVERED]: 'ደርሷል',
    [OrderStatus.FAILED]: 'ማድረስ አልተሳካም',
    [OrderStatus.CANCELLED]: 'ተሰርዟል',
    [OrderStatus.RETURNED]: 'ተመላሽ ሆኗል',
  },
};

export function isLang(value: string | undefined | null): value is Lang {
  return value === 'en' || value === 'am';
}

export function t(
  lang: Lang,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const dictionary = DICTIONARIES[lang] ?? DICTIONARIES[DEFAULT_LANG];
  const template = dictionary[key] ?? DICTIONARIES[DEFAULT_LANG][key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : match,
  );
}

export function statusLabel(lang: Lang, status: OrderStatus): string {
  return STATUS_LABELS[lang]?.[status] ?? STATUS_LABELS[DEFAULT_LANG][status] ?? status;
}
