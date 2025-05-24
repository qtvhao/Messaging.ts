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
// import { ResolutionContext } from "@inversifyjs/core/lib/cjs/resolution/models/ResolutionContext";

export class EventBusServiceProvider extends ServiceProvider
  implements IServiceProvider {
  private eventBus!: IEventBus;

  register(): void {
    this.app.bind<IMessageBrokerFactory>(TYPES.MessageBrokerFactory)
      .toDynamicValue((container) => {
        const messageBrokerFactoryMap = container.get<IMessageBrokerFactoryMap>(
          TYPES.MessageBrokerFactoryMap,
        );
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

    this.app.bind<IEventBusFactory>(TYPES.EventBusFactory).toDynamicValue(
      (container) => {
        const brokerFactory = container.get<IMessageBrokerFactory>(
          TYPES.MessageBrokerFactory,
        );
        const topicMapper = container.get<IEventTopicMapper>(
          TYPES.EventTopicMapper,
        );
        const eventMapperRegistry = container.get<
          IDomainEventMapperRegistry<IDomainEvent, object>
        >(TYPES.DomainEventMapperRegistry);
        const configService = container.get<IConfigurationService>(
          TYPES.ConfigurationService,
        );
        const handlerResolver = container.get<IEventHandlerResolver>(
          TYPES.EventHandlerResolver,
        );

        return new EventBusFactory(
          brokerFactory,
          topicMapper,
          eventMapperRegistry,
          configService,
          handlerResolver,
        );
      },
    );
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
