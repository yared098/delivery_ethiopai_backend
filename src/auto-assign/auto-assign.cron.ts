import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AutoAssignService } from './auto-assign.service';

@Injectable()
export class AutoAssignCron {
  private readonly logger = new Logger(AutoAssignCron.name);

  constructor(private readonly service: AutoAssignService) {}

  // Every 2 minutes: '0 */2 * * * *'
  @Cron('0 */2 * * * *')
  async handleNoShows() {
    try {
      await this.service.detectNoShows();
    } catch (e) {
      this.logger.error('No-show cron failed', e);
    }
  }
}