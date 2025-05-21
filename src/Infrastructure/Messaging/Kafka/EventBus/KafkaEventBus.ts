import {
  IDomainEvent,
  IEventHandler,
  IEventMapperRegistry,
  IEventPublisher,
  IEventSubscriber,
  IInitializable,
  IMessageBroker,
} from "contracts.ts";
import { TopicRegistry } from "support.ts";

/**
 * Kafka-based implementation of the IEventBus interface.
 * Publishes and consumes domain events via Kafka.
 * Coordinates mapping, topic registration, and event handling.
 */
export class KafkaEventBus
  implements IEventPublisher, IEventSubscriber, IInitializable {
  constructor(
    private readonly messageBroker: IMessageBroker,
    private readonly topicRegistry: TopicRegistry,
    private readonly eventMapperRegistry: IEventMapperRegistry,
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
      const topic = this.topicRegistry.getEventCtor(event.eventName())
        ? event.eventName()
        : (() => {
          throw new Error(`No topic registered for event ${event.eventName()}`);
        })();

      const mapper = this.eventMapperRegistry.get(event.eventName());
      if (!mapper) {
        throw new Error(`No mapper registered for event: ${event.eventName()}`);
      }

      const dto = mapper.toDTO(event);
      const payload = Buffer.from(JSON.stringify(dto));

      const headers: Record<string, Buffer> = {
        eventName: Buffer.from(event.eventName()),
        version: Buffer.from(event.version().toString()),
        occurredOn: Buffer.from(event.occurredOn.toISOString()),
      };

      await this.messageBroker.produce(
        topic,
        Buffer.from(JSON.stringify({
          key: Buffer.from(event.aggregateId),
          value: payload,
          headers,
        })),
      );
    }
  }

  subscribe<T extends IDomainEvent>(
    eventCtor: new (...args: any[]) => T,
    handler: IEventHandler<T>,
  ): void {
    const eventName = new eventCtor("", "").eventName(); // Adjust constructor if needed
    const topic = eventName;

    this.topicRegistry.register(topic, eventCtor);

    const existingHandlers = this.handlers.get(eventName) || [];
    existingHandlers.push(handler as IEventHandler<IDomainEvent>);
    this.handlers.set(eventName, existingHandlers);

    if (this.subscribedTopics.has(topic)) return;
    this.subscribedTopics.add(topic);

    this.messageBroker.subscribe(topic, async (payload) => {
      const eventCtor = this.topicRegistry.getEventCtor(payload.topic);
      if (!eventCtor) {
        throw new Error(
          `No event constructor registered for topic: ${payload.topic}`,
        );
      }

      const mapper = this.eventMapperRegistry.get(payload.topic);
      if (!mapper) {
        throw new Error(`No mapper registered for event: ${payload.topic}`);
      }

      const rawValue = payload.message.value?.toString();
      if (!rawValue) {
        throw new Error("Empty event payload");
      }

      const dto = JSON.parse(rawValue);
      const domainEvent = mapper.toDomain(dto);

      const handlers = this.handlers.get(payload.topic) || [];
      for (const handler of handlers) {
        await handler.handle(domainEvent);
      }
    });
  }
}
