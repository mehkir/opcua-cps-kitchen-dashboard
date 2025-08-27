const DISCOVERY_URL = "opc.tcp://localhost:4840";
const WS_PORT = 8080;
const my_module = require('./my-addons/my_module.node');
const { Robot, Conveyor, Controller } = require('./browsenames');
const { ApplicationType, NodeId, OPCUAClient, resolveNodeId } = require("node-opcua");
const opcua_browser = require('./opcua-browser.js');
const opcua_subscriber = require('./opcua-subscription.js');
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
    const opcua_browser_instance = new opcua_browser();
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
    const opcua_browser_instance = new opcua_browser();
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
    const opcua_browser_instance = new opcua_browser();
    const browse_methods_result = await opcua_browser_instance.browse_methods(_server.discoveryUrl, _instance_id);
    controller.instance_id = _instance_id;
    for (const method of browse_methods_result.references) {
        console.log(`Controller method: ${method.browseName.name} (${method.nodeId.toString()})`);
        controller.methods[method.browseName.name] = method.nodeId;
    }
    controller.url = _server.discoveryUrl;
    return controller;
}

async function subscribe_conveyor (_conveyor) {
    conveyor_subscriber = new opcua_subscriber(ws_server, _conveyor.url, remove_callbacks);
    await conveyor_subscriber.create_session();
    await conveyor_subscriber.create_subscription();
    _conveyor.plates.forEach(async (plate, id) => {
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
            await conveyor_subscriber.subscribe(attribute_id, plate_monitor);
        }
    });
}

async function subscribe_robot (_robot) {
    const opcua_robot_sub = new opcua_subscriber(ws_server, _robot.url, remove_callbacks);
    await opcua_robot_sub.create_session();
    await opcua_robot_sub.create_subscription();
    for (const [browse_name, attribute_id] of Object.entries(_robot.attributes)) {
        const robot_monitor = {
            type: Robot.TYPE,
            position: _robot.position,
            attribute_name: browse_name
        };
        console.log(`Subscribing to robot attribute ${browse_name} at position ${_robot.position}`);
        await opcua_robot_sub.subscribe(attribute_id, robot_monitor);
    }
    robot_subscribers.set(_robot.position, opcua_robot_sub);
}

async function place_random_order (_order_count) {
    console.log("Placing random order");
    const method_id = controller.methods[Controller.PLACE_RANDOM_ORDER];
    const url = controller.url;
    const client = OPCUAClient.create({});
    let session = null;
    try {
        await client.connect(url);
        session = await client.createSession();
        for (let i = 0; i < _order_count; i++) {
            const result = await session.call({
                objectId: controller.instance_id,
                methodId: method_id,
                inputArguments: []
            });
            console.log("Method call result:", result);
        }
    } catch (err) {
        console.error("Error calling controller method:", err);
        reset_controller();
    } finally {
        if (session) await session.close();
        await client.disconnect();
    }
}

async function browse_servers () {
    if (interval_id)
        return;

    const opcua_browser_instance = new opcua_browser();
    interval_id = setInterval(async () => {
        if (!is_run_browsing()) {
            clearInterval(interval_id);
            interval_id = null;
            console.log('Browsing stopped')
        } else {
            let servers;
            try {
                servers = my_module.findServers(DISCOVERY_URL);   
            } catch (error) {
                console.log(`${error} (is the discovery server started?)`);
                return;
            }

            for (const server of servers) {
                if (server.applicationType !== ApplicationType.Server) {
                    console.log(`Skipping non-server application: ${server.applicationUri}`);
                    continue;
                }

                let instance_id;
                console.log(`Current robot subscribers: ${robot_subscribers.size}`);
                if (robot_subscribers.size < robot_count && (instance_id = await opcua_browser_instance.browse_instance(server.discoveryUrl, Robot.TYPE)) !== NodeId.nullNodeId) {
                    console.log(`Robot type found on server: ${server.discoveryUrl}`);
                    const robot_server = await browse_robot_instance(server, instance_id);
                    if (!robot_subscribers.has(robot_server.position))
                        await subscribe_robot(robot_server);
                }

                if (conveyor_subscriber === null && (instance_id = await opcua_browser_instance.browse_instance(server.discoveryUrl, Conveyor.TYPE)) !== NodeId.nullNodeId) {
                    console.log(`Conveyor type found on server: ${server.discoveryUrl}`);
                    const conveyor_server = await browse_conveyor_instance(server, instance_id);
                    await subscribe_conveyor(conveyor_server);
                }

                if (controller === null && (instance_id = await opcua_browser_instance.browse_instance(server.discoveryUrl, Controller.TYPE)) !== NodeId.nullNodeId) {
                    console.log(`Controller type found on server: ${server.discoveryUrl}`);
                    controller = await browse_controller_instance(server, instance_id);
                }
            }
        }
        console.log("Browsing ...");
    }, 1000);
}

function is_run_browsing() {
    return controller === null || robot_subscribers.size < robot_count || conveyor_subscriber === null;
}

function remove_robot_subscriber(_position) {
    const robot_sub = robot_subscribers.get(_position);
    if (robot_sub) {
        robot_sub.disconnect().catch(err => console.error("Error during robot disconnect:", err));
        robot_subscribers.delete(_position);
    }
    browse_servers();
}

function remove_conveyor_subscriber() {
    if (conveyor_subscriber) {
        conveyor_subscriber.disconnect().catch(err => console.error("Error during conveyor disconnect:", err));
        conveyor_subscriber = null;
    }
    browse_servers();
}

function reset_controller() {
    if (controller) {
        controller = null;
    }
    browse_servers();
}

program
  .option("-rc, --robot-count <number>", "Number of robots to simulate")

program.parse(process.argv);
const options = program.opts();
const robot_count = Number(options.robotCount);
if (isNaN(robot_count) || robot_count <= 0) {
    console.log("A positive number is required for robot Count");
    process.exit(1);
}
console.log("Robot Count:", robot_count);

const remove_callbacks = new Map();
remove_callbacks.set(Robot.TYPE, remove_robot_subscriber);
remove_callbacks.set(Conveyor.TYPE, remove_conveyor_subscriber);

let interval_id = null;
let controller = null;
const robot_subscribers = new Map();
let conveyor_subscriber = null;

const ws_server = new WebSocket.Server({ port: WS_PORT });
// Cleanup on Ctrl+C
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down...');
    if (interval_id)
        clearInterval(interval_id);
    for (const robot_sub of robot_subscribers.values()) {
        robot_sub.disconnect().catch(err => console.error("Error during robot disconnect:", err));
    }
    if (conveyor_subscriber)
        await conveyor_subscriber.disconnect().catch(err => console.error("Error during conveyor disconnect:", err));
    ws_server.close(() => {
        console.log('WebSocket server closed.');
        process.exit(0);
    });
});


// Start WebSocket server
ws_server.on('connection', function connection(ws_connection) {
    ws_connection.on('message', async function incoming(message) {
        const parsed_message = JSON.parse(message);
        console.log('received: %s', parsed_message);
        if (parsed_message.context === Controller.PLACE_RANDOM_ORDER) {
            await place_random_order(parsed_message.order_count);
        }
        if (parsed_message.context === "frontend_closed") {
            console.log("Frontend closed, cleaning up...");
            ws_connection.close();
        }
    });
});
// Schedule browse instance
browse_servers();

