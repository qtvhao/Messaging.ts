import {
  IConfigurationService,
  IDomainEvent,
  IDomainEventMapperRegistry,
  IEventBus,
  IEventHandlerResolver,
  IEventTopicMapper,
  IMessageBrokerFactory,
  Message,
  TYPES,
} from "contracts.ts";
import { EventBus } from "./EventBus";
import { inject } from "inversify";

export class EventBusFactory {
  constructor(
    @inject(TYPES.MessageBrokerFactory) private readonly brokerFactory:
      IMessageBrokerFactory,
    @inject(TYPES.EventTopicMapper) private readonly topicMapper:
      IEventTopicMapper,
    @inject(
      TYPES.DomainEventMapperRegistry,
    ) private readonly eventMapperRegistry: IDomainEventMapperRegistry<
      IDomainEvent,
      Message
    >,
    @inject(TYPES.ConfigurationService) private readonly configService:
      IConfigurationService,
    @inject(TYPES.EventHandlerResolver) private readonly handlerResolver:
      IEventHandlerResolver,
  ) {}

  create(): IEventBus {
    const driver = this.configService.getEventBusDriver();
    const broker = this.brokerFactory.create(driver);
    return new EventBus(
      broker,
      this.topicMapper,
      this.eventMapperRegistry,
      this.handlerResolver,
    );
  }
}
