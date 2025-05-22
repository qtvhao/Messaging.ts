import { Application, IEventBus, IServiceProvider } from "contracts.ts";
import { KafkaEventBus } from "./Kafka/KafkaEventBus";
import { NatsEventBus } from "./Nats/NatsEventBus";
import { InMemoryEventBus } from "./InMemory/InMemoryEventBus";
import { ServiceProvider } from "support.ts";

export class EventBusServiceProvider extends ServiceProvider
  implements IServiceProvider {
  private bootingCallbacks: Function[] = [];
  private bootedCallbacks: Function[] = [];
  private eventBus!: IEventBus;

  register(): void {
    const driver = process.env.EVENT_BUS_DRIVER || "kafka";

    switch (driver.toLowerCase()) {
      case "nats":
        this.eventBus = new NatsEventBus();
        break;
      case "inmemory":
        this.eventBus = new InMemoryEventBus();
        break;
      case "kafka":
      default:
        this.eventBus = new KafkaEventBus();
    }

    this.app.bind<IEventBus>("EventBus").toConstantValue(this.eventBus)
  }

  getEventBus(): IEventBus {
    return this.eventBus;
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
