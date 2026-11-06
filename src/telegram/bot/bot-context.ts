import { Lang } from '../i18n/telegram.i18n';
import { ReplyMarkup } from './keyboards';

/** Everything a handler needs to reply in the current chat. */
export interface BotContext {
  chatId: string;
  lang: Lang;
  say(text: string, keyboard?: ReplyMarkup): Promise<void>;
}
