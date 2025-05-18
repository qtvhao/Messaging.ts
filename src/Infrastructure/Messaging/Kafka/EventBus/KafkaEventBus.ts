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

export class KafkaEventBus implements IEventBus {
  private readonly producer: Producer;
  private readonly consumer: Consumer;
  private readonly mapperRegistry: EventMapperRegistry;
  private readonly handlers: Map<string, Set<IEventHandler<any>>> = new Map();

  constructor(
    producer: Producer,
    consumer: Consumer,
    mapperRegistry: EventMapperRegistry,
  ) {
    this.producer = producer;
    this.consumer = consumer;
    this.mapperRegistry = mapperRegistry;

    this.consumer.run({
      eachMessage: async ({ topic, message }: EachMessagePayload) => {
        const eventName = topic;
        const handlers = this.handlers.get(eventName);
        const mapper = this.mapperRegistry.get(eventName);
        if (!handlers || !mapper || !message.value) return;

        const dto = JSON.parse(message.value.toString());
        const domainEvent = mapper.toDomain(dto);

        for (const handler of handlers) {
          await handler.handle(domainEvent);
        }
      },
    });
  }

  setup(): void {
    this.mapperRegistry.set("MyDomainEvent", new MyEventMapper());
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
