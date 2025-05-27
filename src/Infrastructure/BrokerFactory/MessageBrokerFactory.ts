import {
  BrokerType,
  IMessageBroker,
  IMessageBrokerFactory,
  IMessageBrokerFactoryMap,
  TYPES,
} from "contracts.ts";
import { inject, injectable } from "inversify";

@injectable()
export class MessageBrokerFactory implements IMessageBrokerFactory {
  constructor(
    @inject(
      TYPES.MessageBrokerFactoryMap,
    ) private readonly messageBrokerFactoryMap: IMessageBrokerFactoryMap,
  ) {}

  create(type: BrokerType): IMessageBroker {
    const creator = this.messageBrokerFactoryMap.get(type);
    if (!creator) {
      throw new Error(`Unsupported BrokerType: ${type}`);
    }
    return creator();
  }
}
