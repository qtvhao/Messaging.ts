import {
  IConfigurationService,
  IDomainEvent,
  IDomainEventMapperRegistry,
  IEventBus,
  IEventHandlerResolver,
  IEventTopicMapper,
  IMessageBrokerFactory,
  IServiceProvider,
  TYPES,
} from "contracts.ts";
import {
  DomainEventMapperRegistry,
  EventTopicMapper,
  ServiceProvider,
} from "support.ts";
import { MessageBrokerFactory } from "../BrokerFactory/MessageBrokerFactory";
import { ConfigurationService } from "kernel.ts";
import { EventBusFactory } from "./EventBusFactory";

export class EventBusServiceProvider extends ServiceProvider
  implements IServiceProvider {
  private eventBus!: IEventBus;

  register(): void {
    this.app.bind<IMessageBrokerFactory>(TYPES.MessageBrokerFactory).to(
      MessageBrokerFactory,
    );
    this.app.bind<IEventTopicMapper>(TYPES.EventTopicMapper).to(
      EventTopicMapper,
    );
    this.app.bind<IDomainEventMapperRegistry<IDomainEvent, object>>(
      TYPES.DomainEventMapperRegistry,
    ).to(DomainEventMapperRegistry);
    this.app.bind<IConfigurationService>(TYPES.ConfigurationService)
      .to(ConfigurationService);

    const factory = new EventBusFactory(
      this.app.get<IMessageBrokerFactory>(TYPES.MessageBrokerFactory),
      this.app.get<IEventTopicMapper>(TYPES.EventTopicMapper),
      this.app.get<IDomainEventMapperRegistry<IDomainEvent, object>>(
        TYPES.DomainEventMapperRegistry,
      ),
      this.app.get<IConfigurationService>(TYPES.ConfigurationService),
      this.app.get<IEventHandlerResolver>(TYPES.EventHandlerResolver),
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
