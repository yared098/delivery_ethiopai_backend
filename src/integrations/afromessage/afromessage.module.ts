import { Module } from '@nestjs/common';
import { AfroMessageService } from './afromessage.service';
import { TelegramModule } from '../../telegram/telegram.module';

@Module({
  imports: [TelegramModule],           // ← add this
  providers: [AfroMessageService],
  exports: [AfroMessageService],
})
export class AfroMessageModule {}