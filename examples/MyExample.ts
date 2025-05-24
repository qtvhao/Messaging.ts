import {
  IDomainEvent,
  IEventHandler,
  IDomainEventMapper,
} from "contracts.ts";

interface MyDTO {
  id: string;
  value: string;
}

/**
 * Represents a domain event with an ID and value.
 * Implements IDomainEvent and provides event metadata like name and version.
 */
class MyDomainEvent implements IDomainEvent {
  __brand: "DomainEvent";
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
class MyEventMapper implements IDomainEventMapper<MyDTO, MyDomainEvent> {
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
