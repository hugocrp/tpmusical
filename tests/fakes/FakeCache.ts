import type { Cache } from "../../src/application/ports/Cache.js";

export class FakeCache<V> implements Cache<string, V> {
  public readonly entries = new Map<string, V>();
  public failOnSet = false;

  async get(key: string): Promise<V | undefined> {
    return this.entries.get(key);
  }

  async set(key: string, value: V): Promise<void> {
    if (this.failOnSet) {
      throw new Error("disque plein");
    }
    this.entries.set(key, value);
  }
}
