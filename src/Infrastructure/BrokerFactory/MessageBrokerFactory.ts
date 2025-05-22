import {
    BrokerType,
    IMessageBroker,
    IMessageBrokerFactory,
} from "contracts.ts";
import { InMemoryMessageBroker } from "../Messaging/InMemoryBroker";

export class MessageBrokerFactory implements IMessageBrokerFactory {
    create(type: BrokerType): IMessageBroker {
        switch (type) {
            case "inmemory":
                return new InMemoryMessageBroker();
            case "kafka":
            case "nats":
            default:
                throw new Error(`Unsupported broker type: ${type}`);
        }
    }
}
