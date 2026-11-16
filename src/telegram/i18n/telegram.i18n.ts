import { OrderStatus } from '@prisma/client';

export type Lang = 'en' | 'am' | 'om' | 'ti' | 'so';

export const LANGUAGES: ReadonlyArray<{ code: Lang; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'አማርኛ' },
  { code: 'om', label: 'Afaan Oromoo' },
  { code: 'ti', label: 'ትግርኛ' },
  { code: 'so', label: 'Af-Soomaali' },
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
  | 'btn.showQr'
  | 'btn.register'
  | 'btn.callSupport'
  | 'btn.shareLocation'
  | 'btn.openOrderForm'
  | 'btn.useWizard'
  // common
  | 'welcome'  | 'welcomeBack'
  | 'help'
  | 'unknownCommand'
  | 'cancelled'
  | 'notRegistered'
  | 'registeredAs'
  | 'mainMenu'
  | 'menuPlaceholder'
  | 'locationPlaceholder'
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
  | 'orderAskPhoto'
  | 'orderAskPhotoInvalid'
  | 'orderPhotoUploading'
  | 'orderPhotoUploaded'
  | 'orderPhotoUploadFailed'
  | 'orderAskWeight'
  | 'orderAskSenderLocation'
  | 'orderSenderLocationReceived'
  | 'orderSenderLocationSkipped'
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
  | 'itemLabel'
  | 'photoLabel'
  | 'photoAttached'
  | 'feeLabel'
  | 'weightLabel'
  | 'statusLabel'
  | 'trackingLabel'
  | 'courierLabel'
  | 'eventsTitle'
  | 'noEvents'
  | 'estimateFrom'
  | 'orderQrPrompt'
  | 'qrCodeNotFound'
  // tracking
  | 'trackAsk'
  | 'trackNotFound'
  | 'trackTitle'
  | 'orderStatusPush'
  // validation
  | 'invalidPhone'
  | 'invalidWeight'
  | 'invalidName'
  | 'invalidItem'
  | 'orderAskAddMoreItem'
  | 'btn.addAnother'
  | 'btn.finishItems'
  | 'itemsLabel'
  | 'createOrderChoose';

type Dictionary = Record<TranslationKey, string>;

// ════════════════════════════════════════════════════════════════════
// STATUS LABELS — defined before statusLabel() to avoid temporal dead zone
// ════════════════════════════════════════════════════════════════════
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
  om: {
    [OrderStatus.DRAFT]: 'Hunda',
    [OrderStatus.AWAITING_RECEIVER_LOCATION]: 'Ga\'aa barbaachisa',
    [OrderStatus.PENDING_PAYMENT]: 'Fee barbaachisa',
    [OrderStatus.PAID]: 'Fee yaadhe',
    [OrderStatus.ASSIGNED]: 'Courier qabeenyi',
    [OrderStatus.PICKED_UP]: 'Qabtay',
    [OrderStatus.IN_TRANSIT]: 'Road keessa',
    [OrderStatus.OUT_FOR_DELIVERY]: 'Delivery keessatti',
    [OrderStatus.DELIVERED]: 'Delivery qabne',
    [OrderStatus.FAILED]: 'Delivery hin qabne',
    [OrderStatus.CANCELLED]: 'Waarutti',
    [OrderStatus.RETURNED]: 'Ka dhuftee',
  },
  ti: {
    [OrderStatus.DRAFT]: 'ረቂቅ',
    [OrderStatus.AWAITING_RECEIVER_LOCATION]: 'ዘለዉ ኣለብኹ ቦታ',
    [OrderStatus.PENDING_PAYMENT]: 'ክፍለል እዩ',
    [OrderStatus.PAID]: 'ተገለጸ',
    [OrderStatus.ASSIGNED]: 'ተለዋሕ',
    [OrderStatus.PICKED_UP]: 'ተወስዷ',
    [OrderStatus.IN_TRANSIT]: 'በመንገዲ እዩ',
    [OrderStatus.OUT_FOR_DELIVERY]: 'ንዝመልስ',
    [OrderStatus.DELIVERED]: 'ተረኸል',
    [OrderStatus.FAILED]: 'ኣይተረኸቡን',
    [OrderStatus.CANCELLED]: 'ተሰርቡ',
    [OrderStatus.RETURNED]: 'ተመላሽ',
  },
  so: {
    [OrderStatus.DRAFT]: 'Huna',
    [OrderStatus.AWAITING_RECEIVER_LOCATION]: 'Gaadiidka ka dhacay',
    [OrderStatus.PENDING_PAYMENT]: 'Lagu qabtay',
    [OrderStatus.PAID]: 'Lagu qabtay',
    [OrderStatus.ASSIGNED]: 'Courier-ku samaynay',
    [OrderStatus.PICKED_UP]: 'Qabtay',
    [OrderStatus.IN_TRANSIT]: 'Gudaha',
    [OrderStatus.OUT_FOR_DELIVERY]: 'Lagu sameynayo',
    [OrderStatus.DELIVERED]: 'U diray',
    [OrderStatus.FAILED]: 'Ma qaba',
    [OrderStatus.CANCELLED]: 'Keliya',
    [OrderStatus.RETURNED]: 'Ka dhufay',
  },
};

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
  'btn.showQr': 'QR Code',
  'btn.register': 'Register',
  'btn.callSupport': 'Call support',
  'btn.shareLocation': '📍 Share my location',
  'btn.openOrderForm': '🌐 Open order form',
  'btn.useWizard': '💬 Use chat wizard',

  welcome:
    '*Welcome to Deliver Ethiopia!*\\n\\n' +
    'Send a parcel anywhere in Ethiopia and track it in real time.',
  welcomeBack: '*Welcome back,* {name}!',
  help:
    '*Available Commands*' + '\\n\\n' +
    '/neworder — Create a new order\\n' +
    '/orders — My orders\\n' +
    '/track <number> — Track an order\\n' +
    '/register — Create an account\\n' +
    '/link <phone> — Link existing account\\n' +
    '/me — My profile\\n' +
    '/language — Change language\\n' +
    '/cancel — Cancel current step',
  unknownCommand: 'I did not understand that. Send /help to see what I can do.',
  cancelled: 'Cancelled.',
  notRegistered:
    'Your Telegram is not linked to a Deliver Ethiopia account yet.\\nSend /register to create one, or /link 0912345678 to connect an existing account.',
  registeredAs: 'Signed in as {name}.',
  mainMenu: '*What would you like to do?*',
  menuPlaceholder: 'Choose an option or type a command...',
  locationPlaceholder: 'Tap the button to share location, or tap Skip...',

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
  orderAskPhoto: '📸 Send a photo of the item/package (max 2MB), or tap Skip:',
  orderAskPhotoInvalid: 'Please send a photo of the item, or tap Skip to continue.',
  orderPhotoUploading: '⏳ Compressing and uploading photo...',
  orderPhotoUploaded: '✅ Photo uploaded and compressed successfully ({size})!',
  orderPhotoUploadFailed: 'Could not process that photo. Please try another image, or tap Skip.',
  orderAskWeight: 'Weight in kg, for example 2.5:',
  orderAskSenderLocation:
    '📍 Share your pickup location so the driver knows where to collect the parcel.\\nTap the button below, or tap Skip to use your saved address.',
  orderSenderLocationReceived: '✅ Pickup location saved.',
  orderSenderLocationSkipped: 'Using your saved address for pickup.',
  orderAskPaymentParty: 'Who pays the delivery fee?',
  paySender: 'I pay',
  payReceiver: 'Receiver pays',
  orderConfirmTitle: 'Please confirm the order',
  orderConfirmHint:
    'The final fee depends on the delivery distance. The receiver will get a link to share the drop-off location.',
  orderCreated:
    'Order created.\\nTracking number: {tracking}\\nEstimated fee: {fee}\\n\\nSend the tracking number to the receiver so they can share the drop-off location.',
  orderCreateFailed: 'Could not create the order: {reason}',
  noOrders: 'You have no orders yet. Tap New order to create one.',
  ordersTitle: 'Your orders',
  ordersPageOf: 'Page {page} of {pages}',
  orderDetailsTitle: 'Order {tracking}',
  senderLabel: 'ይላልታ',
  receiverLabel: 'ተቀባይ',
  itemLabel: 'እቃ',
  photoLabel: 'ፎቶ',
  photoAttached: 'Attached',
  feeLabel: 'ድሮ',
  weightLabel: 'Weight',
  statusLabel: 'ሁኔታ',
  trackingLabel: 'ተጋራይ',
  courierLabel: 'ማድረሻ ሰራተኛ',
  eventsTitle: 'Latest updates',
  noEvents: 'No updates yet.',
  estimateFrom: 'from {fee}',
  orderQrPrompt: 'Show this QR code to the driver at pickup time for order {tracking}.',
  qrCodeNotFound: 'QR code not available for this order.',

  trackAsk: 'Send /track <tracking number>, for example /track ETH-2026-ABC123',
  trackNotFound: 'No order found for {number}.',
  trackTitle: 'Tracking {tracking}',

  orderStatusPush: 'Order {tracking}\\nNew status: {status}',

  invalidPhone: 'That phone number does not look right. Use 0912345678 or +251912345678.',
  invalidWeight: 'Send the weight as a number between 0.01 and 5000 kg.',
  invalidName: 'Send at least 2 characters.',
  invalidItem: 'Describe the item in at least 2 characters.',
  orderAskAddMoreItem: 'Add another item?',
  'btn.addAnother': 'Add another item',
  'btn.finishItems': 'Finish & continue',
  'itemsLabel': 'እቃዎች',
  createOrderChoose: 'How would you like to create your order?',
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
  'btn.showQr': 'QR ኮድ',
  'btn.register': 'ተመዝገብ',
  'btn.callSupport': 'ድጋፍ ይደውሉ',
  'btn.shareLocation': '📍 ቦታዬን አጋራ',
  'btn.openOrderForm': '🌐 ፎርም ክፈት',
  'btn.useWizard': '💬 ቦቱን ተጠቀም',

  welcome:
    '*እንኳን ወደ ዴሊቨር ኢትዮጵያ!*\\n\\n' +
    'በኢትዮጵያ ውስጥ በማንኛውም ቦታ ፓርሴል ይላኩ እና በቀጥታ ይከታተሉ።',
  welcomeBack: '*እንኳን ደህና መጡ,* {name}!',
  help:
    '*የሚገኙ ትዕዛዞች*\\n\\n' +
    '/neworder — አዲስ ትዕዛዝ መፍጠር\\n' +
    '/orders — የእኔ ትዕዛዞች\\n' +
    '/track <ቁጥር> — ትዕዛዝ መከታተል\\n' +
    '/register — አካውንት መክፈት\\n' +
    '/link <ስልክ> — አካውንት ማገናኘት\\n' +
    '/me — መገለጫዬ\\n' +
    '/language — ቋንቋ መቀየር\\n' +
    '/cancel — የፈጽም ደረጃ መሰረዝ',
  unknownCommand: 'ያንን አልተረዳሁም። ሊያደርጉ የሚችሉትን ለማየት /help ይላኩ።',
  cancelled: 'ተሰርዟል።',
  notRegistered:
    'ይህ ቴሌግራም ከዴሊቨር ኢትዮጵያ አካውንት ጋር አልተገናኘም።\\nአዲስ ለመክፈት /register ይላኩ፤ ያለውን ለማገናኘት /link 0912345678 ይላኩ።',
  registeredAs: 'እንደ {name} ገብተዋል።',
  mainMenu: '*ምን ማድረግ ይፈልጋሉ?*',
  menuPlaceholder: 'አማራጭ ይምረጡ ወይም ትዕዛዝ ይጻፉ...',
  locationPlaceholder: 'ቦታዎን ለማጋራት አዝራሩን ይጫኑ ወይም ዝለልን ይጫኑ...',

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
  orderAskPhoto: '📸 የእቃውን/የፓርሴሉን ፎቶ ይላኩ (ከ2MB በታች ይቀነሳል)፣ ወይም \\"ዝለል\\" የሚለውን ይጫኑ፦',
  orderAskPhotoInvalid: 'እባክዎ የእቃውን ፎቶ ይላኩ፣ ወይም ያለ ፎቶ ለመጠረም \\"ዝለል\\" የሚለውን ይጫኑ።',
  orderPhotoUploading: '⏳ ፎቶውን እያስተካከልንና እየጫንን ነው...',
  orderPhotoUploaded: '✅ ፎቶው በተሳካ ሁኔታ ተጭኗል ({size})!',
  orderPhotoUploadFailed: 'ፎቶውን ማስኬድ አልተቻለም። እባክዎ ሌላ ፎቶ ይላኩ ወይም \\"ዝለል\\" ይጫኑ።',
  orderAskWeight: 'ክብደት በኪሎግራም፣ ለምሳሌ 2.5፦',
  orderAskSenderLocation:
    '📍 ሹፌሩ እቃዎን የሚወስድበትን ቦታ ያጋሩ።\\nከታች ያለውን አዝራር ይጫኑ፣ ወይም ያስቀመጡትን አድራሻ ለመጠቀም \\"ዝለል\\" ይጫኑ።',
  orderSenderLocationReceived: '✅ የመውሰጃ ቦታ ተቀምጧል።',
  orderSenderLocationSkipped: 'ያስቀመጡት አድራሻ ለመውሰጃ ቦታ ይጠቅማል።',
  orderAskPaymentParty: 'የማድረሻውን ክፍያ ማን ይከፍላል?',
  paySender: 'እኔ እከፍላለሁ',
  payReceiver: 'ተቀባዩ ይከፍላል',
  orderConfirmTitle: 'ትዕዛዝን ያረጋግጡ',
  orderConfirmHint:
    'የመጨረሻው ክፍያ በማድረሻ ርቀት ላይ ይወሰናል። ተቀባዩ የማድረሻ ቦታውን ለማጋራት ሊንክ ይደርሰዋል።',
  orderCreated:
    'ትዕዛዝ ተፈጥሯል።\\nየክትትል ቁጥር፦ {tracking}\\nየሚገመት ክፍያ፦ {fee}\\n\\nተቀባዩ የማድረሻ ቦታውን እንዲያጋራ የክትትል ቁጥሩን ይላኩላቸው።',
  orderCreateFailed: 'ትዕዛዝን መፍጠር አልተቻለም፦ {reason}',
  noOrders: 'እስካሁን ትዕዛዝ የለዎትም። አዲስ ትዕዛዝ ለመስጠት \\"አዲስ ትዕዛዝ\\" ይጫኑ።',
  ordersTitle: 'የእኔ ትዕዛዞች',
  ordersPageOf: 'ገጽ {page} ከ {pages}',
  orderDetailsTitle: 'ትዕዛዝ {tracking}',
  senderLabel: 'ላኪ',
  receiverLabel: 'ተቀባይ',
  itemLabel: 'እቃ',
  photoLabel: 'ፎቶ',
  photoAttached: 'ተያይዟል',
  feeLabel: 'ክፍያ',
  weightLabel: 'ክብደት',
  statusLabel: 'ሁኔታ',
  trackingLabel: 'ክትትል',
  courierLabel: 'ማድረሻ ሰራተኛ',
  eventsTitle: 'የቅርብ ጊዜ መረጃዎች',
  noEvents: 'እስካሁን መረጃ የለም።',
  estimateFrom: 'ከ {fee} ጀምሮ',
  orderQrPrompt: 'ማድረሻ ሰራተኛው እቃውን ሲወስድ ይህን የQR ኮድ ያሳዩ፦ {tracking}',
  qrCodeNotFound: 'ለዚህ ትዕዛዝ የQR ኮድ አልተገኘም።',

  trackAsk: 'የክትትል ቁጥሩን ይላኩ፣ ለምሳሌ /track ETH-2026-ABC123',
  trackNotFound: 'በ {number} ትዕዛዝ አልተገኘም።',
  trackTitle: 'ክትትል {tracking}',

  orderStatusPush: 'ትዕዛዝ {tracking}\\nአዲስ ሁኔታ፦ {status}',

  invalidPhone: 'ስልክ ቁጥሩ ትክክል አይደለም። 0912345678 ወይም +251912345678 ይጠቀሙ።',
  invalidWeight: 'ክብደቱን ከ 0.01 እስከ 5000 ኪሎግራም በቁጥር ይላኩ።',
  invalidName: 'ቢያንስ 2 ፊደሎች ይላኩ።',
  invalidItem: 'እቃውን ቢያንስ በ2 ፊደሎች ይግለጹ።',
  orderAskAddMoreItem: 'የቀላሉ እቃ አድርገዋል?',
  'btn.addAnother': 'የቀላሉ እቃ አድርግ',
  'btn.finishItems': 'ዝግባ ይቀረጡ',
  'itemsLabel': 'እቃዎች',
  createOrderChoose: 'ትዕዛዝዋን እንዴት መፍጠር ይፈልጋሉ?',
};

const om: Dictionary = {
  'btn.newOrder': 'Mudate hunda',
  'btn.orders': 'Hunduma kana',
  'btn.track': 'Baha',
  'btn.account': 'Account',
  'btn.help': 'Gaaddidhaan',
  'btn.language': 'Tilammaa',
  'btn.skip': 'Fufudha',
  'btn.confirm': 'Hundaa ammas jiru',
  'btn.cancel': 'Waarudha',
  'btn.back': 'Kan danda\'u',
  'btn.refresh': 'Keessetti',
  'btn.openTracking': 'Nuqamsee baha',
  'btn.showQr': 'QR Code',
  'btn.register': 'Qabeenyuu',
  'btn.callSupport': 'Gaaddidhaanii keessan',
  'btn.shareLocation': '📍 Ga\'aa kana jira',
  'btn.openOrderForm': '🌐 Form hundaa',
  'btn.useWizard': '💬 Botii keessatti qabe',

  welcome:
    '*Deliver Ethiopia Ilaalaa!*\\n\\n' +
    'Abdiya ittiya fudhateeti Oromiyaa ni barraa keessaa sanyii hunda fi bilisa hin qabne.',
  welcomeBack: '*Illaa akka,* {name}!',
  help:
    '*Ajajaati Gaaddidhaan*\\n\\n' +
    '/neworder — Hunda qabe\\n' +
    '/orders — Hunduma kana\\n' +
    '/track <baha> — Baha qabe\\n' +
    '/register — Account qabe\\n' +
    '/link <phone> — Account hundaa taassisi\\n' +
    '/me — Profilee\\n' +
    '/language — Tilammaa keessa\\n' +
    '/cancel — Fufudha qabe',
  unknownCommand: 'Kana waan walqabtee hin yomne. Gaaddidhaan /help.',
  cancelled: 'Waarutti.',
  notRegistered:
    'Telegramga kana ykn Deliver Ethiopia account keessatti hin turtubne.\\nAccount qabdachuu /neworder fi link /link 0912345678.',
  registeredAs: '{name} akka yaada.',
  mainMenu: '*Maali maqaa keessatti darbe?*',
  menuPlaceholder: 'Masaara bixadhu yaada yaala...',
  locationPlaceholder: 'Button kana qabdi ga\'aa jira, fufudha qabdi...',

  languageTitle: 'Tilammaa bixadhu:',
  languageSet: 'Tilammaa keella hojjate.',

  askName: 'Magala barbaachisa qabdi:',
  askPhone: 'Phone qabdi, Missoo 0912345678:',
  askAddress: 'Address qabdi, fufudha qabdi:',
  registrationDone: 'Registration baay\'ee. /neworder keessatti hundaa sanyii.',
  registrationFailed: 'Registration hin baay\'ne: {reason}',
  accountLinked: 'Account taassisi. Yaada {name}.',
  accountLinkFailed: 'Phone kana keessatti account hin taane.',
  accountInUse:
    'Account kana Telegram kana keessatti taassamne. Gaaddidhaan keessan.',
  accountUnlinked: 'Account Telegram kana qabdi.',
  noLinkedAccount: 'Telegram kana account qabdi.',
  profileTitle: 'Profilee',
  nameLabel: 'Magala',
  phoneLabel: 'Phone',
  addressLabel: 'Address',
  notSet: 'hin qabne',

  orderAskReceiverName: 'Magala jiraatan:',
  orderAskReceiverPhone: 'Phone jiraatan, Missoo 0912345678:',
  orderAskItem: 'Sanyii maali qabdi? Item magaalisa qabdi:',
  orderAskPhoto: '📸 Item/package gala photo qabdi (2MB kuma), fufudha qabdi:',
  orderAskPhotoInvalid: 'Photo qabdi, fufudha qabdi.',
  orderPhotoUploading: '⏳ Photo gala hin keessan...',
  orderPhotoUploaded: '✅ Photo gala hin keessan qabne ({size})!',
  orderPhotoUploadFailed: 'Photo hin qabne. Image kana qabdi.',
  orderAskWeight: 'Galiin keessa, Missoo 2.5:',
  orderAskSenderLocation:
    '📍 Ga\'aa keessanitti barbaachiisa qabdi.\\nButton kana qabdi.',
  orderSenderLocationReceived: '✅ Ga\'aa keessan qabne.',
  orderSenderLocationSkipped: 'Address keessan qabdi.',
  orderAskPaymentParty: 'Delivery fee kan maali yaadhe?',
  paySender: 'Ani yaadhe',
  payReceiver: 'Jiraatan yaadhe',
  orderConfirmTitle: 'Hundaa confirm qabdi',
  orderConfirmHint:
    'Fee miti road keessatti qaba. Jiraatan link ykn qabe.',
  orderCreated:
    'Hundaa qabne.\\nBaha tracking: {tracking}\\nFee estimated: {fee}\\n\\nTracking number jiraatan qabdi.',
  orderCreateFailed: 'Hundaa hin qabne: {reason}',
  noOrders: 'Hundaa hin qabne. New order qabdi.',
  ordersTitle: 'Hunduma kana',
  ordersPageOf: 'Page {page} kuma {pages}',
  orderDetailsTitle: 'ድሮ {tracking}',
  senderLabel: 'ይላልታ',
  receiverLabel: 'ተቀባይ',
  itemLabel: 'እቃ',
  photoLabel: 'ፎቶ',
  photoAttached: 'ተያይዟል',
  feeLabel: 'ድሮ',
  weightLabel: 'ክብር',
  statusLabel: 'ሁኔታ',
  trackingLabel: 'ተጋራይ',
  courierLabel: 'ማድረሻ ሰራተኛ',
  eventsTitle: 'የቅርብ ጊዜ መረጃዎች',
  noEvents: 'እስካሁን መረጃ የለም',
  estimateFrom: 'ከ {fee} ጀምሮ',
  orderQrPrompt: 'የQR ኮድ እንዲሳዩ ማድረሻ ሰራተኛው {tracking}',
  qrCodeNotFound: 'የQR ኮድ አልተገኘም',

  trackAsk: 'የተጋራይ ቁጥር /track, ምስሉ /track ETH-2026-ABC123',
  trackNotFound: 'በ {number} ድሮ አልተገኘም',
  trackTitle: 'Tracking {tracking}',

  orderStatusPush: 'ድሮ {tracking}\\nአዲስ ሁኔታ: {status}',

  invalidPhone: 'Phone kana hin qabne. 0912345678 ykn +251912345678.',
  invalidWeight: 'ክብር ቁጥር 0.01 እስከ 5000 ይልከኹለት',
  invalidName: 'ቢያንስ 2 ፊደሎች ይልከኹለት',
  invalidItem: 'እቃውን ቢያንስ 2 ፊደሎች ይግለጹ',
  orderAskAddMoreItem: 'ሌላ እቃ አድርገዋል?',
  'btn.addAnother': 'ሌላ እቃ አድርግ',
  'btn.finishItems': 'ዝግባ ይቀረጡ',
  'itemsLabel': 'እቃዎች',
  createOrderChoose: 'ድሮውን እንዴት መፍጠር ይፈልጋሉ?',
};

const ti: Dictionary = {
  'btn.newOrder': 'መወያያ ትዕዛዝ',
  'btn.orders': 'ትዕዛዞችኹና',
  'btn.track': 'ተጋራይ',
  'btn.account': 'አካዐውንት',
  'btn.help': 'እውነተኛ እድገት',
  'btn.language': 'ቋንቋ',
  'btn.skip': 'ግነሳ',
  'btn.confirm': 'ልዩት ክልኸብል',
  'btn.cancel': 'ይሰርቡ',
  'btn.back': 'ተመለስ',
  'btn.refresh': 'ዝግባ',
  'btn.openTracking': 'ክትትል መከተል',
  'btn.showQr': 'QR ኮድ',
  'btn.register': 'ዝርዝር',
  'btn.callSupport': 'ድጋፍ እምነት',
  'btn.shareLocation': '📍 ስንሕ ስነ ስብራቕ',
  'btn.openOrderForm': '🌐 ትዕዛዝ ቅዳም',
  'btn.useWizard': '💬 ቦት ዝገበር',

  welcome:
    '*በሰላም ወደ ዴሊቨር ኢትዮጵያ!*\\n\\n' +
    'በኢትዮጵያ ውስጥ በትንሽ ቦታ ፓርሴል ይፈጽሙ።',
  welcomeBack: '*ደህና መጣልኩ,* {name}!',
  help:
    '*እድገት ተማኮት*\\n\\n' +
    '/neworder — ትዕዛዝ መወያያ\\n' +
    '/orders — ትዕዛዞችኹና\\n' +
    '/track <ቁጥር> — ትዕዛዝ ተግባር\\n' +
    '/register — መዝርዝር\\n' +
    '/link <phone> — ስም ለውጥና\\n' +
    '/me — ጽሑፍ ክልኸብ\\n' +
    '/language — ቋንቋ ምርመራ\\n' +
    '/cancel — ምስክርን ይሰርቡ',
  unknownCommand: 'እንደ ትንቢት ስራ ስም አይተባብርን እንዲሁም /help እስራት.',
  cancelled: 'ተሰርቡ.',
  notRegistered:
    'Telegram ይህ ዴሊቨር ኢትዮጵያ አካዐውንት ኣለብኹ ኣብዚ እዩ። ንገበር ንኽርገይ /neworder ንኣኽር /link 0912345678.',
  registeredAs: 'ኣብ {name} ናብዩ.',
  mainMenu: '*ኣብዚ ኣብታ እንታይ ኣብዚ እንታይ?*',
  menuPlaceholder: 'ኣብዚ ነይሪ ምርመራ ወይም ዝግባ.',
  locationPlaceholder: 'ስንሕ ስብራቕ ዝልቦ በለይ ኣብዚ ትኽልሉ...',

  languageTitle: 'ቋንቋ ምርመራ:',
  languageSet: 'ቋንቋ በትግርኛ ተረኽበይኩ ኣልኸው ኣበልዩ።',

  askName: 'ስም እንታይ ንኹና?',
  askPhone: 'ስልክ ቁጥር ተረኸልን ሓይሊ 0912345678:',
  askAddress: 'ስንሕ ንኸውን ዘለዎ ወይም ግነሳ:',
  registrationDone: 'መዝርዝር ተገለጸ። ንኽርገይ /neworder ኣብዚ ትዕዛዝ መወያያ.',
  registrationFailed: 'መዝርዝር ኣይተረኸቡን: {reason}',
  accountLinked: 'አካዐውንት ተለዋሕ። ኣብ {name} ናብዩ.',
  accountLinkFailed: 'ኣብ ስልክ ቁጥሩ እዩ አካዐውንት ኣለብኹ.',
  accountInUse:
    'ስም ተለዋሕ እንዲኸኸይ ንኽረም። ዓይነት ኣስታድኤ ኣብ እንታይ.',
  accountUnlinked: 'አካዐውንት ኣብ Telegram ኣለብኹ.',
  noLinkedAccount: 'Telegram ይህ አካዐውንት ኣለብኹ.',
  profileTitle: 'ጽሑፍ ክልኸብ',
  nameLabel: 'ስም',
  phoneLabel: 'ስልክ',
  addressLabel: 'ስንሕ',
  notSet: 'ኣይተረኸቡንን',

  orderAskReceiverName: 'ስም ዘለዎ:',
  orderAskReceiverPhone: 'ስልክ ቁጥር, ሓይሊ 0912345678:',
  orderAskItem: 'ኣብዚ ስርኣት ንኽብሉ? እቃውን ዝገቡ:',
  orderAskPhoto: '📸 ፎቶ ዝገቡ (2MB), Skip እዩ:',
  orderAskPhotoInvalid: 'ፎቶ ኣይተረኸቡን, Skip እዩ.',
  orderPhotoUploading: '⏳ ፎቶ ምግብር መግለጽ...',
  orderPhotoUploaded: '✅ ፎቶ ተረኸልን ({size})!',
  orderPhotoUploadFailed: 'ፎቶ ኣይተረኸቡን. Image ንኻኣይ ይብል.',
  orderAskWeight: 'ክብር በኪሎግራም, ሓይሊ 2.5:',
  orderAskSenderLocation:
    '📍 ስንሕ ስብራቕ ዘለዉ ይብል እንታይ.\\nተጠቃሚ ስንሕ እዩ.',
  orderSenderLocationReceived: '✅ ስንሕ ዘለዉ ተረኸልን.',
  orderSenderLocationSkipped: 'አድራሻ ኣብዚ ትብል።',
  orderAskPaymentParty: 'ድሮ ይጥብል?',
  paySender: 'እኔ ይጥብልኹ',
  payReceiver: 'ተቀባይ ይጥብል',
  orderConfirmTitle: 'ርእሰ ትዕዛዝ',
  orderConfirmHint:
    'ሓቂ fee ኣብ road ክልኸብል ኣለብኹ. ተቀባይ ንምእረጻ link.',
  orderCreated:
    'ትዕዛዝ ተገለጸ።\\nTracking number: {tracking}\\nFee estimated: {fee}\\n\\nTracking number ኣብ ተቀባይ ዘለዎ.',
  orderCreateFailed: 'ትዕዛዝ ኣይተረኸቡን: {reason}',
  noOrders: 'ንኽርገይ ትዕዛዝ ኣለብኹ. ንኽርገይ ድሮ qabee.',
  ordersTitle: 'ትዕዛዞችኹና',
  ordersPageOf: 'Page {page} kuma {pages}',
  orderDetailsTitle: 'ድሮ {tracking}',
  senderLabel: 'ይላልታ',
  receiverLabel: 'ተቀባይ',
  itemLabel: 'እቃ',
  photoLabel: 'ፎቶ',
  photoAttached: 'ተያይዟል',
  feeLabel: 'ድሮ',
  weightLabel: 'ክብር',
  statusLabel: 'ሁኔታ',
  trackingLabel: 'ተጋራይ',
  courierLabel: 'ማድረሻ ሰራተኛ',
  eventsTitle: 'የቅርብ ጊዜ መረጃዎች',
  noEvents: 'እስካሁን መረጃ የለም',
  estimateFrom: 'ከ {fee} ጀምሮ',
  orderQrPrompt: 'የQR ኮድ እንዲሳዩ ማድረሻ ሰራተኛው {tracking}',
  qrCodeNotFound: 'የQR ኮድ አልተገኘም',

  trackAsk: 'የተጋራይ ቁጥር /track, ምስሉ /track ETH-2026-ABC123',
  trackNotFound: 'በ {number} ድሮ አልተገኘም',
  trackTitle: 'Tracking {tracking}',

  orderStatusPush: 'ድሮ {tracking}\\nአዲስ ሁኔታ: {status}',

  invalidPhone: 'ስልክ ቁጥሩ ትክክል ኣይተረኸቡን. 0912345678 ወይም +251912345678.',
  invalidWeight: 'ክብር ቁጥር 0.01 እስከ 5000 ይልከኹለት',
  invalidName: 'ቢያንስ 2 ፊደሎች ይልከኹለት',
  invalidItem: 'እቃውን ቢያንስ 2 ፊደሎች ይግለጹ',
  orderAskAddMoreItem: 'ሌላ እቃ አድርገዋል?',
  'btn.addAnother': 'ሌላ እቃ አድርግ',
  'btn.finishItems': 'ዝግባ ይቀረጡ',
  'itemsLabel': 'እቃዎች',
  createOrderChoose: 'ድሮውን እንዴት መፍጠር ይፈልጋሉ?',
};

const so: Dictionary = {
  'btn.newOrder': 'Order cusub',
  'btn.orders': 'Order-ka',
  'btn.track': 'Talli',
  'btn.account': 'Account',
  'btn.help': 'Caawimaad',
  'btn.language': 'Tilmaamaha',
  'btn.skip': 'Furi',
  'btn.confirm': 'Order-ku diyaar gal',
  'btn.cancel': 'Keliya',
  'btn.back': 'Maleh',
  'btn.refresh': 'Marqaali',
  'btn.openTracking': 'Talli open',
  'btn.showQr': 'QR Code',
  'btn.register': 'Kaydaha',
  'btn.callSupport': 'Caawimaad diyaar',
  'btn.shareLocation': '📍 Gaadiidka',
  'btn.openOrderForm': '🌐 Form-ka order',
  'btn.useWizard': '💬 Bot-ka isticlaal',

  welcome:
    '*Nabad gelyo Deliver Ethiopia!*\\n\\n' +
    'Waxaad ula ordhantay Ethiopia muddo kasta.',
  welcomeBack: '*Nabad gelyo,* {name}!',
  help:
    '*Caawimaad:*\\n\\n' +
    '/neworder — Order cusub\\n' +
    '/orders — Order-ka\\n' +
    '/track <baha> — Talli\\n' +
    '/register — Account kaydo\\n' +
    '/link <phone> — Account link\\n' +
    '/me — Profile\\n' +
    '/language — Tilmaamaha\\n' +
    '/cancel — Furi ka samay',
  unknownCommand: 'Ma qofayna ma qabaa. /help caawin.',
  cancelled: 'Keliya.',
  notRegistered:
    'Telegramgan Deliver Ethiopia account-ka ma qabaa.\\n/neworder account cusub.',
  registeredAs: 'Ka xiranayaa {name}.',
  mainMenu: '*Maxay tahay aad u daray?*',
  menuPlaceholder: 'Masaar uu yahay...',
  locationPlaceholder: 'Gaadiidka qabdi, furi qabdi:',

  languageTitle: 'Tilmaamaha hel:',
  languageSet: 'Tilmaamaha horey u qabtay.',

  askName: 'Magaca barwaaqo qabdi:',
  askPhone: 'Telefonka qabdi, Missoo 0912345678:',
  askAddress: 'Xaafadda qabdi, furi qabdi:',
  registrationDone: 'Kaydfalka buuxiyey. /neworder order cusub.',
  registrationFailed: 'Kaydfalka ma qaaday: {reason}',
  accountLinked: 'Account taaggii ka dhameystay. Yaada {name}.',
  accountLinkFailed: 'Telefonka account ma qabaa.',
  accountInUse:
    'Account-ka Telegram kale u jiro. Gaadiidhaan ka dhacay.',
  accountUnlinked: 'Account Telegram-ka furi qabtay.',
  noLinkedAccount: 'Telegram-ka account ma qabaa.',
  profileTitle: 'Profile-ka',
  nameLabel: 'Magaca',
  phoneLabel: 'Telefonka',
  addressLabel: 'Xaafadda',
  notSet: 'Ma qabaa',

  orderAskReceiverName: 'Magaca receiver:',
  orderAskReceiverPhone: 'Phone receiver, Missoo 0912345678:',
  orderAskItem: 'Item waxaad diyaarinayaa? Item magaca qabdi:',
  orderAskPhoto: '📸 Photo item qabdi (2MB kuma), furi qabdi:',
  orderAskPhotoInvalid: 'Photo item qabdi, furi qabdi.',
  orderPhotoUploading: '⏳ Photo upload qabdi...',
  orderPhotoUploaded: '✅ Photo upload qabtay ({size})!',
  orderPhotoUploadFailed: 'Photo ma qabay. Image kana qabdi.',
  orderAskWeight: 'Weight qabdi, Missoo 2.5:',
  orderAskSenderLocation:
    '📍 Gaadiidka sender qabdi.\\nButton qabdi.',
  orderSenderLocationReceived: '✅ Gaadiidka qabtay.',
  orderSenderLocationSkipped: 'Address qabdi.',
  orderAskPaymentParty: 'Delivery fee maxay yaadhi doona?',
  paySender: 'Aniga yaadhi doonay',
  payReceiver: 'Receiver yaadhi doona',
  orderConfirmTitle: 'Order-ka diyaar gal',
  orderConfirmHint:
    'Fee miti road-ka qaba. Receiver link gaadiidka.',
  orderCreated:
    'Order qabtay.\\nTracking number: {tracking}\\nFee estimated: {fee}\\n\\nTracking number receiver qabdi.',
  orderCreateFailed: 'Order ma qabay: {reason}',
  noOrders: 'Order ma qabaa. New order qabdi.',
  ordersTitle: 'Order-ka',
  ordersPageOf: 'Page {page} kuma {pages}',
  orderDetailsTitle: 'Order {tracking}',
  senderLabel: 'Sender',
  receiverLabel: 'Receiver',
  itemLabel: 'Item',
  photoLabel: 'Photo',
  photoAttached: 'Qabtay',
  feeLabel: 'Fee',
  weightLabel: 'Weight',
  statusLabel: 'Status',
  trackingLabel: 'Tracking',
  courierLabel: 'Courier',
  eventsTitle: 'Jirraan',
  noEvents: 'Jirraan ma qabaa.',
  estimateFrom: 'fee {fee}',
  orderQrPrompt: 'QR code kana qabdi, driver keessan.',
  qrCodeNotFound: 'QR code ma qabay.',

  trackAsk: 'Tracking number /track, Missoo /track ETH-2026-ABC123',
  trackNotFound: 'Hundaa {number} ma qabaa.',
  trackTitle: 'Tracking {tracking}',

  orderStatusPush: 'Order {tracking}\\nStatus bishaan: {status}',

  invalidPhone: 'Telefonka ma qabay. 0912345678 ykn +251912345678.',
  invalidWeight: 'Weight number qabdi, 0.01 fi 5000.',
  invalidName: '2 maqaa qabdi.',
  invalidItem: 'Item magaalisa 2 maqaa qabdi.',
  orderAskAddMoreItem: 'Item kana qabdi?',
  'btn.addAnother': 'Item kana qabdi',
  'btn.finishItems': 'Fiti & qabdi',
  'itemsLabel': 'Items',
  createOrderChoose: 'Order how maali qabdame?',
};

const DICTIONARIES: Record<Lang, Dictionary> = { en, am, om, ti, so };

export function isLang(value: string | undefined | null): value is Lang {
  return value === 'en' || value === 'am' || value === 'om' || value === 'ti' || value === 'so';
}

export function t(
  lang: Lang,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const dictionary = DICTIONARIES[lang] ?? DICTIONARIES[DEFAULT_LANG];
  const template = dictionary[key] ?? DICTIONARIES[DEFAULT_LANG][key] ?? key;
  if (!vars) return template;
  return template.replace(/\\{(\\w+)\\}/g, (match, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : match,
  );
}

export function statusLabel(lang: Lang, status: OrderStatus): string {
  return STATUS_LABELS[lang]?.[status] ?? STATUS_LABELS[DEFAULT_LANG][status] ?? status;
}