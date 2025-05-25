import {
  IMessageBroker,
  EachMessagePayload,
  MessageHandler,
  IConfigurationService,
} from "contracts.ts";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export class SupabaseMessageBroker implements IMessageBroker {
  private client: SupabaseClient;
  private readonly topics: Map<string, MessageHandler[]> = new Map();

  constructor(configService: IConfigurationService) {
    const url = configService.getSupabaseUrl();
    const key = configService.getSupabaseKey();
    this.client = createClient(url, key);
  }

  async setup(): Promise<void> {
    // Setup logic for Supabase Realtime channels
  }

  async start(): Promise<void> {
    for (const [topic, handlers] of this.topics.entries()) {
      const channel = this.client.channel(topic);
      channel.on("broadcast", { event: topic }, async (payload) => {
        const message = payload.payload as EachMessagePayload["message"];
        for (const handler of handlers) {
          await handler({ topic, message });
        }
      });
      await channel.subscribe();
    }
  }

  async subscribe(topic: string, handler: MessageHandler): Promise<void> {
    const handlers = this.topics.get(topic) || [];
    handlers.push(handler);
    this.topics.set(topic, handlers);
  }

  async unsubscribe(topic: string): Promise<void> {
    this.topics.delete(topic);
  }

  async produce(topic: string, messageBuffer: Buffer): Promise<void> {
    const message = JSON.parse(messageBuffer.toString());
    await this.client.channel(topic).send({
      type: "broadcast",
      event: topic,
      payload: {
        key: message.key,
        value: message.value,
        headers: message.headers,
      },
    });
  }
}
