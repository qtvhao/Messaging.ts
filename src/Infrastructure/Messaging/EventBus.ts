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
  Message,
} from "contracts.ts";

export class EventBus
  implements IEventPublisher, IEventSubscriber, IInitializable {
  constructor(
    private readonly messageBroker: IMessageBroker,
    private readonly eventTopicMapper: IEventTopicMapper,
    private readonly domainEventMapperRegistry: IDomainEventMapperRegistry<
      IDomainEvent,
      Message
    >,
    private readonly handlerResolver: IEventHandlerResolver,
  ) {}

  async start(): Promise<void> {
    await this.messageBroker.start();
  }

  async setup(): Promise<void> {
    await this.messageBroker.setup();
  }

  async publish(events: IDomainEvent[]): Promise<void> {
    for (const event of events) {
      const eventConstructor = event.constructor as EventConstructor<IDomainEvent>;
      const topic = this.eventTopicMapper.getTopicForEvent(
        eventConstructor,
      );
      const mapper = this.domainEventMapperRegistry.get(eventConstructor);

      if (!mapper) {
        throw new Error(`No mapper registered for event: ${eventConstructor}`);
      }

      const dto = mapper.toDTO(event);
      const message = Buffer.from(JSON.stringify(dto));
      await this.messageBroker.produce(topic, message);
    }
  }
  async subscribe<T extends IDomainEvent>(
    eventCtor: EventConstructor<T>,
    handler: IEventHandler<T>,
  ): Promise<void> {
    const topic = this.eventTopicMapper.getTopicForEvent(eventCtor);

    await this.messageBroker.subscribe(topic, async (payload) => {
      const { message } = payload;

      if (!message.value) {
        console.warn(`Received empty message for topic: ${topic}`);
        return;
      }

      const dto = JSON.parse(message.value.toString());
      const mapper = this.domainEventMapperRegistry.get(
        eventCtor,
      );

      if (!mapper) {
        throw new Error(
          `No mapper registered for event: ${new eventCtor().eventName()}`,
        );
      }

      const domainEvent = mapper.toDomain(dto);

      await handler.handle(domainEvent as T);
    });
  }
  async shutdown(): Promise<void> {
    await this.messageBroker.shutdown();
  }
}
