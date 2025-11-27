/* ROBOT */
const Robot = {
    // object type nodes
    TYPE : "RobotType",
    REMOTE_TYPE : "RemoteRobotType",
    // method nodes
    RECEIVE_TASK : "ReceiveTask",
    HANDOVER_FINISHED_ORDER : "HandoverFinishedOrder",
    SWITCH_POSITION : "SwitchPosition",
    // attribute nodes
    POSITION : "Position",
    RECIPE_ID : "RecipeId",
    DISH_NAME : "DishName",
    ACTION_NAME : "ActionName",
    INGREDIENTS : "Ingredients",
    OVERALL_TIME : "OverallTime",
    CURRENT_TOOL : "CurrentTool",
    LAST_EQUIPPED_TOOL : "LastEquippedTool",
    CAPABILITIES : "Capabilities",
    PROCESSED_STEPS : "ProcessedSteps",
    PROCESSABLE_STEPS : "ProcessableSteps",
    OVERALL_PROCESSED_STEPS : "OverallProcessedSteps",
    OVERALL_PROCESSING_STEPS : "OverallProcessingSteps",
    AVAILABILITY : "Availability"
};

/* CONVEYOR */
const Conveyor = {
    // object type nodes
    TYPE : "ConveyorType",
    REMOTE_TYPE : "RemoteConveyorType",
    PLATE_TYPE : "PlateType",
    // plate information nodes
    PLATE_ID : "Id",
    PLATE_POSITION : "Position",
    PLATE_RECIPE_ID : "RecipeId",
    PLATE_OCCUPIED : "Occupied",
    // method nodes
    FINISHED_ORDER_NOTIFICATION : "FinishedOrderNotification",
    // attribute nodes
    TOTAL_PLATES : "TotalPlates",
    OCCUPIED_PLATES : "OccupiedPlates"
};

/* CONTROLLER */
const Controller = {
    // object type node
    TYPE : "ControllerType",
    REMOTE_TYPE : "RemoteControllerType",
    // method nodes
    REGISTER_ROBOT : "RegisterRobot",
    CHOOSE_NEXT_ROBOT : "ChooseNextRobot",
    // attribute nodes
    REGISTERED_ROBOTS : "RegisteredRobots"
};

/* KITCHEN */
const Kitchen = {
    // object type node
    TYPE : "KitchenType",
    // method nodes
    PLACE_RANDOM_ORDER : "PlaceRandomOrder",
    RECEIVE_COMPLETED_ORDER : "ReceiveCompletedOrder",
    // attribute nodes
    CONNECTIVITY : "Connectivity",
    RECEIVED_ORDERS : "ReceivedOrders",
    ASSIGNED_ORDERS : "AssignedOrders",
    DROPPED_ORDERS : "DroppedOrders",
    COMPLETED_ORDERS : "CompletedOrders"
};

const gauge_objects = {};

function create_grid_container() {
  const grid = document.createElement('div');
  grid.className = 'grid-container page-content';
  return grid;
}

function create_robot_info_element(pos) {
  const div = document.createElement('div');
  div.className = 'open-sans-myfont';
  div.id = `robot-${pos}`;

  div.innerHTML = `
    <u>Position ${pos}</u><br>
    Connectivity: <span id="${Robot.TYPE}-${Kitchen.CONNECTIVITY}-${pos}" style="color: red;">Offline</span><br>
    Capabilities: <span id="${Robot.TYPE}-${Robot.CAPABILITIES}-${pos}">None</span><br>
    Recipe ID: <span id="${Robot.TYPE}-${Robot.RECIPE_ID}-${pos}">None</span><br>
    Dish name: <span id="${Robot.TYPE}-${Robot.DISH_NAME}-${pos}">None</span><br>
    Current tool: <span id="${Robot.TYPE}-${Robot.CURRENT_TOOL}-${pos}">None</span><br>
    Action: <span id="${Robot.TYPE}-${Robot.ACTION_NAME}-${pos}">None</span><br>
    Ingredients: <span id="${Robot.TYPE}-${Robot.INGREDIENTS}-${pos}">None</span><br>
    Local progress: <span id="${Robot.TYPE}-${Robot.PROCESSED_STEPS}-${pos}">0</span>/<span id="${Robot.TYPE}-${Robot.PROCESSABLE_STEPS}-${pos}">0</span><br>
    Overall progress: <span id="${Robot.TYPE}-${Robot.OVERALL_PROCESSED_STEPS}-${pos}">0</span>/<span id="${Robot.TYPE}-${Robot.OVERALL_PROCESSING_STEPS}-${pos}">0</span>
  `;

  return div;
}

function update_robot_info_element(data) {
    const set_if_exists = (type, attribute_name, pos, new_value) => {
        const el = document.getElementById(`${type}-${attribute_name}-${pos}`);
        if (el && new_value !== undefined && new_value !== null && new_value !== '') {
            if (attribute_name === Robot.OVERALL_TIME) {
                gauge_objects[pos].refresh(Number(new_value));
                return;
            }
            el.textContent = new_value.toString();
        }
    };
    set_if_exists(data.type, data.attribute_name, data.position, data.value);
}

// Keep latest conveyor state to handle out-of-order updates
const conveyor_state = { total_plates: 0, occupied_plates: 0 };
function update_conveyor_info_element(data) {
    const set_plate_if_exists = (type, attribute_name, position, value) => {
        const el = document.getElementById(`${type}-${attribute_name}-${position}`);
        if (el && value !== undefined && value !== null && value !== '') {
            el.textContent = value.toString();
        }
    };

    const set_if_exists = (type, attribute_name, new_value) => {
        let el = null;
        if (attribute_name === Conveyor.OCCUPIED_PLATES) {
            el = document.getElementById(`${type}-FreeOccupied`);
        } else {
            el = document.getElementById(`${type}-${attribute_name}`);
        }
        if (el && new_value !== undefined && new_value !== null && new_value !== '') {
            if (attribute_name === Conveyor.TOTAL_PLATES) {
                conveyor_state.total_plates = new_value;
                el.textContent = conveyor_state.total_plates.toString();
            } else if (attribute_name === Conveyor.OCCUPIED_PLATES) {
                conveyor_state.occupied_plates = new_value;
            }
            if (attribute_name === Conveyor.OCCUPIED_PLATES || attribute_name === Conveyor.TOTAL_PLATES) {
                el = document.getElementById(`${type}-FreeOccupied`);
                if (!el)
                    return;
                const free = conveyor_state.total_plates > 0 ? conveyor_state.total_plates - conveyor_state.occupied_plates : 0;
                el.textContent = `${free}/${conveyor_state.occupied_plates}`;
            } else {
                el.textContent = new_value.toString();
            }
        }
    }
    if (data.type === Conveyor.PLATE_TYPE) {
        set_plate_if_exists(data.type, Conveyor.PLATE_ID, data[Conveyor.PLATE_POSITION], data[Conveyor.PLATE_ID]);
        set_plate_if_exists(data.type, Conveyor.PLATE_RECIPE_ID, data[Conveyor.PLATE_POSITION], data[Conveyor.PLATE_RECIPE_ID]);
        set_plate_if_exists(data.type, Conveyor.PLATE_OCCUPIED, data[Conveyor.PLATE_POSITION], data[Conveyor.PLATE_OCCUPIED]);
    }
    if (data.type === Conveyor.TYPE) {
        set_if_exists(data.type, data.attribute_name, data.value);
    }
}

function update_controller_info_element(data) {
    const set_if_exists = (type, attribute_name, new_value) => {
        const el = document.getElementById(`${type}-${attribute_name}`);
        if (el && new_value !== undefined && new_value !== null && new_value !== '') {
            el.textContent = new_value.toString();
        }
    };
    set_if_exists(data.type, data.attribute_name, data.value);
}

function update_kitchen_info_element(data) {
    const set_remote_robot_attribute_if_exists = (type, attribute_name, pos, new_value) => {
        const el = document.getElementById(`${type}-${attribute_name}-${pos}`);
        if (el && new_value !== undefined && new_value !== null && new_value !== '') {
            if (attribute_name === Kitchen.CONNECTIVITY) {
                el.style.color = (new_value === true) ? "green" : "red";
                el.textContent = new_value === true ? "Online" : "Offline";
            } else {
                el.textContent = new_value.toString();
            }
        }
    };
    const set_remote_attributes_if_exists = (type, attribute_name, new_value) => {
        const el = document.getElementById(`${type}-${attribute_name}`);
        if (el && new_value !== undefined && new_value !== null && new_value !== '') {
            if (attribute_name === Kitchen.CONNECTIVITY) {
                el.style.color = (new_value === true) ? "green" : "red";
                el.textContent = new_value === true ? "Online" : "Offline";
            } else {
                el.textContent = new_value.toString();
            }
        }
    };
    switch (data.type) {
        case Controller.REMOTE_TYPE:
            set_remote_attributes_if_exists(data.type, data.attribute_name, data.value);
            break;
        case Conveyor.REMOTE_TYPE:
            set_remote_attributes_if_exists(data.type, data.attribute_name, data.value);
            break;
        case Robot.REMOTE_TYPE:
            set_remote_robot_attribute_if_exists(Robot.TYPE, data.attribute_name, data.position, data.value);
            break;
        case Kitchen.TYPE:
            set_remote_attributes_if_exists(data.type, data.attribute_name, data.value);
            break;
        default:
            break;
    }
}

function create_gauge(pos) {
    const div = document.createElement('div');
    div.id = `${Robot.TYPE}-${Robot.OVERALL_TIME}-${pos}`;
    return div;
}

function create_plate_info_element(pos, label) {
    const div = document.createElement('div');
    div.className = 'open-sans-myfont';
    div.id = `plate-${pos}`;

    div.innerHTML = `
        <u>${label}</u><br>
        ID: <span id="${Conveyor.PLATE_TYPE}-${Conveyor.PLATE_ID}-${pos}">None</span><br>
        Recipe ID: <span id="${Conveyor.PLATE_TYPE}-${Conveyor.PLATE_RECIPE_ID}-${pos}">None</span><br>
        Occupied: <span id="${Conveyor.PLATE_TYPE}-${Conveyor.PLATE_OCCUPIED}-${pos}">None</span>
    `;
    return div;
}

function handle_received_data(value) {
    console.log("Handling received data:", value);
    switch (value.type) {
        case Robot.TYPE:
            update_robot_info_element(value);
            break;
        case Conveyor.TYPE:
            update_conveyor_info_element(value);
            break;
        case Conveyor.PLATE_TYPE:
            update_conveyor_info_element(value);
            break;
        case Controller.TYPE:
            update_controller_info_element(value);
            break;
        case Kitchen.TYPE:
            update_kitchen_info_element(value);
            break;
        case Controller.REMOTE_TYPE:
            update_kitchen_info_element(value);
            break;
        case Conveyor.REMOTE_TYPE:
            update_kitchen_info_element(value);
            break;
        case Robot.REMOTE_TYPE:
            update_kitchen_info_element(value);
            break;
        default:
            break;
    }
}

let ws;
document.addEventListener('DOMContentLoaded', function () {
    const setup_dashboard = document.getElementById('setup_dashboard');
    const random_order_input = document.getElementById('random_order_input');
    // Create the connection only when needed
    function initWebSocket() {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            const dto = {
                context: "broadcast_overall_dto"
            };
            ws.send(JSON.stringify(dto));
            return; // avoid duplicate connections
        }
        ws = new WebSocket("ws://localhost:8080");
        ws.onopen = () => {
            console.log("✅ WebSocket connected");
        };
        ws.onmessage = (event) => {
            console.log("📨 Received from server:", event.data);
            const data = JSON.parse(event.data);
            console.log("📨 Parsed data:", data);
            handle_received_data(data.value_dto);
        };
        ws.onclose = () => console.log("❌ WebSocket closed");
        ws.onerror = (err) => console.error("WebSocket error:", err);
    }

    if (setup_dashboard) {
        setup_dashboard.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                const robot_count = Number(event.target.value);
                if (Number.isInteger(robot_count) && robot_count > 0) {
                    console.log('Setup dashboard with robot count:', robot_count);
                    // Clear previous positions
                    const positions = document.getElementById("positions");
                    positions.innerHTML = `<div class="grid-container page-content" id="positions_labels"></div>`;
                    const positions_labels = document.getElementById("positions_labels");
                    positions_labels.innerHTML = `<div><h2 class="open-sans-myfont">Robot Operation</h2></div>
                                                <div style="text-align: center;"><h2 class="open-sans-myfont">Robot Time Utilization</h2></div>
                                                <div><h2 class="open-sans-myfont">Conveyor Load</h2></div>`;
                    for (let position = 1; position <= robot_count; position++) {
                        // Create and append robot info element
                        const robot_conveyor_grid = create_grid_container();
                        const robot = create_robot_info_element(position);
                        robot_conveyor_grid.appendChild(robot);
                        // Create and append gauge info element
                        const gauge = create_gauge(position);
                        gauge.style.width = "15em";
                        // gauge.style.height = "10em";
                        robot_conveyor_grid.appendChild(gauge);
                        positions.appendChild(robot_conveyor_grid);
                        gauge_objects[position] = new JustGage({
                            id: `${Robot.TYPE}-${Robot.OVERALL_TIME}-${position}`,
                            value: 0,
                            min: 0,
                            max: 60000,
                            label: "ms"
                        });
                        // Create and append plate info element
                        const plate = create_plate_info_element(position, `Position ${position}`);
                        robot_conveyor_grid.appendChild(plate);
                    }
                    // Create and append output plate info element
                    const robot_conveyor_grid = create_grid_container();
                    robot_conveyor_grid.innerHTML =`<div></div><div></div>`;
                    const plate = create_plate_info_element(0, `OUTPUT`);
                    robot_conveyor_grid.appendChild(plate);
                    positions.appendChild(robot_conveyor_grid);
                    initWebSocket();
                } else {
                    alert('Please enter a positive integer.');
                }
                /* Clear input field */
                event.target.value = '';
            }
        });
    }

    if (random_order_input) {
        random_order_input.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                const order_count = Number(event.target.value);
                if (Number.isInteger(order_count) && order_count > 0) {
                    console.log('Order count submitted:', order_count);
                    const dto = {
                        context: Kitchen.PLACE_RANDOM_ORDER,
                        order_count: order_count
                    };
                    console.log("Placing random order with count:", order_count);
                    if (!ws || ws.readyState !== WebSocket.OPEN) {
                        console.warn("WebSocket not open; setup dashboard first");
                        alert("Setup dashboard first");
                    } else {
                        ws.send(JSON.stringify(dto));
                    }
                } else {
                    alert('Please enter a positive integer.');
                }
                event.target.value = '';
            }
        });
    }
});

window.onbeforeunload = function() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ context: "frontend_closed" }));
    }
};