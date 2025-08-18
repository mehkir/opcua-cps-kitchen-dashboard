const DISCOVERY_URL = "opc.tcp://localhost:4840";
const WS_PORT = 8080;
const my_module = require('./my-addons/my_module.node');
const { Robot, Conveyor, Controller } = require('./browsenames');
const { ApplicationType, NodeId, OPCUAClient, resolveNodeId } = require("node-opcua");
const opcua_browser = require('./opcua-browser.js');
const WebSocket = require('ws');
const program = require("commander");

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

async function browse_robot_instance(_server, _instance_id) {
    const browse_attributes_result = await opcua_browser_instance.browse_attributes(_server.discoveryUrl, _instance_id);
    const robot_server = {
        attributes : {}
    };
    for (const attr of browse_attributes_result.references) {
        console.log(`Robot attribute: ${attr.browseName.name} (${attr.nodeId.toString()})`);
        if (attr.browseName.name === Robot.POSITION) {
            robot_server.position = await read_attribute_value(_server.discoveryUrl, attr.nodeId);
            continue;
        }
        robot_server.attributes[attr.browseName.name] = attr.nodeId;
    }
    robot_server.url = _server.discoveryUrl;
    return robot_server;
}

async function browse_conveyor_instance(_server, _instance_id) {
    const conveyor = { plates: new Map() };
    const browse_objects_result = await opcua_browser_instance.browse_objects(_server.discoveryUrl, _instance_id, resolveNodeId("HasComponent"));
    for (const obj of browse_objects_result.references) {
        const plate_attributes = {};
        console.log(`Plate object: ${obj.browseName.name} (${obj.nodeId.toString()})`);
        const browse_attributes_result = await opcua_browser_instance.browse_attributes(_server.discoveryUrl, obj.nodeId);
        for (const attr of browse_attributes_result.references) {
            console.log(`Plate attribute: ${attr.browseName.name} (${attr.nodeId.toString()})`);
            if (attr.browseName.name === Conveyor.PLATE_ID) {
                plate_attributes.id = await read_attribute_value(_server.discoveryUrl, attr.nodeId);
                continue;
            }
            plate_attributes[attr.browseName.name] = attr.nodeId;
        }
        conveyor.plates.set(plate_attributes.id, plate_attributes);
    }
    conveyor.url = _server.discoveryUrl;
    return conveyor;
}

async function browse_controller_instance (_server, _instance_id) {
    const controller = { methods : {} };
    const browse_methods_result = await opcua_browser_instance.browse_methods(_server.discoveryUrl, _instance_id);
    controller.instance_id = _instance_id;
    for (const method of browse_methods_result.references) {
        console.log(`Controller method: ${method.browseName.name} (${method.nodeId.toString()})`);
        controller.methods[method.browseName.name] = method.nodeId;
    }
    controller.url = _server.discoveryUrl;
    return controller;
}

program
  .option("-rc, --robot-count <number>", "Number of robots to simulate")

program.parse(process.argv);

const options = program.opts();
if (options.robotCount === undefined && typeof options.robotCount !== 'number') {
    console.log("Robot Count is required and must be of type number");
    process.exit(1);
}
console.log("Robot Count:", options.robotCount);

let servers;
try {
    servers = my_module.findServers(DISCOVERY_URL);   
} catch (error) {
    console.log(`${error} (is the discovery server started?)`);
    return;
}
const ws_server = new WebSocket.Server({ port: WS_PORT });
// Cleanup on Ctrl+C
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down...');
    for (const sub of opcua_subscribers) {
        try {
            await sub.disconnect();
        } catch (err) {
            console.error("Error during disconnect:", err);
        }
    }
    ws_server.close(() => {
        console.log('WebSocket server closed.');
        process.exit(0);
    });
});

const opcua_browser_instance = new opcua_browser();
const robots = new Map();
let conveyor;
let controller;
const opcua_subscribers = [];

for (const server of servers) {
    if (server.applicationType !== ApplicationType.Server) {
        console.log(`Skipping non-server application: ${server.applicationUri}`);
        continue;
    }

    if ((instance_id = await opcua_browser_instance.browse_instance(server.discoveryUrl, Robot.TYPE)) !== NodeId.nullNodeId) {
        console.log(`Robot type found on server: ${server.discoveryUrl}`);
        const robot_server = await browse_robot_instance(server, instance_id, robots);
        robots.set(robot_server.position, robot_server);
    }

    if ((instance_id = await opcua_browser_instance.browse_instance(server.discoveryUrl, Conveyor.TYPE)) !== NodeId.nullNodeId) {
        console.log(`Conveyor type found on server: ${server.discoveryUrl}`);
        conveyor = await browse_conveyor_instance(server, instance_id);
    }

    if ((instance_id = await opcua_browser_instance.browse_instance(server.discoveryUrl, Controller.TYPE)) !== NodeId.nullNodeId) {
        console.log(`Controller type found on server: ${server.discoveryUrl}`);
        controller = await browse_controller_instance(server, instance_id);
    }
}

(async () => {




    ws_server.on('connection', function connection(ws) {
        ws.on('message', function incoming(message) {
            const parsed_message = JSON.parse(message);
            console.log('received: %s', parsed_message);
            if (parsed_message.context === Controller.PLACE_RANDOM_ORDER) {
                console.log("Placing random order");
                const method_id = controller.methods[Controller.PLACE_RANDOM_ORDER];
                const url = controller.url;

                (async () => {
                    try {
                        const client = OPCUAClient.create({});
                        await client.connect(url);
                        const session = await client.createSession();

                        for (let i = 0; i < parsed_message.order_count; i++) {
                            const result = await session.call({
                                objectId: controller.instance_id,
                                methodId: method_id,
                                inputArguments: []
                            });
                            console.log("Method call result:", result);
                        }

                        await session.close();
                        await client.disconnect();
                    } catch (err) {
                        console.error("Error calling controller method:", err);
                    }
                })();
            }
            if (parsed_message.context === "frontend_closed") {
                console.log("Frontend closed, cleaning up...");
                ws.close();
            }
        });
    });

    const opcua_subscriber = require('./opcua-subscription.js');
    robots.forEach(async (robot, pos) => {
        const opcua_robot_sub = new opcua_subscriber(ws_server, robot.url);
        await opcua_robot_sub.create_session();
        await opcua_robot_sub.create_subscription();
        for (const [browse_name, attribute_id] of Object.entries(robot.attributes)) {
            const robot_monitor = {
                type: Robot.TYPE,
                position: pos,
                attribute_name: browse_name
            };
            console.log(`Subscribing to robot attribute ${browse_name} at position ${pos}`);
            await opcua_robot_sub.subscribe(attribute_id, robot_monitor);
        }
        opcua_subscribers.push(opcua_robot_sub);
    });

    const opcua_conveyor_sub = new opcua_subscriber(ws_server, conveyor.url);
    await opcua_conveyor_sub.create_session();
    await opcua_conveyor_sub.create_subscription();
    conveyor.plates.forEach(async (plate, id) => {
        for (const [browse_name, attribute_id] of Object.entries(plate)) {
            const plate_monitor = {
                type: Conveyor.TYPE,
                id: id,
                position_id: plate[Conveyor.PLATE_POSITION],
                recipe_id: plate[Conveyor.PLATE_RECIPE_ID],
                occupied_id: plate[Conveyor.PLATE_OCCUPIED],
                attribute_name: browse_name
            };
            console.log(`Subscribing to conveyor plate attribute ${browse_name} of plate ${id}`);
            await opcua_conveyor_sub.subscribe(attribute_id, plate_monitor);
        }
    });
    opcua_subscribers.push(opcua_conveyor_sub);
})();