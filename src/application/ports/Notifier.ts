import type { Delivery, UserPreferences, WakeUpMessage } from "../../domain/types.js";

export interface Notifier {
  notify(preferences: UserPreferences, message: WakeUpMessage): Promise<Delivery>;
}
