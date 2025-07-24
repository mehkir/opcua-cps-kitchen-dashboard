const {
    OPCUAClient,
    AttributeIds,
    TimestampsToReturn,
    ClientSubscription,
    MonitoringParametersOptions,
    ReadValueIdOptions
} = require("node-opcua");


class OPCUA_Subscriber {
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
            await client.connect(this.#endpoint_url); // replace with your server
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

    async subscribe(node_id) {
        try {
            const monitoredItem = await this.#subscription.monitor(
                {
                    nodeId: node_id,
                    attributeId: AttributeIds.Value
                },
                {
                    samplingInterval: 0,
                    discardOldest: true,
                    queueSize: 10
                },
                TimestampsToReturn.Both
            );

            // Handle data change
            monitoredItem.on("changed", (dataValue) => {
                const value = dataValue.value.value;
                console.log("🔄 Value changed:", value);

                // Broadcast to all connected clients
                this.#wss.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ value }));
                    }
                });
            });

            // Keep the client running for a while
            // setTimeout(async () => {
            //     await subscription.terminate();
            //     await session.close();
            //     await client.disconnect();
            //     console.log("✅ Disconnected from server");
            // }, 30000); // Monitor for 30 seconds
        } catch (err) {
            console.error("❌ Error:", err);
        }
    }
}