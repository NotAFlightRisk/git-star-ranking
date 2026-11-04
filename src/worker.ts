import app from '../.svelte-kit/cloudflare/_worker.js';
import { maybeSweep, refreshDue, sweepSlice, type Job } from './lib/server/crawl.ts';
import { report } from './lib/server/report.ts';
import { filling, snapshot } from './lib/server/snapshot.ts';
import { flush, meter } from './lib/server/usage.ts';

export { TokenPool } from './lib/server/pool.ts';

const SNAPSHOT = '17 */6 * * *';
// leaves the next ten-minute cron a clear run
const WORK_MS = 8 * 60_000;

export default {
  fetch: app.fetch,

  async scheduled(controller: { cron: string }) {
    meter('worker_requests');
    try {
      if (controller.cron === SNAPSHOT) await snapshot();
      else {
        if (await filling()) await snapshot();
        await maybeSweep();
        await refreshDue(Date.now() + WORK_MS);
      }
    } catch (error) {
      await report(error, undefined, 'cron');
      throw error;
    } finally {
      await flush(true);
    }
  },

  async queue(batch: { messages: readonly QueueMessage<Job>[] }) {
    meter('worker_requests');
    for (const message of batch.messages) {
      try {
        const wait = await sweepSlice(message.body);
        if (wait) message.retry({ delaySeconds: Math.ceil(wait / 1000) });
        else message.ack();
      } catch (error) {
        await report(error, undefined, 'queue');
        message.retry({ delaySeconds: 60 });
      }
    }
    await flush(true);
  }
};
