import { Global, Module } from '@nestjs/common';
import { RetryQueueService } from './retry-queue.service';

/**
 * In-process retry helper; swap for BullMQ/Redis in production scale-out.
 */
@Global()
@Module({
  providers: [RetryQueueService],
  exports: [RetryQueueService],
})
export class QueueModule {}
