import { Consumer, IHeaders, Kafka, Producer } from "kafkajs";
import {
    EachMessagePayload,
    IConfigurationService,
    IMessageBroker,
    MessageHandler,
} from "contracts.ts";

function mapHeaders(
    headers: IHeaders | undefined,
): Record<string, Buffer | string> {
    const result: Record<string, Buffer | string> = {};

    if (!headers) {
        return result;
    }

    for (const key in headers) {
        const value = headers[key];
        if (Buffer.isBuffer(value)) {
            result[key] = value;
        } else if (typeof value === "string") {
            result[key] = value;
        } else if (value === undefined || value === null) {
            continue; // skip undefined or null
        } else {
            // Kafka headers may contain buffers or other primitive types
            result[key] = value.toString();
        }
    }

    return result;
}

export class KafkaMessageBroker implements IMessageBroker {
    private readonly kafka: Kafka;
    private readonly producer: Producer;
    private readonly consumer: Consumer;
    private readonly topics: Map<string, MessageHandler[]> = new Map();

    constructor(configurationService: IConfigurationService) {
        const clientId = configurationService.getKafkaClientId();
        const brokerList = configurationService.getKafkaBrokers();
        const groupId = configurationService.getKafkaGroupId();

        this.kafka = new Kafka({ clientId, brokers: brokerList });
        this.producer = this.kafka.producer();
        this.consumer = this.kafka.consumer({ groupId });
    }

    async setup(): Promise<void> {
        await this.producer.connect();
        await this.consumer.connect();
    }

    async start(): Promise<void> {
        for (const [topic, handlers] of this.topics.entries()) {
            await this.consumer.subscribe({ topic, fromBeginning: false });
        }

        await this.consumer.run({
            eachMessage: async ({ topic, message }) => {
                const handlers = this.topics.get(topic);
                if (!handlers || handlers.length === 0) {
                    console.warn(`No handler registered for topic: ${topic}`);
                    return;
                }

                const payload: EachMessagePayload = {
                    topic,
                    message: {
                        key: message.key?.toString(),
                        value: message.value?.toString() || "",
                        headers: mapHeaders(message.headers),
                    },
                };

                for (const handler of handlers) {
                    await handler(payload);
                }
            },
        });
    }

    async subscribe(topic: string, handler: MessageHandler): Promise<void> {
        const handlers = this.topics.get(topic) || [];
        handlers.push(handler);
        this.topics.set(topic, handlers);

        await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    async unsubscribe(topic: string): Promise<void> {
        this.topics.delete(topic);
        // KafkaJS does not support dynamic unsubscribe, requires workaround or consumer recreation.
    }

    async produce(topic: string, message: Buffer): Promise<void> {
        await this.producer.send({
            topic,
            messages: [{ value: message }],
        });
    }
    async shutdown(): Promise<void> {
        try {
            await this.consumer.disconnect();
            await this.producer.disconnect();
        } catch (error) {
            console.error("Error during Kafka shutdown:", error);
        }
    }
}
