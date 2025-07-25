const DISCOVERY_URL = "opc.tcp://localhost:4840";
const my_module = require('./my-addons/my_module.node');
const servers = my_module.findServers(DISCOVERY_URL);
const { Robot, Conveyor, Controller } = require('./browsenames');
const { ApplicationType, NodeId, OPCUAClient } = require("node-opcua");
const opcua_browser = require('./opcua-browser.js');
const opcua_browser_instance = new opcua_browser();
(async () => {
    for (const server of servers) {
        if (server.applicationType !== ApplicationType.Server) {
            console.log(`Skipping non-server application: ${server.applicationUri}`);
            continue;
        }
        const robot_object_type = await opcua_browser_instance.browse_object_type(server.discoveryUrl, Robot.TYPE);
        const conveyor_object_type = await opcua_browser_instance.browse_object_type(server.discoveryUrl, Conveyor.TYPE);
        const controller_object_type = await opcua_browser_instance.browse_object_type(server.discoveryUrl, Controller.TYPE);

        if (robot_object_type !== NodeId.nullNodeId) {
            console.log(`Robot type found on server: ${server.discoveryUrl}`);
            const browse_objects_result = await opcua_browser_instance.browse_objects(server.discoveryUrl);
            for (const ref of browse_objects_result.references) {
                if (ref.typeDefinition.toString() === robot_object_type.toString()) {
                    const browse_attributes_result = await opcua_browser_instance.browse_attributes(server.discoveryUrl, ref.nodeId);
                    for (const attr of browse_attributes_result.references) {
                        console.log(`Robot attribute: ${attr.browseName.name} (${attr.nodeId.toString()})`);
                        // Read attribute values und log them
                        const client = OPCUAClient.create({});
                        await client.connect(server.discoveryUrl);
                        const session = await client.createSession();
                        const dataValue = await session.read({
                            nodeId: attr.nodeId,
                        });
                        console.log(`Value of ${attr.browseName.name}:`, dataValue.value.value);
                        await session.close();
                        await client.disconnect();
                    }
                }
            }
        }
        if (conveyor_object_type !== NodeId.nullNodeId) {
            console.log(`Conveyor type found on server: ${server.discoveryUrl}`);
        }
        if (controller_object_type !== NodeId.nullNodeId) {
            console.log(`Controller type found on server: ${server.discoveryUrl}`);
        }
    }
})();