// Example subscribe usage
// const WebSocket = require('ws');
// const wss = new WebSocket.Server({ port: 8080 });
// const OPCUA_Subscriber = require('./opcua-subscription.js');

// (async () => {
//     const opcua = new OPCUA_Subscriber(wss, "opc.tcp://localhost:4000");
//     await opcua.create_session();
//     await opcua.create_subscription();
//     await opcua.subscribe("ns=1;s=overall_time");
// })();

const { OPCUAClient } = require("node-opcua");

const discoveryUrl = "opc.tcp://localhost:4840"; // Update as needed

async function discoverServersOnNetwork() {
    const client = OPCUAClient.create();

    try {
        await client.connect(discoveryUrl);

        const servers = await client.findServers();
        console.log("Raw servers result:", servers);
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.disconnect();
    }
}

discoverServersOnNetwork();

