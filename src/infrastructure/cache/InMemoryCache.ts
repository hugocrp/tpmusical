import { inject, injectable } from "tsyringe";
import type { Cache } from "../../application/ports/Cache.js";
import type { Clock } from "../../application/ports/Clock.js";
import { CACHE_TTL_MS, CLOCK } from "../../di/infrastructureTokens.js";

@injectable()
export class InMemoryCache<K, V> implements Cache<K, V> {
  private readonly entries = new Map<K, { value: V; expiresAt: number }>();

  constructor(
    @inject(CLOCK) private readonly clock: Clock,
    @inject(CACHE_TTL_MS) private readonly ttlMs: number,
  ) {}

  async get(key: K): Promise<V | undefined> {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt <= this.clock.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key: K, value: V): Promise<void> {
    this.entries.set(key, { value, expiresAt: this.clock.now() + this.ttlMs });
  }
}
