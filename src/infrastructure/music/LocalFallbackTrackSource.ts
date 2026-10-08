import { injectable } from "tsyringe";
import type { FallbackTrackSource } from "../../application/ports/FallbackTrackSource.js";
import type { Track } from "../../domain/types.js";

const DEFAULT_TRACK: Track = { title: "Here Comes the Sun", artist: "The Beatles" };

const LOCAL_TRACKS: readonly Track[] = [
  DEFAULT_TRACK,
  { title: "Good Morning", artist: "Kanye West" },
  { title: "Wake Me Up", artist: "Avicii" },
  { title: "Lovely Day", artist: "Bill Withers" },
  { title: "Riders on the Storm", artist: "The Doors" },
  { title: "Let It Snow", artist: "Dean Martin" },
];

const normalize = (text: string): string => text.trim().toLowerCase();

@injectable()
export class LocalFallbackTrackSource implements FallbackTrackSource {
  pick(query: string): Track {
    const wanted = normalize(query);
    return LOCAL_TRACKS.find((track) => normalize(track.title) === wanted) ?? DEFAULT_TRACK;
  }
}
