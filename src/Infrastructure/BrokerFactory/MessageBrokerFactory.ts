import {
    BrokerType,
    IMessageBroker,
    IMessageBrokerFactory,
} from "contracts.ts";

export class MessageBrokerFactory implements IMessageBrokerFactory {
    create(type: BrokerType): IMessageBroker {
        switch (type) {
            case "memory":
                return new InMemoryMessageBroker();
            case "kafka":
            case "nats":
            default:
                throw new Error(`Unsupported broker type: ${type}`);
        }
    }
}
