import {
  IConfigurationService,
  IDomainEvent,
  IDomainEventMapperRegistry,
  IEventBus,
  IEventBusFactory,
  IEventHandlerResolver,
  IEventTopicMapper,
  IMessageBrokerFactory,
  IMessageBrokerFactoryMap,
  IServiceProvider,
  TYPES,
} from "contracts.ts";
import { Container } from "inversify";
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
    this.app.bind<IMessageBrokerFactory>(TYPES.MessageBrokerFactory)
      .toDynamicValue((context: any) => {
        const container: Container = context.container;
        const messageBrokerFactoryMap = container.get<IMessageBrokerFactoryMap>(TYPES.MessageBrokerFactoryMap);
        return new MessageBrokerFactory(messageBrokerFactoryMap);
      });
    this.app.bind<IEventTopicMapper>(TYPES.EventTopicMapper).to(
      EventTopicMapper,
    );
    this.app.bind<IDomainEventMapperRegistry<IDomainEvent, object>>(
      TYPES.DomainEventMapperRegistry,
    ).to(DomainEventMapperRegistry);
    this.app.bind<IConfigurationService>(TYPES.ConfigurationService)
      .to(ConfigurationService);

    this.app.bind<IEventBusFactory>(TYPES.EventBusFactory).to(EventBusFactory);

    const factory = this.app.get<IEventBusFactory>(TYPES.EventBusFactory);

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
