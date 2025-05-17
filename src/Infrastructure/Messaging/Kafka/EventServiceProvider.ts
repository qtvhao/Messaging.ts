import { IDomainEvent, IEventHandler } from 'contracts.ts'

export class EventServiceProvider {
  private readonly handlers: IEventHandler<IDomainEvent>[] = [];

  register<T extends IDomainEvent>(handlers: IEventHandler<T>[]): void {
    this.handlers.push(...(handlers as IEventHandler<IDomainEvent>[]));
  }

  private getHandlersFor<T extends IDomainEvent>(event: T): IEventHandler<T>[] {
    return this.handlers.filter(
      (handler): handler is IEventHandler<T> =>
        handler.supports().name === event.constructor.name
    );
  }

  async dispatch<T extends IDomainEvent>(event: T): Promise<void> {
    const handlers = this.getHandlersFor(event);
    for (const handler of handlers) {
      await handler.handle(event);
    }
  }
}
