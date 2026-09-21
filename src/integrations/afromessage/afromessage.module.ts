import { Global, Module } from '@nestjs/common';
import { AfroMessageService } from './afromessage.service';

@Global()
@Module({
  providers: [AfroMessageService],
  exports: [AfroMessageService],
})
export class AfroMessageModule {}
