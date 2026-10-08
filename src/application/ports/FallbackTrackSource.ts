import type { Track } from "../../domain/types.js";

export interface FallbackTrackSource {
  pick(query: string): Track;
}
