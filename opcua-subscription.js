const {
    OPCUAClient,
    AttributeIds,
    TimestampsToReturn,
    ClientSubscription,
    MonitoringParametersOptions,
    ReadValueIdOptions
} = require("node-opcua");
const { Robot } = require("./browsenames");


class opcua_subscriber {
    #wss;
    #endpoint_url;
    #client;
    #session;
    #subscription;
    constructor(_wss, _endpoint_url) {
        this.#wss = _wss;
        this.#endpoint_url = _endpoint_url;
    }

    async create_session() {
        try {
            // Create the client
            this.#client = OPCUAClient.create({ endpointMustExist: false });
            // Connect to OPC UA server
            await this.#client.connect(this.#endpoint_url);
            console.log("✅ Connected to OPC UA server");
            // Create session
            this.#session = await this.#client.createSession();
            console.log("✅ Session created");
        } catch (err) {
            console.error("❌ Error:", err);
        }
    }

    async create_subscription() {
        try {
            // Create a subscription
            this.#subscription = ClientSubscription.create(this.#session, {
                requestedPublishingInterval: 0,
                requestedLifetimeCount: 100,
                requestedMaxKeepAliveCount: 10,
                maxNotificationsPerPublish: 10,
                publishingEnabled: true,
                priority: 10
            });

            this.#subscription.on("started", () =>
                console.log("📡 Subscription started (ID:", this.#subscription.subscriptionId, ")")
            );

            this.#subscription.on("terminated", () => console.log("❌ Subscription terminated"));
        } catch (err) {
            console.error("❌ Error:", err);
        }
    }

    async subscribe(node_id, value_dto) {
        try {
            const monitoredItem = await this.#subscription.monitor(
                {
                    nodeId: node_id,
                    attributeId: AttributeIds.Value
                },
                {
                    samplingInterval: 0,
                    discardOldest: true,
                    queueSize: 1
                },
                TimestampsToReturn.Both
            );

            // Handle data change
            monitoredItem.on("changed", (dataValue) => {
                let value = dataValue.value.value;
                // if (Array.isArray(value)) {
                //     value = value.map(item => item.toString());
                // }

                if (value_dto.attribute_name === Robot.DISH_NAME || value_dto.attribute_name === Robot.INGREDIENTS) {
                    console.log(`Raw value for ${value_dto.attribute_name}:`, value);
                    console.log(`DataType for ${value_dto.attribute_name}:`, dataValue.value.dataType);
                }
                // if (Array.isArray(value)) {
                //     value = value.map(item => Buffer.isBuffer(item) ? item.toString('utf8') : item.toString());
                // }
                // if (Buffer.isBuffer(value)) {
                //     value = value.toString('utf8');
                // }

                console.log(`🔄 Attribute ${value_dto.attribute_name} changed:`, value);
                value_dto.value = value;

                // Broadcast to all connected clients
                this.#wss.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ value_dto }));
                    }
                });
            });
        } catch (err) {
            console.error("❌ Error:", err);
        }
    }

    async disconnect() {
        try {
            if (this.#subscription) {
                await this.#subscription.terminate();
            }
            if (this.#session) {
                await this.#session.close();
            }
            if (this.#client) {
                await this.#client.disconnect();
            }
            console.log("✅ Disconnected from server");
        } catch (err) {
            console.error("❌ Error during disconnect:", err);
        }
    }
}
module.exports = opcua_subscriber;
// Example usage
// const WebSocket = require('ws');
// const wss = new WebSocket.Server({ port: 8080 });
// const opcua_subscriber = require('./opcua-subscription.js');
// (async () => {
//     const opcua = new opcua_subscriber(wss, "opc.tcp://localhost:4000");
//     await opcua.create_session();
//     await opcua.create_subscription();
//     await opcua.subscribe("ns=1;s=overall_time");
// })();