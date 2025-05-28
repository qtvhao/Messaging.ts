import "reflect-metadata";
import {
  BrokerType,
  IConfigurationService,
  IDomainEvent,
  IDomainEventMapperRegistry,
  IEventBus,
  IEventBusFactory,
  IEventHandlerResolver,
  IEventTopicMapper,
  IMessageBroker,
  IMessageBrokerFactory,
  IMessageBrokerFactoryMap,
  IServiceProvider,
  Message,
  TYPES,
} from "contracts.ts";
import {
  DomainEventMapperRegistry,
  EventTopicMapper,
  ServiceProvider,
} from "support.ts";
import { MessageBrokerFactory } from "../BrokerFactory/MessageBrokerFactory";
import { ConfigurationService } from "kernel.ts";
import { EventBusFactory } from "./EventBusFactory";
import { InMemoryMessageBroker } from "./InMemoryMessageBroker";
import { EventHandlerResolver } from "./Consumers/EventHandlerResolver";
import { SupabaseMessageBroker } from "./SupabaseMessageBroker";

export class EventBusServiceProvider extends ServiceProvider
  implements IServiceProvider {
  private eventBus: IEventBus | null = null;

  register(): void {
    this.app.bind<IMessageBrokerFactory>(TYPES.MessageBrokerFactory)
      .to(MessageBrokerFactory);
    this.app.bind<IEventTopicMapper>(TYPES.EventTopicMapper).to(
      EventTopicMapper,
    ).inSingletonScope();
    this.app.bind<IDomainEventMapperRegistry<IDomainEvent, Message>>(
      TYPES.DomainEventMapperRegistry,
    ).to(DomainEventMapperRegistry).inSingletonScope();
    this.app.bind<IConfigurationService>(TYPES.ConfigurationService)
      .to(ConfigurationService).inSingletonScope();

    this.app.bind(SupabaseMessageBroker).toSelf();
    this.app.bind(InMemoryMessageBroker).toSelf();
    const creators: IMessageBrokerFactoryMap = new Map<
      BrokerType,
      () => IMessageBroker
    >([
      ["inmemory", () => {
        return this.app.get(InMemoryMessageBroker);
      }],
      ["supabase", () => {
        return this.app.get(SupabaseMessageBroker);
      }],
    ]);
    this.app.bind<IMessageBrokerFactoryMap>(TYPES.MessageBrokerFactoryMap)
      .toConstantValue(creators);
    this.app.bind<IEventHandlerResolver>(TYPES.EventHandlerResolver)
      .to(EventHandlerResolver).inSingletonScope();

    this.app.bind<IEventBusFactory>(TYPES.EventBusFactory)
      .to(EventBusFactory)
      .inSingletonScope();
    const factory = this.app.get<IEventBusFactory>(TYPES.EventBusFactory);

    this.eventBus = factory.create();

    this.app.bind<IEventBus>(TYPES.EventBus).toConstantValue(this.eventBus);

    this.booting(() => {
      console.debug(
        "[EventBusServiceProvider] Booting: initializing dependencies and registering event bus.",
      );
    });
    this.booted(async () => {
      const eventBus = this.app.get<IEventBus>(TYPES.EventBus);
      await eventBus.setup();
      await eventBus.start();
    });

    this.booted(async () => {
      console.debug(
        "[EventBusServiceProvider] Booted: EventBus is fully registered and operational.",
      );
    });

    this.app.terminating(async () => {
      console.debug(
        "[EventBusServiceProvider] Terminating: shutting down eventbus.",
      );
      await this.eventBus?.shutdown();
    });
  }

  getEventBus(): IEventBus | null {
    return this.eventBus;
  }

  provides(): string[] {
    return ["EventBus"];
  }
}
