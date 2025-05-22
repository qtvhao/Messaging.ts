import {
  IEventBus,
  IEventMapperRegistry,
  IMessageBrokerFactory,
  IServiceProvider,
  TYPES,
} from "contracts.ts";
import {
  EventMapperRegistry,
  ServiceProvider,
  TopicRegistry,
} from "support.ts";
import { EventBus } from "./EventBus";

export class EventBusServiceProvider extends ServiceProvider
  implements IServiceProvider {
  private eventBus!: IEventBus;

  register(): void {
    this.app.bind<TopicRegistry>(TopicRegistry).toConstantValue(new TopicRegistry);
    this.app.bind<IEventMapperRegistry>(TYPES.EventMapperRegistry).toConstantValue(new EventMapperRegistry);
    const driver = process.env.EVENT_BUS_DRIVER || "kafka";

    const topicRegistry = this.app.get<TopicRegistry>(TopicRegistry);
    const eventMapperRegistry = this.app.get<IEventMapperRegistry>(
      TYPES.EventMapperRegistry,
    );

    const brokerFactory = this.app.get<IMessageBrokerFactory>(
      TYPES.MessageBrokerFactory,
    );
    const broker = brokerFactory.create(driver);
    this.eventBus = new EventBus(broker, topicRegistry, eventMapperRegistry);

    this.app.bind<IEventBus>(TYPES.EventBus).toConstantValue(this.eventBus);
  }

  getEventBus(): IEventBus {
    return this.eventBus;
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
