import {
    BrokerType,
    IMessageBroker,
    IMessageBrokerFactory,
} from "contracts.ts";

export class MessageBrokerFactory implements IMessageBrokerFactory {
  constructor(
    private readonly creators: Map<BrokerType, () => IMessageBroker>
  ) {}

  create(type: BrokerType): IMessageBroker {
    const creator = this.creators.get(type);
    if (!creator) {
      throw new Error(`Unsupported BrokerType: ${type}`);
    }
    return creator();
  }
}
