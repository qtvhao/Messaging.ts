import {
  BrokerType,
  IMessageBroker,
  IMessageBrokerFactory,
  IMessageBrokerFactoryMap,
} from "contracts.ts";
import { InMemoryMessageBroker } from "../Messaging/InMemoryMessageBroker";

export class MessageBrokerFactory implements IMessageBrokerFactory {
  constructor(
    private readonly messageBrokerFactoryMap: IMessageBrokerFactoryMap =
      new Map([
        ["inmemory", () => {
          return new InMemoryMessageBroker();
        }],
      ]),
  ) {}

  create(type: BrokerType): IMessageBroker {
    const creator = this.messageBrokerFactoryMap.get(type);
    if (!creator) {
      throw new Error(`Unsupported BrokerType: ${type}`);
    }
    return creator();
  }
}
