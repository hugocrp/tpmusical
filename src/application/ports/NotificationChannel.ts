import type { WakeUpMessage } from "../../domain/types.js";

export interface NotificationChannel {
  send(address: string, message: WakeUpMessage): Promise<void>;
}
