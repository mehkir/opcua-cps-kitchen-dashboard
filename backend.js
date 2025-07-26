const DISCOVERY_URL = "opc.tcp://localhost:4840";
const my_module = require('./my-addons/my_module.node');
const servers = my_module.findServers(DISCOVERY_URL);
const { Robot, Conveyor, Controller } = require('./browsenames');
const { ApplicationType, NodeId, OPCUAClient, resolveNodeId } = require("node-opcua");
const opcua_browser = require('./opcua-browser.js');
const opcua_browser_instance = new opcua_browser();

async function readAttributeValue(_server_url, _node_id) {
    const client = OPCUAClient.create({});
    await client.connect(_server_url);
    const session = await client.createSession();
    const dataValue = await session.read({
        nodeId: _node_id,
    });
    await session.close();
    await client.disconnect();
    return dataValue.value.value;
}

(async () => {
    for (const server of servers) {
        if (server.applicationType !== ApplicationType.Server) {
            console.log(`Skipping non-server application: ${server.applicationUri}`);
            continue;
        }

        if ((instance_id = await opcua_browser_instance.browse_instance(server.discoveryUrl, Robot.TYPE)) !== NodeId.nullNodeId) {
            console.log(`Robot type found on server: ${server.discoveryUrl}`);
            const browse_attributes_result = await opcua_browser_instance.browse_attributes(server.discoveryUrl, instance_id);
            for (const attr of browse_attributes_result.references) {
                console.log(`Robot attribute: ${attr.browseName.name} (${attr.nodeId.toString()})`);
                // console.log(`Value of ${attr.browseName.name}:`, await readAttributeValue(server.discoveryUrl, attr.nodeId));
            }
        }

        if ((instance_id = await opcua_browser_instance.browse_instance(server.discoveryUrl, Conveyor.TYPE)) !== NodeId.nullNodeId) {
            console.log(`Conveyor type found on server: ${server.discoveryUrl}`);
            const browse_objects_result = await opcua_browser_instance.browse_objects(server.discoveryUrl, instance_id, resolveNodeId("HasComponent"));
            for (const obj of browse_objects_result.references) {
                console.log(`Plate object: ${obj.browseName.name} (${obj.nodeId.toString()})`);
                const browse_attributes_result = await opcua_browser_instance.browse_attributes(server.discoveryUrl, obj.nodeId);
                for (const attr of browse_attributes_result.references) {
                    console.log(`Plate attribute: ${attr.browseName.name} (${attr.nodeId.toString()})`);
                    // console.log(`Value of ${attr.browseName.name}:`, await readAttributeValue(server.discoveryUrl, attr.nodeId));
                }
            }
        }

        if ((instance_id = await opcua_browser_instance.browse_instance(server.discoveryUrl, Controller.TYPE)) !== NodeId.nullNodeId) {
            console.log(`Controller type found on server: ${server.discoveryUrl}`);
            const browse_methods_result = await opcua_browser_instance.browse_methods(server.discoveryUrl, instance_id);
            for (const method of browse_methods_result.references) {
                console.log(`Controller method: ${method.browseName.name} (${method.nodeId.toString()})`);
            }
        }
    }
})();