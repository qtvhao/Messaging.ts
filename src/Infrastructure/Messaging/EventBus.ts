import {
  EventConstructor,
  IDomainEvent,
  IDomainEventMapperRegistry,
  IEventHandler,
  IEventHandlerResolver,
  IEventPublisher,
  IEventSubscriber,
  IEventTopicMapper,
  IInitializable,
  IMessageBroker,
} from "contracts.ts";

export class EventBus
  implements IEventPublisher, IEventSubscriber, IInitializable {
  constructor(
    private readonly messageBroker: IMessageBroker,
    private readonly eventTopicMapper: IEventTopicMapper,
    private readonly domainEventMapperRegistry: IDomainEventMapperRegistry<
      IDomainEvent,
      object
    >,
    private readonly handlerResolver: IEventHandlerResolver,
  ) {}

  private subscribedTopics = new Set<string>();

  async start(): Promise<void> {
    await this.messageBroker.start();
  }

  async setup(): Promise<void> {
    await this.messageBroker.setup();
  }

  async publish(events: IDomainEvent[]): Promise<void> {
    for (const event of events) {
      const topic = this.eventTopicMapper.getTopicForEvent(
        event.constructor as EventConstructor<IDomainEvent>,
      );
      const mapper = this.domainEventMapperRegistry.get(event.eventName());

      if (!mapper) {
        throw new Error(`No mapper registered for event: ${event.eventName()}`);
      }

      const dto = mapper.toDTO(event);
      const message = Buffer.from(JSON.stringify(dto));
      await this.messageBroker.produce(topic, message);
    }
  }

  subscribe<T extends IDomainEvent>(
    eventCtor: EventConstructor<T>,
    handler: IEventHandler<T>,
  ): void {
  }
}
