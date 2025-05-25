import {
  EachMessagePayload,
  IConfigurationService,
  IMessageBroker,
  MessageHandler,
} from "contracts.ts";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export class SupabaseMessageBroker implements IMessageBroker {
  private client: SupabaseClient;
  private readonly topics: Map<string, MessageHandler[]> = new Map();

  constructor(configService: IConfigurationService) {
    const url = configService.getSupabaseUrl();
    const key = configService.getSupabaseKey();
    console.log("🔧 Initializing Supabase client with URL:", url);
    this.client = createClient(url, key);
  }

  async setup(): Promise<void> {
    console.log("🛠️ Setting up SupabaseMessageBroker...");
    // Additional setup logic if needed
  }

  async start(): Promise<void> {
    console.log("🚀 Starting SupabaseMessageBroker...");
    for (const [topic, handlers] of this.topics.entries()) {
      const channel = this.client.channel(topic);
      console.log(
        `📡 Subscribing to topic '${topic}' with ${handlers.length} handler(s).`,
      );
      channel.on("broadcast", { event: topic }, async (payload) => {
        console.log(`Received message on topic '${topic}':`, payload.payload);
        const message = payload.payload as EachMessagePayload["message"];
        for (const handler of handlers) {
          await handler({ topic, message });
          console.log(`✅ Handler executed for topic '${topic}'`);
        }
      });
      await new Promise((r) => channel.subscribe(r));
      console.log(`🎷 Successfully subscribed to topic '${topic}'`);
    }
  }

  async subscribe(topic: string, handler: MessageHandler): Promise<void> {
    const handlers = this.topics.get(topic) || [];
    handlers.push(handler);
    this.topics.set(topic, handlers);
    console.log(
      `+ Handler added to topic '${topic}' 🎼 Total handlers: ${handlers.length}`,
    );
  }

  async unsubscribe(topic: string): Promise<void> {
    this.topics.delete(topic);
    console.log(`- Unsubscribed from topic '${topic}' 🎻`);
  }

  async produce(topic: string, messageBuffer: Buffer): Promise<void> {
    const message = JSON.parse(messageBuffer.toString());
    console.log(`📤 Producing message to topic '${topic}' 🎵`, message);
    await this.client.channel(topic).send({
      type: "broadcast",
      event: topic,
      payload: {
        key: message.key,
        value: message.value,
        headers: message.headers,
      },
    });
    console.log(`📨 Message sent to topic '${topic}' 📯`);
  }

  async shutdown(): Promise<void> {
    console.log("🛑 Shutting down SupabaseMessageBroker...");
    for (const [topic] of this.topics.entries()) {
      const channel = this.client.channel(topic);
      await channel.unsubscribe();
      console.log(`🔕 Unsubscribed from topic '${topic}'`);
    }
    this.topics.clear();
    console.log("🧹 All topics cleared. Shutdown complete.");
  }
}
