import {
    BrokerType,
    IMessageBroker,
    IMessageBrokerFactory,
} from "contracts.ts";
type BrokerCreator = () => IMessageBroker;

export class MessageBrokerFactory implements IMessageBrokerFactory {
  private readonly registry = new Map<BrokerType, BrokerCreator>();

  register(type: BrokerType, creator: BrokerCreator): void {
    this.registry.set(type, creator);
  }

  create(type: BrokerType): IMessageBroker {
    const creator = this.registry.get(type);
    if (!creator) {
      throw new Error(`Unsupported broker type: ${type}`);
    }
    return creator();
  }
}
