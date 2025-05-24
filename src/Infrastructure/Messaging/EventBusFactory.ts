import { IConfigurationService, IDomainEvent, IDomainEventMapperRegistry, IEventBus, IEventTopicMapper, IMessageBrokerFactory } from "contracts.ts";
import { EventBus } from "./EventBus";

export class EventBusFactory {
  constructor(
    private readonly brokerFactory: IMessageBrokerFactory,
    private readonly topicMapper: IEventTopicMapper,
    private readonly eventMapperRegistry: IDomainEventMapperRegistry<IDomainEvent, object>,
    private readonly configService: IConfigurationService
  ) {}

  create(): IEventBus {
    const driver = this.configService.getEventBusDriver();
    const broker = this.brokerFactory.create(driver);
    return new EventBus(broker, this.topicMapper, this.eventMapperRegistry);
  }
}
