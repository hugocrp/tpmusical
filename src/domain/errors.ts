export class InvalidWakeUpRequestError extends Error {
  constructor(reason: string) {
    super(`Demande de réveil invalide : ${reason}`);
    this.name = "InvalidWakeUpRequestError";
  }
}

export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`Utilisateur inconnu : "${userId}"`);
    this.name = "UserNotFoundError";
  }
}

export class MusicProviderUnavailableError extends Error {
  constructor(provider: string, reason: string, cause?: unknown) {
    super(`Fournisseur musical "${provider}" indisponible : ${reason}`);
    this.name = "MusicProviderUnavailableError";
    this.cause = cause;
  }
}

export class ChannelUnavailableError extends Error {
  constructor(channel: string, reason: string, cause?: unknown) {
    super(`Canal "${channel}" indisponible : ${reason}`);
    this.name = "ChannelUnavailableError";
    this.cause = cause;
  }
}

export class NotificationFailedError extends Error {
  constructor(
    userId: string,
    public readonly incidents: readonly string[],
  ) {
    super(`Aucun canal n'a pu notifier l'utilisateur "${userId}" : ${incidents.join(" ; ")}`);
    this.name = "NotificationFailedError";
  }
}
