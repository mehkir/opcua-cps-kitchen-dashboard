const DISCOVERY_URL = "opc.tcp://localhost:4840";
const my_module = require('./my-addons/my_module.node');
const servers = my_module.findServers(DISCOVERY_URL);
const { Robot, Conveyor, Controller } = require('./browsenames');
const { ApplicationType, NodeId, OPCUAClient, resolveNodeId } = require("node-opcua");
const opcua_browser = require('./opcua-browser.js');
const opcua_browser_instance = new opcua_browser();

async function read_attribute_value(_server_url, _node_id) {
    const client = OPCUAClient.create({});
    await client.connect(_server_url);
    const session = await client.createSession();
    const data_value = await session.read({
        nodeId: _node_id,
    });
    await session.close();
    await client.disconnect();
    return data_value.value.value;
}

const robots = new Map();
const conveyor = {};
conveyor.plates = new Map();
const controller = {};
controller.methods = {};
await (async () => {
    for (const server of servers) {
        if (server.applicationType !== ApplicationType.Server) {
            console.log(`Skipping non-server application: ${server.applicationUri}`);
            continue;
        }

        if ((instance_id = await opcua_browser_instance.browse_instance(server.discoveryUrl, Robot.TYPE)) !== NodeId.nullNodeId) {
            console.log(`Robot type found on server: ${server.discoveryUrl}`);
            const browse_attributes_result = await opcua_browser_instance.browse_attributes(server.discoveryUrl, instance_id);
            const robot_server = {};
            robot_server.attributes = {};
            for (const attr of browse_attributes_result.references) {
                console.log(`Robot attribute: ${attr.browseName.name} (${attr.nodeId.toString()})`);
                if (attr.browseName.name === Robot.POSITION) {
                    robot_server.position = await read_attribute_value(server.discoveryUrl, attr.nodeId);
                    continue;
                }
                robot_server.attributes[attr.browseName.name] = attr.nodeId;
            }
            robot_server.url = server.discoveryUrl;
            robots.set(robot_server.position, robot_server);
        }

        if ((instance_id = await opcua_browser_instance.browse_instance(server.discoveryUrl, Conveyor.TYPE)) !== NodeId.nullNodeId) {
            console.log(`Conveyor type found on server: ${server.discoveryUrl}`);
            const browse_objects_result = await opcua_browser_instance.browse_objects(server.discoveryUrl, instance_id, resolveNodeId("HasComponent"));
            for (const obj of browse_objects_result.references) {
                const plate_attributes = {};
                console.log(`Plate object: ${obj.browseName.name} (${obj.nodeId.toString()})`);
                const browse_attributes_result = await opcua_browser_instance.browse_attributes(server.discoveryUrl, obj.nodeId);
                for (const attr of browse_attributes_result.references) {
                    console.log(`Plate attribute: ${attr.browseName.name} (${attr.nodeId.toString()})`);
                    plate_attributes[attr.browseName.name] = attr.nodeId;
                    if (attr.browseName.name === Conveyor.PLATE_POSITION) {
                        plate_attributes.position = await read_attribute_value(server.discoveryUrl, attr.nodeId);
                    }
                }
                conveyor.plates.set(plate_attributes.position, plate_attributes);
            }
            conveyor.url = server.discoveryUrl;
        }

        if ((instance_id = await opcua_browser_instance.browse_instance(server.discoveryUrl, Controller.TYPE)) !== NodeId.nullNodeId) {
            console.log(`Controller type found on server: ${server.discoveryUrl}`);
            const browse_methods_result = await opcua_browser_instance.browse_methods(server.discoveryUrl, instance_id);
            for (const method of browse_methods_result.references) {
                console.log(`Controller method: ${method.browseName.name} (${method.nodeId.toString()})`);
                controller.methods[method.browseName.name] = method.nodeId;
            }
            controller.url = server.discoveryUrl;
        }
    }
})();

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
const opcua_subscriber = require('./opcua-subscription.js');
(async () => {
    robots.forEach(async (robot, pos) => {
        const opcua = new opcua_subscriber(wss, robot.url);
        await opcua.create_session();
        await opcua.create_subscription();
        const robot_monitor = {};
        robot_monitor.position = pos;
        for (const [browse_name, attribute_id] of Object.entries(robot.attributes)) {
            robot_monitor.attribute_name = browse_name;
            console.log(`Subscribing to robot at position ${pos}`);
            await opcua.subscribe(attribute_id, robot_monitor);
        }
    });
})();