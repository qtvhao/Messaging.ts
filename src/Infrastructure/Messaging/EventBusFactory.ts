import { IConfigurationService, IDomainEvent, IDomainEventMapperRegistry, IEventBus, IEventHandlerResolver, IEventTopicMapper, IMessageBrokerFactory, Message } from "contracts.ts";
import { EventBus } from "./EventBus";

export class EventBusFactory {
  constructor(
    private readonly brokerFactory: IMessageBrokerFactory,
    private readonly topicMapper: IEventTopicMapper,
    private readonly eventMapperRegistry: IDomainEventMapperRegistry<IDomainEvent, Message>,
    private readonly configService: IConfigurationService,
    private readonly handlerResolver: IEventHandlerResolver
  ) {}

  create(): IEventBus {
    const driver = this.configService.getEventBusDriver();
    const broker = this.brokerFactory.create(driver);
    return new EventBus(broker, this.topicMapper, this.eventMapperRegistry, this.handlerResolver);
  }
}
