export class LatencyAuditor {
  private startTimestamp: number;
  private activeTimestamp: number;
  private buffer: string[] = [];

  private constructor(private readonly context: string, private readonly auditZeroLatency: boolean) {
  }

  static beginAudit(context: string, auditZeroLatency = true): LatencyAuditor {
    return new LatencyAuditor(context, auditZeroLatency).start();
  }

  private start(): LatencyAuditor {
    this.startTimestamp = performance.now();
    this.activeTimestamp = this.startTimestamp;
    return this;
  }

  record(desc: string): void {
    this.writeEntry(desc, performance.now());
  }

  recordAndReset(desc: string, extra?: any): void {
    const now = performance.now();
    this.writeEntry(desc, now, extra);
    this.activeTimestamp = now;
  }

  stop() {
    this.writeEntry('done', performance.now());
    for (const entry of this.buffer) {
      console.log(entry);
    }
  }

  private writeEntry(desc: string, end: number, extra: any = '') {
    const diff = Math.round(end - this.activeTimestamp);

    if (diff !== 0 || this.auditZeroLatency) {
      this.buffer.push(`${this.context}:${desc} ${diff}ms, ${extra}`);
    }
  }
}
