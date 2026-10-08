import { describe, expect, it } from "vitest";
import type { NotificationChannel } from "../../src/application/ports/NotificationChannel.js";
import { ChannelUnavailableError } from "../../src/domain/errors.js";
import type { WakeUpMessage } from "../../src/domain/types.js";
import { FakeLineWriter } from "../fakes/FakeLineWriter.js";

export interface NotificationChannelContractFixtures {
  channelName: string;
  createChannel: (output: FakeLineWriter, outages: readonly string[]) => NotificationChannel;
  address: string;
}

const MESSAGE: WakeUpMessage = { title: "Réveil musical", body: "Votre morceau du jour : « Lovely Day » de Bill Withers." };

export function describeNotificationChannelContract(fixtures: NotificationChannelContractFixtures): void {
  describe(`Contrat NotificationChannel (${fixtures.channelName})`, () => {
    it("envoi réussi -> un seul message, à la bonne adresse, avec titre et corps", async () => {
      const output = new FakeLineWriter();
      const channel = fixtures.createChannel(output, []);

      await expect(channel.send(fixtures.address, MESSAGE)).resolves.toBeUndefined();

      expect(output.lines).toHaveLength(1);
      expect(output.lines[0]).toContain(fixtures.address);
      expect(output.lines[0]).toContain(MESSAGE.title);
      expect(output.lines[0]).toContain(MESSAGE.body);
    });

    it("panne du canal -> ChannelUnavailableError nommant le canal, rien n'est envoyé", async () => {
      const output = new FakeLineWriter();
      const channel = fixtures.createChannel(output, [fixtures.channelName]);

      const failure = await channel.send(fixtures.address, MESSAGE).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ChannelUnavailableError);
      expect((failure as Error).message).toContain(`"${fixtures.channelName}"`);
      expect(output.lines).toEqual([]);
    });

    it("panne d'un autre canal -> sans effet", async () => {
      const output = new FakeLineWriter();
      const channel = fixtures.createChannel(output, ["autre-canal"]);

      await channel.send(fixtures.address, MESSAGE);

      expect(output.lines).toHaveLength(1);
    });
  });
}
