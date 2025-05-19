import {
  IDomainEvent,
  IEventHandler,
  IEventMapper,
  IEventMapperRegistry,
  IConsumer,
  IProducer,
  EachMessagePayload,
  IProducerConsumerEventBus,
  IMessageBroker,
} from "contracts.ts";
import { TopicRegistry } from "support.ts";

interface MyDTO {
  id: string;
  value: string;
}

/**
 * Represents a domain event with an ID and value.
 * Implements IDomainEvent and provides event metadata like name and version.
 */
class MyDomainEvent implements IDomainEvent {
  public occurredOn: Date;
  public aggregateId: string;

  constructor(
    public id: string,
    public value: string,
  ) {
    this.aggregateId = id;
    this.occurredOn = new Date();
  }
  eventName() {
    return "MyDomainEvent";
  }
  version() {
    return 1;
  }
}

/**
 * Maps between MyDTO and MyDomainEvent.
 * Converts domain events to data transfer objects and vice versa.
 */
class MyEventMapper implements IEventMapper<MyDTO, MyDomainEvent> {
  toDomain(dto: MyDTO): MyDomainEvent {
    return new MyDomainEvent(dto.id, dto.value);
  }

  toDTO(event: MyDomainEvent): MyDTO {
    return {
      id: event.id,
      value: event.value,
    };
  }
}

/**
 * Handles MyDomainEvent by performing application-specific logic.
 * Implements IEventHandler interface for MyDomainEvent.
 */
class MyEventHandler implements IEventHandler<MyDomainEvent> {
  async handle(event: MyDomainEvent): Promise<void> {
    console.log("Handling MyEvent with message:", event);
  }

  supports(): Array<new (...args: any[]) => MyDomainEvent> {
    return [MyDomainEvent];
  }
}

/**
 * Kafka-based implementation of the IEventBus interface.
 * Publishes and consumes domain events via Kafka.
 * Coordinates mapping, topic registration, and event handling.
 */
export class KafkaEventBus implements IProducerConsumerEventBus {
  private readonly producer: IProducer;
  private readonly consumer: IConsumer;
  private readonly mapperRegistry: IEventMapperRegistry;
  private readonly topicRegistry: TopicRegistry;
  private readonly handlers: Array<IEventHandler<any>> = [];

  constructor(
    producer: IProducer,
    consumer: IConsumer,
    mapperRegistry: IEventMapperRegistry,
    topicRegistry: TopicRegistry,
  ) {
    this.producer = producer;
    this.consumer = consumer;
    this.mapperRegistry = mapperRegistry;
    this.topicRegistry = topicRegistry;
  }

  private async handleEachMessage(
    { topic, message }: EachMessagePayload,
  ): Promise<void> {
    const eventCtor = this.topicRegistry.getEventCtor(topic);
    if (!eventCtor) return;

    const eventName = new eventCtor().eventName();
    const mapper = this.mapperRegistry.get(eventName);
    if (!mapper) return;

    const value = message.value?.toString();
    if (!value) return;

    let dto: any;
    try {
      dto = JSON.parse(value);
    } catch (err) {
      console.error("Failed to parse message value:", err);
      return;
    }

    const domainEvent = mapper.toDomain(dto);

    for (const handler of this.handlers) {
      const supportedEvents = handler.supports();
      if (supportedEvents.some((ctor) => domainEvent instanceof ctor)) {
        await handler.handle(domainEvent);
      }
    }
  }

  async start(): Promise<void> {
    await this.consumer.run({
      eachMessage: this.handleEachMessage.bind(this),
    });
  }

  setup(): void {
    this.mapperRegistry.set("MyDomainEvent", new MyEventMapper());
    this.topicRegistry.register("MyDomainEvent", MyDomainEvent);
    this.subscribe(MyDomainEvent, new MyEventHandler());
  }

  async publish(events: IDomainEvent[]): Promise<void> {
    for (const event of events) {
      const eventName = event.eventName();
      const mapper = this.mapperRegistry.get(eventName);
      if (!mapper) continue;

      const dto = mapper.toDTO(event);
      await this.producer.send(eventName, JSON.stringify({
            key: event.aggregateId,
            value: JSON.stringify(dto),
          }));
    }
  }

  subscribe<T extends IDomainEvent>(
    eventCtor: new (...args: any[]) => T,
    handler: IEventHandler<T>,
  ): void {
    const eventName = eventCtor.prototype.eventName();
    this.topicRegistry.register(eventName, eventCtor);
    this.handlers.push(handler);
  }

  registerMapper<T extends IDomainEvent>(
    eventName: string,
    mapper: IEventMapper<T, any>,
  ): void {
    this.mapperRegistry.set(eventName, mapper);
  }
}
