import { EventConstructor, IDomainEvent, IEventHandler, IEventHandlerResolver } from "contracts.ts";

export class EventHandlerResolver implements IEventHandlerResolver {
  private handlers = new Map<string, IEventHandler<any>>();

  register<T extends IDomainEvent>(
    event: EventConstructor<T>,
    handler: IEventHandler<T>,
  ): void {
    this.handlers.set(event.name, handler);
  }

  resolve<T extends IDomainEvent>(
    event: EventConstructor<T>,
  ): IEventHandler<T> {
    const handler = this.handlers.get(event.name);
    if (!handler) {
      throw new Error(`No handler registered for event: ${event.name}`);
    }

    return handler as IEventHandler<T>;
  }
}
