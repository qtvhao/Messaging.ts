import { IEventBus, IServiceProvider, IEventMapperRegistry } from "contracts.ts";
import { EventMapperRegistry, ServiceProvider, TopicRegistry } from "support.ts";
import { EventBus } from "./EventBus";

export class EventBusServiceProvider extends ServiceProvider
  implements IServiceProvider {
  private eventBus!: IEventBus;

  register(): void {
    const driver = process.env.EVENT_BUS_DRIVER || "kafka";

    const topicRegistry = this.app.get<TopicRegistry>(TopicRegistry);
    const eventMapperRegistry = this.app.get<IEventMapperRegistry>(EventMapperRegistry);

    switch (driver.toLowerCase()) {
      case "nats":
        this.eventBus = new EventBus(new NatsMessageBroker(), topicRegistry, eventMapperRegistry);
        break;
      case "inmemory":
        this.eventBus = new EventBus(new InMemoryMessageBroker(), topicRegistry, eventMapperRegistry);
        break;
      case "kafka":
      default:
        this.eventBus = new EventBus(new InMemoryMessageBroker(), topicRegistry, eventMapperRegistry);
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

  when(predicate: () => boolean, callback: Function): void {
    if (predicate()) {
      callback();
    }
  }

  provides(): string[] {
    return ["EventBus"];
  }
}
