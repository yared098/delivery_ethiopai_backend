import { IsOptional, IsBoolean } from 'class-validator';

export class SendReceiverLinkDto {
  @IsOptional()
  @IsBoolean()
  sendSms?: boolean;

  @IsOptional()
  @IsBoolean()
  sendTelegram?: boolean;

  @IsOptional()
  @IsBoolean()
  sendWhatsapp?: boolean;
}
