const DISCOVERY_URL = "opc.tcp://localhost:4840";
const WS_PORT = 8080;
const PLACING_RATE_MS = 100;
const my_module = require('./my-addons/my_module.node');
const { Robot, Conveyor, Controller, Kitchen } = require('./browsenames');
const { ApplicationType, NodeId, OPCUAClient, resolveNodeId } = require("node-opcua");
const opcua_browser = require('./opcua-browser.js');
const opcua_subscriber = require('./opcua-subscription.js');
const WebSocket = require('ws');
const {program} = require("commander");

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

async function read_kitchen_attribute_value(_session, _node_id) {
    const data_value = await _session.read({
        nodeId: _node_id,
    });
    return data_value.value.value;
}

async function browse_robot_instance(_server, _instance_id) {
    const robot_server = {
        attributes : {}
    };
    const opcua_browser_instance = new opcua_browser();
    const browse_attributes_result = await opcua_browser_instance.browse_attributes(_server.discoveryUrl, _instance_id);
    for (const attr of browse_attributes_result.references) {
        console.log(`Robot attribute: ${attr.browseName.name} (${attr.nodeId.toString()})`);
        if (attr.browseName.name === Robot.POSITION) {
            robot_server.position = await read_attribute_value(_server.discoveryUrl, attr.nodeId);
        }
        robot_server.attributes[attr.browseName.name] = attr.nodeId;
    }
    robot_server.url = _server.discoveryUrl;
    return robot_server;
}

async function browse_conveyor_instance(_server, _instance_id) {
    const conveyor = {
        plates: new Map(),
        attributes: {}
    };
    const opcua_browser_instance = new opcua_browser();
    const browse_objects_result = await opcua_browser_instance.browse_objects(_server.discoveryUrl, _instance_id, resolveNodeId("HasComponent"));
    for (const obj of browse_objects_result.references) {
        const plate_attributes = {};
        console.log(`Plate object: ${obj.browseName.name} (${obj.nodeId.toString()})`);
        const browse_attributes_result = await opcua_browser_instance.browse_attributes(_server.discoveryUrl, obj.nodeId);
        for (const attr of browse_attributes_result.references) {
            console.log(`Plate attribute: ${attr.browseName.name} (${attr.nodeId.toString()})`);
            if (attr.browseName.name === Conveyor.PLATE_ID) {
                plate_attributes[Conveyor.PLATE_ID] = await read_attribute_value(_server.discoveryUrl, attr.nodeId);
                continue;
            }
            plate_attributes[attr.browseName.name] = attr.nodeId;
        }
        conveyor.plates.set(plate_attributes[Conveyor.PLATE_ID], plate_attributes);
    }
    const browse_attributes_result = await opcua_browser_instance.browse_attributes(_server.discoveryUrl, _instance_id);
    for (const attr of browse_attributes_result.references) {
        console.log(`Conveyor attribute: ${attr.browseName.name} (${attr.nodeId.toString()})`);
        conveyor.attributes[attr.browseName.name] = attr.nodeId;
    }
    conveyor.url = _server.discoveryUrl;
    return conveyor;
}

async function browse_controller_instance (_server, _instance_id) {
    const controller = {
        methods : {},
        attributes : {}
    };
    const opcua_browser_instance = new opcua_browser();
    const browse_methods_result = await opcua_browser_instance.browse_methods(_server.discoveryUrl, _instance_id);
    controller.instance_id = _instance_id;
    for (const method of browse_methods_result.references) {
        console.log(`Controller method: ${method.browseName.name} (${method.nodeId.toString()})`);
        controller.methods[method.browseName.name] = method.nodeId;
    }
    const browse_attributes_result = await opcua_browser_instance.browse_attributes(_server.discoveryUrl, _instance_id);
    for (const attr of browse_attributes_result.references) {
        console.log(`Controller attribute: ${attr.browseName.name} (${attr.nodeId.toString()})`);
        controller.attributes[attr.browseName.name] = attr.nodeId;
    }
    controller.url = _server.discoveryUrl;
    return controller;
}

async function browse_kitchen_instance (_server, _instance_id) {
    const kitchen = { 
        methods: {},
        attributes: {},
        remote_controller_attributes: {},
        remote_conveyor_attributes: {},
        remote_robots: new Map()
    };
    kitchen.instance_id = _instance_id;
    const opcua_browser_instance = new opcua_browser();
    /* Browse kitchen methods */
    const browse_methods_result = await opcua_browser_instance.browse_methods(_server.discoveryUrl, _instance_id);
    for (const method of browse_methods_result.references) {
        console.log(`Kitchen method: ${method.browseName.name} (${method.nodeId.toString()})`);
        kitchen.methods[method.browseName.name] = method.nodeId;
    }
    /* Browse kitchen attributes */
    const browse_attributes_result = await opcua_browser_instance.browse_attributes(_server.discoveryUrl, _instance_id);
    for (const attr of browse_attributes_result.references) {
        console.log(`Kitchen attribute: ${attr.browseName.name} (${attr.nodeId.toString()})`);
        kitchen.attributes[attr.browseName.name] = attr.nodeId;
    }
    /* Browse kitchen objects (remote controller, remote conveyor, remote robots) */
    const browse_objects_result = await opcua_browser_instance.browse_objects(_server.discoveryUrl, _instance_id, resolveNodeId("HasComponent"));
    for (const obj of browse_objects_result.references) {
        console.log(`Kitchen object: ${obj.browseName.name} (${obj.nodeId.toString()})`);
        /* Browse remote controller attributes */
        if (obj.typeDefinition.toString() === (await opcua_browser_instance.browse_object_type(_server.discoveryUrl, Controller.REMOTE_TYPE)).toString()) {
            const browse_attributes_result = await opcua_browser_instance.browse_attributes(_server.discoveryUrl, obj.nodeId);
            for (const attr of browse_attributes_result.references) {
                console.log(`Remote controller attribute: ${attr.browseName.name} (${attr.nodeId.toString()})`);
                kitchen.remote_controller_attributes[attr.browseName.name] = attr.nodeId;
            }
        }
        /* Browse remote conveyor attributes */
        if (obj.typeDefinition.toString() === (await opcua_browser_instance.browse_object_type(_server.discoveryUrl, Conveyor.REMOTE_TYPE)).toString()) {
            const browse_attributes_result = await opcua_browser_instance.browse_attributes(_server.discoveryUrl, obj.nodeId);
            for (const attr of browse_attributes_result.references) {
                console.log(`Remote conveyor attribute: ${attr.browseName.name} (${attr.nodeId.toString()})`);
                kitchen.remote_conveyor_attributes[attr.browseName.name] = attr.nodeId;
            }
        }
        /* Browse remote robot attributes */
        if (obj.typeDefinition.toString() === (await opcua_browser_instance.browse_object_type(_server.discoveryUrl, Robot.REMOTE_TYPE)).toString()) {
            const remote_robot_attributes = {};
            const browse_attributes_result = await opcua_browser_instance.browse_attributes(_server.discoveryUrl, obj.nodeId);
            for (const attr of browse_attributes_result.references) {
                console.log(`Remote robot attribute: ${attr.browseName.name} (${attr.nodeId.toString()})`);
                if (attr.browseName.name === Robot.POSITION) {
                    remote_robot_attributes.position = await read_attribute_value(_server.discoveryUrl, attr.nodeId);
                }
                remote_robot_attributes[attr.browseName.name] = attr.nodeId;
            }
            kitchen.remote_robots.set(remote_robot_attributes.position, remote_robot_attributes);
        }
    }
    kitchen.url = _server.discoveryUrl;
    return kitchen;
}

async function connect_to_kitchen() {
    if (kitchen?.client && kitchen.session) {
        console.log('Kitchen already connected, skipping connect');
        return;
    }

    console.log('Connecting to kitchen');
    // clean up any half‑open previous client
    if (kitchen?.client) {
        try { await kitchen.client.disconnect(); } catch (e) {
            console.error('Error disconnecting previous kitchen client:', e);
        }
    }
    kitchen.client = OPCUAClient.create({});
    kitchen.session = null;
    try {
        await kitchen.client.connect(kitchen.url);
        console.log("Connected to kitchen at", kitchen.url);
        kitchen.session = await kitchen.client.createSession();
        console.log("Session created with kitchen");
    } catch (err) {
        console.error("Error connecting to kitchen:", err);
        await shutdown_kitchen_subscription_and_client();
    }
}

async function subscribe_conveyor (_conveyor) {
    const remove_context = { type: Conveyor.TYPE };
    conveyor_subscriber = new opcua_subscriber(ws_server, _conveyor.url, remove_callbacks, remove_context);
    await conveyor_subscriber.create_session();
    await conveyor_subscriber.create_subscription();
    _conveyor.plates.forEach(async (plate, id) => {
        for (const [browse_name, attribute_id] of Object.entries(plate)) {
            if (browse_name === Conveyor.PLATE_ID)
                continue;
            const plate_monitor = {
                type: Conveyor.PLATE_TYPE,
                [Conveyor.PLATE_ID]: id,
                [Conveyor.PLATE_POSITION + "Id"]: plate[Conveyor.PLATE_POSITION],
                [Conveyor.PLATE_RECIPE_ID + "Id"]: plate[Conveyor.PLATE_RECIPE_ID],
                [Conveyor.PLATE_OCCUPIED + "Id"]: plate[Conveyor.PLATE_OCCUPIED],
                attribute_name: browse_name
            };
            console.log(`Subscribing to conveyor plate attribute ${browse_name} of plate ${id}`);
            await conveyor_subscriber.subscribe(attribute_id, plate_monitor);
        }
    });
    for (const [browse_name, attribute_id] of Object.entries(_conveyor.attributes)) {
        const conveyor_monitor = {
            type: Conveyor.TYPE,
            attribute_name: browse_name
        };
        console.log(`Subscribing to conveyor attribute ${browse_name}`);
        await conveyor_subscriber.subscribe(attribute_id, conveyor_monitor);
    }
}

async function subscribe_robot (_robot) {
    const remove_context = { type: Robot.TYPE, position: _robot.position };
    const opcua_robot_sub = new opcua_subscriber(ws_server, _robot.url, remove_callbacks, remove_context, {
        robot_position_switch_callback: robot_position_changed
    });
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

async function subscribe_kitchen (_kitchen) {
    const remove_context = { type: Kitchen.TYPE };
    kitchen_subscriber = new opcua_subscriber(ws_server, _kitchen.url, remove_callbacks, remove_context, {
        kitchen_assigned_orders_callback: assigned_orders_callback,
        kitchen_dropped_orders_callback: dropped_orders_callback
    });
    await kitchen_subscriber.create_session();
    await kitchen_subscriber.create_subscription();
    for (const [browse_name, attribute_id] of Object.entries(_kitchen.remote_controller_attributes)) {
        const remote_controller_monitor = {
            type: Controller.REMOTE_TYPE,
            attribute_name: browse_name
        };
        console.log(`Subscribing to remote controller attribute ${browse_name}`);
        await kitchen_subscriber.subscribe(attribute_id, remote_controller_monitor);
    }
    for (const [browse_name, attribute_id] of Object.entries(_kitchen.remote_conveyor_attributes)) {
        const remote_conveyor_monitor = {
            type: Conveyor.REMOTE_TYPE,
            attribute_name: browse_name
        };
        console.log(`Subscribing to remote conveyor attribute ${browse_name}`);
        await kitchen_subscriber.subscribe(attribute_id, remote_conveyor_monitor);
    }
    _kitchen.remote_robots.forEach(async (remote_robot, position) => {
        for (const [browse_name, attribute_id] of Object.entries(remote_robot)) {
            if (browse_name === 'position')
                continue;
            const remote_robot_monitor = {
                type: Robot.REMOTE_TYPE,
                position: position,
                attribute_name: browse_name
            };
            console.log(`Subscribing to remote robot attribute ${browse_name} at position ${position}`);
            await kitchen_subscriber.subscribe(attribute_id, remote_robot_monitor);
        }
    });
    for (const [browse_name, attribute_id] of Object.entries(_kitchen.attributes)) {
        const kitchen_monitor = {
            type: Kitchen.TYPE,
            attribute_name: browse_name
        };
        console.log(`Subscribing to kitchen attribute ${browse_name}`);
        await kitchen_subscriber.subscribe(attribute_id, kitchen_monitor);
    }
}

function assigned_orders_callback(value) {
    console.log(`🍽️ Assigned Orders updated: ${value}`);
    if (order_count <= 0) {
        console.log("All orders placed");
        return;
    }
    if (value === initial_assigned_orders) 
        return;
    backoff_placing_order_ms = PLACING_RATE_MS;
    order_count--;
    place_order();
}

function dropped_orders_callback(value) {
    console.log(`❌ Dropped Orders updated: ${value}`);
    if (value === initial_dropped_orders)
        return;
    backoff_placing_order_ms *= 2;
    place_order();
}

async function subscribe_controller (_controller) {
    const remove_context = { type: Controller.TYPE };
    controller_subscriber = new opcua_subscriber(ws_server, _controller.url, remove_callbacks, remove_context);
    await controller_subscriber.create_session();
    await controller_subscriber.create_subscription();
    for (const [browse_name, attribute_id] of Object.entries(_controller.attributes)) {
        const controller_monitor = {
            type: Controller.TYPE,
            attribute_name: browse_name
        };
        console.log(`Subscribing to controller attribute ${browse_name}`);
        await controller_subscriber.subscribe(attribute_id, controller_monitor);
    }
}

function place_random_order(_order_count) {
    console.log(`Placing ${_order_count} random orders`);
    if (order_count === 0) {
        order_count += _order_count;
        place_order();
    } else {
        order_count += _order_count;
    }
}

async function place_order() {
    if (order_count <= 0) {
        console.log("All orders placed");
        return;
    }
    await new Promise(resolve => setTimeout(resolve, backoff_placing_order_ms));
    console.log("Place random order");
    const method_id = kitchen.methods[Kitchen.PLACE_RANDOM_ORDER];
    try {
        const result = await kitchen.session.call({
            objectId: kitchen.instance_id,
            methodId: method_id,
            inputArguments: []
        });
        console.log("Method call result:", result);
    } catch (err) {
        console.error("Error calling kitchen method:", err);
        await shutdown_kitchen_subscription_and_client();
    }
}

async function shutdown_kitchen_subscription_and_client() {
    if (kitchen.session) {
        await kitchen.session.close();
    }
    if (kitchen.client) {
        await kitchen.client.disconnect();
    }
    kitchen.session = null;
    kitchen.client = null;
    remove_kitchen_subscriber();
}

async function browse_servers() {
    if (interval_id || shutting_down)
        return;

    const opcua_browser_instance = new opcua_browser();
    interval_id = setInterval(async () => {
        if (!is_run_browsing()) {
            clearInterval(interval_id);
            interval_id = null;
            console.log('Browsing stopped')
        } else {
            console.log("Browsing ...");
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
                    const available_state = await read_attribute_value(robot_server.url, robot_server.attributes[Robot.AVAILABILITY]);
                    if (available_state && !robot_subscribers.has(robot_server.position))
                        await subscribe_robot(robot_server);
                }

                if (conveyor_subscriber === null && (instance_id = await opcua_browser_instance.browse_instance(server.discoveryUrl, Conveyor.TYPE)) !== NodeId.nullNodeId) {
                    console.log(`Conveyor type found on server: ${server.discoveryUrl}`);
                    const conveyor_server = await browse_conveyor_instance(server, instance_id);
                    await subscribe_conveyor(conveyor_server);
                }

                if (controller_subscriber === null && (instance_id = await opcua_browser_instance.browse_instance(server.discoveryUrl, Controller.TYPE)) !== NodeId.nullNodeId) {
                    console.log(`Controller type found on server: ${server.discoveryUrl}`);
                    const controller_server = await browse_controller_instance(server, instance_id);
                    await subscribe_controller(controller_server);
                }

                if (kitchen_subscriber === null && (instance_id = await opcua_browser_instance.browse_instance(server.discoveryUrl, Kitchen.TYPE)) !== NodeId.nullNodeId) {
                    console.log(`Kitchen type found on server: ${server.discoveryUrl}`);
                    kitchen = await browse_kitchen_instance(server, instance_id);
                    await connect_to_kitchen();
                    initial_assigned_orders = await read_kitchen_attribute_value(kitchen.session, kitchen.attributes[Kitchen.ASSIGNED_ORDERS]);
                    initial_dropped_orders = await read_kitchen_attribute_value(kitchen.session, kitchen.attributes[Kitchen.DROPPED_ORDERS]);
                    await subscribe_kitchen(kitchen);
                }
            }
        }
    }, 1000);
}

function is_run_browsing() {
    return controller_subscriber === null || robot_subscribers.size < robot_count || conveyor_subscriber === null || kitchen_subscriber === null;
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

function remove_kitchen_subscriber() {
    if (kitchen_subscriber) {
        kitchen_subscriber.disconnect().catch(err => console.error("Error during kitchen disconnect:", err));
        kitchen_subscriber = null;
        kitchen = null;
    }
    browse_servers();
}

function remove_controller_subscriber() {
    if (controller_subscriber) {
        controller_subscriber.disconnect().catch(err => console.error("Error during controller disconnect:", err));
        controller_subscriber = null;
    }
    browse_servers();
}

function robot_position_changed(_old_position, _new_position) {
    const robot_sub_at_old_position = robot_subscribers.get(_old_position);
    const robot_sub_at_new_position = robot_subscribers.get(_new_position);
    if (((robot_sub_at_old_position && robot_sub_at_old_position.overall_dto[Robot.TYPE][Robot.POSITION] !== _old_position) || !robot_sub_at_old_position)
        && ((robot_sub_at_new_position && robot_sub_at_new_position.overall_dto[Robot.TYPE][Robot.POSITION] !== _new_position) || !robot_sub_at_new_position)) {
        robot_subscribers.delete(_old_position);
        robot_subscribers.delete(_new_position);
        if (robot_sub_at_old_position) {
            robot_subscribers.set(_new_position, robot_sub_at_old_position);
        }
        if (robot_sub_at_new_position) {
            robot_subscribers.set(_old_position, robot_sub_at_new_position);
        }
        send_overall_dto();
    }
}

function send_overall_dto() {
    if (controller_subscriber !== null) {
        const overall_dto = controller_subscriber.overall_dto;
        for(const [type, attributes] of Object.entries(overall_dto)) {
            for (const [attribute_name, value] of Object.entries(attributes)) {
                const value_dto = {
                    type: type,
                    attribute_name: attribute_name,
                    value: value
                };
                console.log(`Sending attribute ${attribute_name} for controller`);
                broadcast_to_all_connected_clients(value_dto);
            }
        }
    }
    robot_subscribers.forEach((robot_subscriber) => {
        const overall_dto = robot_subscriber.overall_dto;
        const position = overall_dto[Robot.TYPE]?.[Robot.POSITION];
        for(const [type, attributes] of Object.entries(overall_dto)) {
            for (const [attribute_name, value] of Object.entries(attributes)) {
                const value_dto = {
                    type: type,
                    position: position,
                    attribute_name: attribute_name,
                    value: value
                };
                console.log(`Sending attribute ${attribute_name} for robot at position ${position}`);
                broadcast_to_all_connected_clients(value_dto);
            }
        }
    });
    if (conveyor_subscriber !== null) {
        const overall_dto = conveyor_subscriber.overall_dto;
        for(const [type, attributes] of Object.entries(overall_dto)) {
            if (type === Conveyor.PLATE_TYPE) {
                for (const [id, value_dto] of Object.entries(attributes)) {
                    console.log(`Sending attributes for plate id ${id}`);
                    broadcast_to_all_connected_clients(value_dto);
                }
            }
            if (type === Conveyor.TYPE) {
                for (const [attribute_name, value] of Object.entries(attributes)) {
                    const value_dto = {
                        type: type,
                        attribute_name: attribute_name,
                        value: value
                    };
                    console.log(`Sending attribute ${attribute_name} for conveyor`);
                    broadcast_to_all_connected_clients(value_dto);
                }
            }
        }
    }
    if (kitchen_subscriber !== null) {
        const overall_dto = kitchen_subscriber.overall_dto;
        for(const [type, attributes] of Object.entries(overall_dto)) {
            if (type === Robot.REMOTE_TYPE) {
                for (const [position, robot_attributes] of Object.entries(attributes)) {
                    for (const [attribute_name, value] of Object.entries(robot_attributes)) {
                        const value_dto = {
                            type: type,
                            position: position,
                            attribute_name: attribute_name,
                            value: value
                        };
                        console.log(`Sending attribute ${attribute_name} for remote robot at position ${position}`);
                        broadcast_to_all_connected_clients(value_dto);
                    }
                }
            } else {
                for (const [attribute_name, value] of Object.entries(attributes)) {
                    const value_dto = {
                        type: type,
                        attribute_name: attribute_name,
                        value: value
                    };
                    console.log(`Sending attribute ${attribute_name} for kitchen`);
                    broadcast_to_all_connected_clients(value_dto);
                }
            }
        }
    }
}

function broadcast_to_all_connected_clients(_value_dto) {
    ws_server.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ value_dto: _value_dto }));
        }
    });
}

program.option("-rc, --robot-count <number>", "Number of robots to simulate");
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
remove_callbacks.set(Kitchen.TYPE, remove_kitchen_subscriber);
remove_callbacks.set(Controller.TYPE, remove_controller_subscriber);

let shutting_down = false;
let interval_id = null;
let controller_subscriber = null;
const robot_subscribers = new Map();
let conveyor_subscriber = null;
let kitchen = null;
let kitchen_subscriber = null;
let initial_assigned_orders = 0;
let initial_dropped_orders = 0;
let order_count = 0;
let backoff_placing_order_ms = PLACING_RATE_MS;

const ws_server = new WebSocket.Server({ port: WS_PORT });
// Cleanup on Ctrl+C
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down...');
    shutting_down = true;
    if (interval_id)
        clearInterval(interval_id);
    for (const robot_sub of robot_subscribers.values()) {
        robot_sub.disconnect().catch(err => console.error("Error during robot disconnect:", err));
    }
    if (conveyor_subscriber)
        await conveyor_subscriber.disconnect().catch(err => console.error("Error during conveyor disconnect:", err));
    if (kitchen_subscriber)
        await kitchen_subscriber.disconnect().catch(err => console.error("Error during kitchen disconnect:", err));
    if (kitchen?.session){
        await kitchen.session.close().catch(err => console.error("Error during kitchen session close:", err));
    }
    if (kitchen?.client) {
        await kitchen.client.disconnect().catch(err => console.error("Error during kitchen client disconnect:", err));
    }
    if (controller_subscriber)
        await controller_subscriber.disconnect().catch(err => console.error("Error during controller disconnect:", err));

    ws_server.clients.forEach(client => {
        try {
            client.close();
        } catch (e) {
            console.error('Error closing client:', e);
        }
    });

    ws_server.close(() => {
        console.log('WebSocket server closed.');
        process.exit(0);
    });
});


// Start WebSocket server
ws_server.on('connection', function connection(ws_connection) {
    console.log('✅ WebSocket client connected');
    send_overall_dto();
    ws_connection.on('close', function close() {
        console.log('❌ WebSocket client disconnected');
    });
    ws_connection.on('message', async function incoming(message) {
        const parsed_message = JSON.parse(message);
        console.log('received: %s', parsed_message);
        if (parsed_message.context === Kitchen.PLACE_RANDOM_ORDER) {
            place_random_order(parsed_message.order_count);
        }
        if (parsed_message.context === "broadcast_overall_dto") {
            send_overall_dto();
        }
    });
});
// Schedule browse instance
browse_servers();

