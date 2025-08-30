const {
    OPCUAClient,
    AttributeIds,
    TimestampsToReturn,
    ClientSubscription,
    MonitoringParametersOptions,
    ReadValueIdOptions
} = require("node-opcua");
const { Conveyor, Robot } = require("./browsenames");


class opcua_subscriber {
    #wss;
    #endpoint_url;
    #remove_callbacks;
    #client;
    #session;
    #subscription;
    #remove_callback_called;
    constructor(_wss, _endpoint_url, _remove_callbacks) {
        this.#wss = _wss;
        this.#endpoint_url = _endpoint_url;
        this.#remove_callbacks = _remove_callbacks;
        this.#remove_callback_called = false;
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
            monitoredItem.on("changed", async (data_value) => {
                let value = data_value.value.value;
                console.log(`🔄 Attribute ${value_dto.attribute_name} changed:`, value);
                if (value_dto.type === Conveyor.TYPE) {
                    // Read plate position
                    if (value_dto.attribute_name !== Conveyor.PLATE_POSITION) {
                        let position_data = await this.#session.read({
                            nodeId: value_dto.position_id
                        });
                        value_dto[Conveyor.PLATE_POSITION] = position_data.value.value;
                    }
                    // Read plate recipe
                    if (value_dto.attribute_name !== Conveyor.PLATE_RECIPE_ID) {
                        let recipe_data = await this.#session.read({
                            nodeId: value_dto.recipe_id
                        });
                        value_dto[Conveyor.PLATE_RECIPE_ID] = recipe_data.value.value;
                    }
                    // Read plate occupied status
                    if (value_dto.attribute_name !== Conveyor.PLATE_OCCUPIED) {
                        let occupied_data = await this.#session.read({
                            nodeId: value_dto.occupied_id
                        });
                        value_dto[Conveyor.PLATE_OCCUPIED] = occupied_data.value.value;  
                    }
                    // Update the changed conveyor attribute
                    value_dto[value_dto.attribute_name] = value;
                }
                if (value_dto.type === Robot.TYPE) {
                    value_dto.value = value;
                }

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
        this.#subscription.on("error", (err) => {
            console.error("❌ Subscription error:", err)
            this.call_remove_callback(value_dto);
        });
        this.#client.on("connection_lost", () => {
            console.error("❌ Connection lost");
            this.call_remove_callback(value_dto);
        });
        this.#client.on("close", () => {
            console.error("❌ Connection closed");
            this.call_remove_callback(value_dto);
        });
    }

    call_remove_callback(_value_dto) {
        if (this.#remove_callback_called)
            return;
        this.#remove_callback_called = true;
        if (_value_dto.type === Conveyor.TYPE) {
            this.#remove_callbacks.get(_value_dto.type)();
        }
        if (_value_dto.type === Robot.TYPE) {
            this.#remove_callbacks.get(_value_dto.type)(_value_dto.position);
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