/* ROBOT */
const Robot = {
    // object type nodes
    TYPE : "RobotType",
    REMOTE_TYPE : "RemoteRobotType",
    // method nodes
    RECEIVE_TASK : "ReceiveTask",
    HANDOVER_FINISHED_ORDER : "HandoverFinishedOrder",
    // attribute nodes
    POSITION : "Position",
    RECIPE_ID : "RecipeId",
    DISH_NAME : "DishName",
    ACTION_NAME : "ActionName",
    INGREDIENTS : "Ingredients",
    OVERALL_TIME : "OverallTime",
    CURRENT_TOOL : "CurrentTool",
    LAST_EQUIPPED_TOOL : "LastEquippedTool",
    CAPABILITIES : "Capabilities"
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
    FINISHED_ORDER_NOTIFICATION : "FinishedOrderNotification"
};

/* CONTROLLER */
const Controller = {
    // object type node
    TYPE : "ControllerType",
    REMOTE_TYPE : "RemoteControllerType",
    // method nodes
    REGISTER_ROBOT : "RegisterRobot",
    CHOOSE_NEXT_ROBOT : "ChooseNextRobot"
};

/* KITCHEN */
const Kitchen = {
    // object type node
    TYPE : "KitchenType",
    // method nodes
    PLACE_RANDOM_ORDER : "PlaceRandomOrder",
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
    Ingredients: <span id="${Robot.TYPE}-${Robot.INGREDIENTS}-${pos}">None</span>
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

function update_conveyor_info_element(data) {
    const set_if_exists = (type, attribute_name, position, value) => {
        const el = document.getElementById(`${type}-${attribute_name}-${position}`);
        if (el && value !== undefined && value !== null && value !== '') {
            el.textContent = value.toString();
        }
    };
    set_if_exists(data.type, Conveyor.PLATE_ID, data[Conveyor.PLATE_POSITION], data[Conveyor.PLATE_ID]);
    set_if_exists(data.type, Conveyor.PLATE_RECIPE_ID, data[Conveyor.PLATE_POSITION], data[Conveyor.PLATE_RECIPE_ID]);
    set_if_exists(data.type, Conveyor.PLATE_OCCUPIED, data[Conveyor.PLATE_POSITION], data[Conveyor.PLATE_OCCUPIED]);
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
            } else if (attribute_name === Kitchen.ASSIGNED_ORDERS || attribute_name === Kitchen.DROPPED_ORDERS) {
                /* Special handling for AssignedOrders-DroppedOrders */
                const el = document.getElementById(`${type}-AssignedOrders-DroppedOrders`);
                const current_text = el.textContent;
                const parts = current_text.split('/');
                let assigned = parts[0] ? parts[0].trim() : '0';
                let dropped = parts[1] ? parts[1].trim() : '0';
                if (attribute_name === Kitchen.ASSIGNED_ORDERS) {
                    assigned = new_value.toString();
                } else {
                    dropped = new_value.toString();
                }
                el.textContent = `${assigned}/${dropped}`;
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
        ID: <span id="${Conveyor.TYPE}-${Conveyor.PLATE_ID}-${pos}">None</span><br>
        Recipe ID: <span id="${Conveyor.TYPE}-${Conveyor.PLATE_RECIPE_ID}-${pos}">None</span><br>
        Occupied: <span id="${Conveyor.TYPE}-${Conveyor.PLATE_OCCUPIED}-${pos}">None</span>
    `;

    return div;
}

function handle_received_data(value) {
    console.log("Handling received data:", value);
    if  (value.type === Robot.TYPE) {
        update_robot_info_element(value);
    }
    if (value.type === Conveyor.TYPE) {
        update_conveyor_info_element(value);
    }
    if (value.type === Kitchen.TYPE) {
        update_kitchen_info_element(value);
    }
    if (value.type === Controller.REMOTE_TYPE) {
        update_kitchen_info_element(value);
    }
    if (value.type === Conveyor.REMOTE_TYPE) {
        update_kitchen_info_element(value);
    }
    if (value.type === Robot.REMOTE_TYPE) {
        update_kitchen_info_element(value);
    }
}

const ws = new WebSocket("ws://localhost:8080");
document.addEventListener('DOMContentLoaded', function () {
    ws.onopen = () => {
        console.log("✅ WebSocket connected");
    };

    ws.onmessage = (event) => {
        console.log("📨 Received from server:", event.data);
        const data = JSON.parse(event.data);
        console.log("📨 Parsed data:", data);
        handle_received_data(data.value_dto);
    };
});

window.onbeforeunload = function() {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ context: "frontend_closed" }));
    }
};

document.getElementById('setup_environment').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const robot_count = Number(event.target.value);
        if (Number.isInteger(robot_count) && robot_count > 0) {
            console.log('Robot count submitted:', robot_count);
            // Clear previous positions
            const positions = document.getElementById("positions");
            positions.innerHTML = `<div class="grid-container page-content" id="positions_labels"></div>`;
            const positions_labels = document.getElementById("positions_labels");
            positions_labels.innerHTML = `<div><h2 class="open-sans-myfont">Robot Operation</h2></div>
                                          <div></div>
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
                    max: 100,
                    label: "Time Utilization"
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
        } else {
            alert('Please enter a positive integer.');
        }
        event.target.value = '';
    }
});

// document.getElementById('random_order_button').onclick = call_random_order_method;
// function call_random_order_method() {
//     dto = {
//         context: Controller.PLACE_RANDOM_ORDER,
//         order_count: 1
//     }
//     console.log("Placing random order");
//     ws.send(JSON.stringify(dto));
// }

document.getElementById('random_order_input').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const order_count = Number(event.target.value);
        if (Number.isInteger(order_count) && order_count > 0) {
            console.log('Order count submitted:', order_count);
            dto = {
                context: Kitchen.PLACE_RANDOM_ORDER,
                order_count: order_count
            };
            console.log("Placing random order with count:", order_count);
            ws.send(JSON.stringify(dto));
        } else {
            alert('Please enter a positive integer.');
        }
        event.target.value = '';
    }
});