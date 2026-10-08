import type { Track } from "../../domain/types.js";

export interface MusicProvider {
  findTrack(query: string): Promise<Track | null>;
}
