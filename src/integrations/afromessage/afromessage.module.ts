import { Global, Module } from '@nestjs/common';
import { AfroMessageService } from './afromessage.service';
import { TelegramModule } from '../../telegram/telegram.module';

@Global()
@Module({
  imports: [TelegramModule],
  providers: [AfroMessageService],
  exports: [AfroMessageService],
})
export class AfroMessageModule {}