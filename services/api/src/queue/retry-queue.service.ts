import { Injectable, Logger } from '@nestjs/common';

export type RetryableFn<T> = () => Promise<T>;

@Injectable()
export class RetryQueueService {
  private readonly log = new Logger(RetryQueueService.name);

  async withRetries<T>(
    label: string,
    fn: RetryableFn<T>,
    delaysMs: number[] = [5000, 30_000, 120_000],
  ): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        if (!this.isRetriable(e) || attempt === delaysMs.length) {
          throw e;
        }
        const wait = delaysMs[attempt] ?? 5000;
        this.log.warn(
          `${label} attempt ${attempt + 1} failed, retry in ${wait}ms`,
        );
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    throw lastErr;
  }

  private isRetriable(err: unknown): boolean {
    const any = err as { response?: { status?: number }; code?: string };
    const status = any.response?.status;
    if (status === 429 || status === 502 || status === 503) return true;
    if (any.code === 'ECONNABORTED' || any.code === 'ETIMEDOUT') return true;
    return false;
  }
}
