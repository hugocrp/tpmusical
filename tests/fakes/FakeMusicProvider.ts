import type { MusicProvider } from "../../src/application/ports/MusicProvider.js";
import type { Track } from "../../src/domain/types.js";

export class FakeMusicProvider implements MusicProvider {
  public readonly queries: string[] = [];

  constructor(private outcome: Track | null | Error = null) {}

  willReturn(outcome: Track | null | Error): void {
    this.outcome = outcome;
  }

  async findTrack(query: string): Promise<Track | null> {
    this.queries.push(query);
    if (this.outcome instanceof Error) {
      throw this.outcome;
    }
    return this.outcome;
  }
}
