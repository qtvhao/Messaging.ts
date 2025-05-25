// Messaging.ts/src/Infrastructure/Messaging/InMemoryMessageBroker.ts

import {
  IMessageBroker,
  MessageHandler,
  EachMessagePayload,
} from "contracts.ts";

export class InMemoryMessageBroker implements IMessageBroker {
  private topics: Map<string, MessageHandler[]> = new Map();
  async setup(): Promise<void> {
  }

  async start(): Promise<void> {
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
    const handlers = this.topics.get(topic);
    if (!handlers || handlers.length === 0) {
      console.warn(`No subscribers for topic: ${topic}`);
      return;
    }

    const message = JSON.parse(messageBuffer.toString());
    const payload: EachMessagePayload = {
      topic,
      message: {
        key: message.key,
        value: message.value,
        headers: message.headers,
      },
    };

    for (const handler of handlers) {
      await handler(payload);
    }
  }
}
