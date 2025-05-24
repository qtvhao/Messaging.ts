import {
  IDomainEvent,
  IDomainEventMapperRegistry,
  IEventHandler,
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
    private readonly eventMapperRegistry: IDomainEventMapperRegistry<
      IDomainEvent,
      object
    >,
  ) {}

  private handlers = new Map<string, IEventHandler<IDomainEvent>[]>();
  private subscribedTopics = new Set<string>();

  async start(): Promise<void> {
    await this.messageBroker.start();
  }

  async setup(): Promise<void> {
    await this.messageBroker.setup();
  }

  async publish(events: IDomainEvent[]): Promise<void> {
    for (const event of events) {
      if (
        typeof event.eventName !== "function" ||
        typeof event.version !== "function"
      ) {
        throw new Error(
          `Attempted to publish non-domain event through EventBus: ${event.constructor.name}`,
        );
      }
    }
  }

  subscribe<T extends IDomainEvent>(
    eventCtor: new (...args: any[]) => T,
    handler: IEventHandler<T>,
  ): void {
  }
}
