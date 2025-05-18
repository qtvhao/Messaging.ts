// src/Infrastructure/Messaging/Kafka/Consumers/EventServiceProvider.ts

import { IServiceProvider } from "contracts.ts";
import { Application } from "kernel.ts";
import { KafkaEventBus } from "./EventBus/KafkaEventBus";

export class EventBusServiceProvider implements IServiceProvider {
  private bootingCallbacks: Function[] = [];
  private bootedCallbacks: Function[] = [];

  register(): void {
    // Application.bind("EventBus") new KafkaEventBus());
  }

  booting(callback: Function): void {
    this.bootingCallbacks.push(callback);
  }

  booted(callback: Function): void {
    this.bootedCallbacks.push(callback);
  }

  callBootingCallbacks(): void {
    this.bootingCallbacks.forEach((callback) => callback());
  }

  callBootedCallbacks(): void {
    this.bootedCallbacks.forEach((callback) => callback());
  }

  when(predicate: () => boolean, callback: Function): void {
    if (predicate()) {
      callback();
    }
  }

  provides(): string[] {
    return ["EventBus"];
  }
}
