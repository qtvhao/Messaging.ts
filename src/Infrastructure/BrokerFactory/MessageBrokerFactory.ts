import {
    BrokerType,
    IMessageBroker,
    IMessageBrokerFactory,
    IMessageBrokerFactoryMap,
} from "contracts.ts";

export class MessageBrokerFactory implements IMessageBrokerFactory {
  constructor(
    private readonly messageBrokerFactoryMap: IMessageBrokerFactoryMap
  ) {}

  create(type: BrokerType): IMessageBroker {
    const creator = this.messageBrokerFactoryMap.get(type);
    if (!creator) {
      throw new Error(`Unsupported BrokerType: ${type}`);
    }
    return creator();
  }
}
