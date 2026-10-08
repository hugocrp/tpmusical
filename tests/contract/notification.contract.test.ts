import { EmailNotificationChannel } from "../../src/infrastructure/notification/EmailNotificationChannel.js";
import { PushNotificationChannel } from "../../src/infrastructure/notification/PushNotificationChannel.js";
import { SmsNotificationChannel } from "../../src/infrastructure/notification/SmsNotificationChannel.js";
import { MockEmailClient } from "../../src/vendors/MockEmailClient.js";
import { MockPushService } from "../../src/vendors/MockPushService.js";
import { MockSmsGateway } from "../../src/vendors/MockSmsGateway.js";
import { describeNotificationChannelContract } from "./notificationChannelContract.js";

describeNotificationChannelContract({
  channelName: "email",
  createChannel: (output, outages) => new EmailNotificationChannel(new MockEmailClient(output, outages), "reveil@example.org"),
  address: "alice@example.org",
});

describeNotificationChannelContract({
  channelName: "sms",
  createChannel: (output, outages) => new SmsNotificationChannel(new MockSmsGateway(output, outages)),
  address: "+33600000001",
});

describeNotificationChannelContract({
  channelName: "push",
  createChannel: (output, outages) => new PushNotificationChannel(new MockPushService(output, outages)),
  address: "device-token-alice",
});
