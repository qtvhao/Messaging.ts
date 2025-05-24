import {
  BrokerType,
  IEventBus,
  IMessageBrokerFactory,
  IServiceProvider,
  TYPES,
  IConfigurationService,
  IEventTopicMapper,
  IDomainEventMapperRegistry,
  IDomainEvent,
} from "contracts.ts";
import {
  DomainEventMapperRegistry,
  ServiceProvider,
  EventTopicMapper,
} from "support.ts";
import { MessageBrokerFactory } from "../BrokerFactory/MessageBrokerFactory";
import { ConfigurationService } from "kernel.ts";
import { EventBusFactory } from "./EventBusFactory";

export class EventBusServiceProvider extends ServiceProvider
  implements IServiceProvider {
  private eventBus!: IEventBus;

  register(): void {
    this.app.bind<IMessageBrokerFactory>(TYPES.MessageBrokerFactory)
      .toConstantValue(new MessageBrokerFactory());
    this.app.bind<IEventTopicMapper>(TYPES.EventTopicMapper).toConstantValue(
      new EventTopicMapper(),
    );
    this.app.bind<IDomainEventMapperRegistry<IDomainEvent, object>>(TYPES.DomainEventMapperRegistry)
      .toConstantValue(new DomainEventMapperRegistry());
    this.app.bind<IConfigurationService>(TYPES.ConfigurationService)
      .toConstantValue(new ConfigurationService());

    const factory = new EventBusFactory(
      this.app.get<IMessageBrokerFactory>(TYPES.MessageBrokerFactory),
      this.app.get<IEventTopicMapper>(TYPES.EventTopicMapper),
      this.app.get<IDomainEventMapperRegistry<IDomainEvent, object>>(TYPES.DomainEventMapperRegistry),
      this.app.get<IConfigurationService>(TYPES.ConfigurationService)
    );
    this.eventBus = factory.create();

    this.app.bind<IEventBus>(TYPES.EventBus).toConstantValue(this.eventBus);
  }

  getEventBus(): IEventBus {
    return this.eventBus;
  }

  provides(): string[] {
    return ["EventBus"];
  }
}
