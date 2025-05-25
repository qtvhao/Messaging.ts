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
// import { Container } from "inversify";
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
// import { ResolutionContext } from "@inversifyjs/core/lib/cjs/resolution/models/ResolutionContext";

export class EventBusServiceProvider extends ServiceProvider
  implements IServiceProvider {
  private eventBus!: IEventBus;

  register(): void {
    this.app.bind<IMessageBrokerFactory>(TYPES.MessageBrokerFactory)
      .toDynamicValue((container) => {
        const messageBrokerFactoryMap = container.get<IMessageBrokerFactoryMap>(
          TYPES.MessageBrokerFactoryMap,
        );
        return new MessageBrokerFactory(messageBrokerFactoryMap);
      });
    this.app.bind<IEventTopicMapper>(TYPES.EventTopicMapper).to(
      EventTopicMapper,
    ).inSingletonScope();
    this.app.bind<IDomainEventMapperRegistry<IDomainEvent, Message>>(
      TYPES.DomainEventMapperRegistry,
    ).to(DomainEventMapperRegistry).inSingletonScope();
    this.app.bind<IConfigurationService>(TYPES.ConfigurationService)
      .to(ConfigurationService).inSingletonScope();

    const creators: IMessageBrokerFactoryMap = new Map<
      BrokerType,
      () => IMessageBroker
    >([
      ["inmemory", () => {
        return new InMemoryMessageBroker();
      }],
      ["supabase", () => {
        return new SupabaseMessageBroker(
          this.app.get<IConfigurationService>(TYPES.ConfigurationService),
        );
      }],
    ]);
    this.app.bind<IMessageBrokerFactoryMap>(TYPES.MessageBrokerFactoryMap)
      .toConstantValue(creators);

    this.app.bind<IEventBusFactory>(TYPES.EventBusFactory).toDynamicValue(
      (container) => {
        const brokerFactory = container.get<IMessageBrokerFactory>(
          TYPES.MessageBrokerFactory,
        );
        const topicMapper = container.get<IEventTopicMapper>(
          TYPES.EventTopicMapper,
        );
        const eventMapperRegistry = container.get<
          IDomainEventMapperRegistry<IDomainEvent, Message>
        >(TYPES.DomainEventMapperRegistry);
        const configService = container.get<IConfigurationService>(
          TYPES.ConfigurationService,
        );
        const resolver = new EventHandlerResolver();
        this.app.bind<IEventHandlerResolver>(TYPES.EventHandlerResolver)
          .toConstantValue(resolver);

        return new EventBusFactory(
          brokerFactory,
          topicMapper,
          eventMapperRegistry,
          configService,
          resolver,
        );
      },
    ).inSingletonScope();
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

    this.booted(() => {
      console.debug(
        "[EventBusServiceProvider] Booted: EventBus is fully registered and operational.",
      );
    });

    this.app.terminating(async () => {
      console.debug(
        "[EventBusServiceProvider] Terminating: shutting down eventbus.",
      );
      await this.eventBus.shutdown();
    });
  }

  getEventBus(): IEventBus {
    return this.eventBus;
  }

  provides(): string[] {
    return ["EventBus"];
  }
}
