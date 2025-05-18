import {
  IDomainEvent,
  IEventBus,
  IEventHandler,
  IEventMapper,
} from "contracts.ts";
import { Consumer, EachMessagePayload, Producer } from "kafkajs";

interface MyDTO {
  id: string;
  value: string;
}

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

class EventMapperRegistry {
  private readonly mappers: Map<string, IEventMapper<any, any>> = new Map();

  get(eventName: string): IEventMapper<any, any> | undefined {
    return this.mappers.get(eventName);
  }

  set<T extends IDomainEvent, U>(
    eventName: string,
    mapper: IEventMapper<U, T>,
  ): void {
    this.mappers.set(eventName, mapper);
  }
}
class TopicRegistry {
  private readonly topics = new Map<string, new (...args: any[]) => IDomainEvent>();

  register(topic: string, eventCtor: new (...args: any[]) => IDomainEvent): void {
    this.topics.set(topic, eventCtor);
  }

  getEventCtor(topic: string): (new (...args: any[]) => IDomainEvent) | undefined {
    return this.topics.get(topic);
  }
}
class MyEventHandler implements IEventHandler<MyDomainEvent> {
    async handle(event: MyDomainEvent): Promise<void> {
        console.log("Handling MyEvent with message:", event);
    }

    supports(): Array<new (...args: any[]) => MyDomainEvent> {
        return [MyDomainEvent];
    }
}

export class KafkaEventBus implements IEventBus {
  private readonly producer: Producer;
  private readonly consumer: Consumer;
  private readonly mapperRegistry: EventMapperRegistry;
  private readonly topicRegistry: TopicRegistry;
  private readonly handlers: Map<string, Set<IEventHandler<any>>> = new Map();

  constructor(
    producer: Producer,
    consumer: Consumer,
    mapperRegistry: EventMapperRegistry,
    topicRegistry: TopicRegistry,
  ) {
    this.producer = producer;
    this.consumer = consumer;
    this.mapperRegistry = mapperRegistry;
    this.topicRegistry = topicRegistry;
  }

  private async handleEachMessage({ topic, message }: EachMessagePayload): Promise<void> {
    const eventCtor = this.topicRegistry.getEventCtor(topic);
    if (!eventCtor) return;
    const eventName = new eventCtor().eventName();
    const handlers = this.handlers.get(eventName);
    const mapper = this.mapperRegistry.get(eventName);
    if (!handlers || !mapper || !message.value) return;

    try {
      const dto = JSON.parse(message.value.toString());
      const domainEvent = mapper.toDomain(dto);

      for (const handler of handlers) {
        try {
          await handler.handle(domainEvent);
        } catch (handlerErr) {
          console.error(`Error handling event with handler:`, handlerErr);
        }
      }
    } catch (err) {
      console.error(`Failed to process message for topic ${topic}:`, err);
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
    this.subscribe(MyDomainEvent, new MyEventHandler);
  }

  async publish(events: IDomainEvent[]): Promise<void> {
    for (const event of events) {
      const eventName = event.eventName();
      const mapper = this.mapperRegistry.get(eventName);
      if (!mapper) continue;

      const dto = mapper.toDTO(event);
      await this.producer.send({
        topic: eventName,
        messages: [
          {
            key: event.aggregateId,
            value: JSON.stringify(dto),
          },
        ],
      });
    }
  }

  subscribe<T extends IDomainEvent>(
    eventCtor: new (...args: any[]) => T,
    handler: IEventHandler<T>,
  ): void {
    const eventName = eventCtor.prototype.eventName();
    this.topicRegistry.register(eventName, eventCtor);
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
      this.consumer.subscribe({ topic: eventName });
    }
    this.handlers.get(eventName)!.add(handler);
  }

  registerMapper<T extends IDomainEvent>(
    eventName: string,
    mapper: IEventMapper<T, any>,
  ): void {
    this.mapperRegistry.set(eventName, mapper);
  }
}
