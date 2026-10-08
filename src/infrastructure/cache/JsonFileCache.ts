import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { inject, injectable } from "tsyringe";
import type { Cache } from "../../application/ports/Cache.js";
import { PREFERENCES_CACHE_FILE } from "../../di/infrastructureTokens.js";

@injectable()
export class JsonFileCache<V> implements Cache<string, V> {
  constructor(@inject(PREFERENCES_CACHE_FILE) private readonly filePath: string) {}

  async get(key: string): Promise<V | undefined> {
    const entries = await this.readEntries();
    return Object.hasOwn(entries, key) ? entries[key] : undefined;
  }

  async set(key: string, value: V): Promise<void> {
    const entries = await this.readEntries();
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify({ ...entries, [key]: value }, null, 2));
  }

  private async readEntries(): Promise<Record<string, V>> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.filePath, "utf8"));
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, V>) : {};
    } catch {
      return {};
    }
  }
}
