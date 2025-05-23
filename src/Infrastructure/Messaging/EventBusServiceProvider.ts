import {
  BrokerType,
  IEventBus,
  IDomainEventMapperRegistry,
  IMessageBrokerFactory,
  IServiceProvider,
  TYPES,
  IConfigurationService,
} from "contracts.ts";
import {
  DomainEventMapperRegistry,
  ServiceProvider,
  TopicRegistry,
} from "support.ts";
import { EventBus } from "./EventBus";
import { MessageBrokerFactory } from "../BrokerFactory/MessageBrokerFactory";
import { ConfigurationService } from "kernel.ts";

export class EventBusServiceProvider extends ServiceProvider
  implements IServiceProvider {
  private eventBus!: IEventBus;

  register(): void {
    this.app.bind<IMessageBrokerFactory>(TYPES.MessageBrokerFactory)
      .toConstantValue(new MessageBrokerFactory());
    this.app.bind<TopicRegistry>(TopicRegistry).toConstantValue(
      new TopicRegistry(),
    );
    this.app.bind<IDomainEventMapperRegistry>(TYPES.EventMapperRegistry)
      .toConstantValue(new DomainEventMapperRegistry());
    this.app.bind<IConfigurationService>(TYPES.ConfigurationService)
      .toConstantValue(new ConfigurationService());

    const configService = this.app.get<IConfigurationService>(
      TYPES.ConfigurationService
    );
    const driver: BrokerType = configService.getEventBusDriver();

    const topicRegistry = this.app.get<TopicRegistry>(TopicRegistry);
    const eventMapperRegistry = this.app.get<IDomainEventMapperRegistry>(
      TYPES.EventMapperRegistry
    );
    const brokerFactory = this.app.get<IMessageBrokerFactory>(
      TYPES.MessageBrokerFactory
    );
    const broker = brokerFactory.create(driver);
    this.eventBus = new EventBus(broker, topicRegistry, eventMapperRegistry);

    this.app.bind<IEventBus>(TYPES.EventBus).toConstantValue(this.eventBus);
    this.booting(() => {
      this.eventBus.setup();
    });
    this.booted(() => {
      this.eventBus.start();
    });
  }

  getEventBus(): IEventBus {
    return this.eventBus;
  }

  provides(): string[] {
    return ["EventBus"];
  }
}
