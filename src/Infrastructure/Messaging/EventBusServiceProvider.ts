import {
  BrokerType,
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
import { MessageBrokerFactory } from "../BrokerFactory/MessageBrokerFactory";

export class EventBusServiceProvider extends ServiceProvider
  implements IServiceProvider {
  private eventBus!: IEventBus;

  register(): void {
    this.app.bind<IMessageBrokerFactory>(TYPES.MessageBrokerFactory)
      .toConstantValue(new MessageBrokerFactory());
    this.app.bind<TopicRegistry>(TopicRegistry).toConstantValue(
      new TopicRegistry(),
    );
    this.app.bind<IEventMapperRegistry>(TYPES.EventMapperRegistry)
      .toConstantValue(new EventMapperRegistry());
    const driver: BrokerType = process.env.EVENT_BUS_DRIVER || "inmemory";

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
    this.booting(() => {
      this.eventBus.setup();
    });
    this.booted(() => {
      this.eventBus.start();
    })
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
