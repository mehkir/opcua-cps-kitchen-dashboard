/* ROBOT */
const Robot = {
    // object type node
    TYPE : "RobotType",
    // method nodes
    RECEIVE_TASK : "ReceiveTask",
    HANDOVER_FINISHED_ORDER : "HandoverFinishedOrder",
    // information nodes
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
    // object type node
    TYPE : "ConveyorType",
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
    // method nodes
    REGISTER_ROBOT : "RegisterRobot",
    CHOOSE_NEXT_ROBOT : "ChooseNextRobot",
    PLACE_RANDOM_ORDER : "PlaceRandomOrder"
};

const gauge_objects = {};

function create_robot_info_element(pos) {
  const p = document.createElement('p');
  p.className = 'open-sans-myfont';
  p.id = `robot-${pos}`;

  p.innerHTML = `
    <span style="display: block; text-align: center;">Pos ${pos}</span><br>
    Recipe ID: <span id="${Robot.TYPE}-${Robot.RECIPE_ID}-${pos}">None</span> <br>
    Dish name: <span id="${Robot.TYPE}-${Robot.DISH_NAME}-${pos}">None</span> <br>
    Current tool: <span id="${Robot.TYPE}-${Robot.CURRENT_TOOL}-${pos}">None</span> <br>
    Action: <span id="${Robot.TYPE}-${Robot.ACTION_NAME}-${pos}">None</span> <br>
    Ingredients: <span id="${Robot.TYPE}-${Robot.INGREDIENTS}-${pos}">None</span>
  `;

  return p;
}

function update_info_element(data) {
    const set_if_exists = (type, id, pos, new_value) => {
        const el = document.getElementById(`${type}-${id}-${pos}`);
        if (!el) return;
        if (new_value !== undefined && new_value !== null && new_value !== '') {
            if (type === Robot.TYPE && id === Robot.OVERALL_TIME) {
                gauge_objects[pos].refresh(Number(new_value));
                return;
            }
            el.textContent = new_value.toString();
        }
    };
    set_if_exists(data.type, data.attribute_name, data.position, data.value);
}


function create_gauge(pos) {
    const div = document.createElement('div');
    div.id = `${Robot.TYPE}-${Robot.OVERALL_TIME}-${pos}`;
    return div;
}

function create_plate_info_element(pos, label) {
    const p = document.createElement('p');
    p.className = 'open-sans-myfont';
    p.id = `plate-${pos}`;

    p.innerHTML = `
        <span style="display: block; text-align: center;">${label}</span><br>
        ID: <span id="${Conveyor.TYPE}-${Conveyor.PLATE_ID}-${pos}">None</span> <br>
        Recipe ID: <span id="${Conveyor.TYPE}-${Conveyor.PLATE_RECIPE_ID}-${pos}">None</span> <br>
        Occupied: <span id="${Conveyor.TYPE}-${Conveyor.PLATE_OCCUPIED}-${pos}">None</span>
    `;

    return p;
}

function handle_received_data(value) {
    console.log("Handling received data:", value);
    update_info_element(value);
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
        // const value = Number(data.value[1]);
        // console.log("after parsing:", data.value[1]);
        handle_received_data(data.value_dto);
    };
});

document.getElementById('setup_environment').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const robot_count = Number(event.target.value);
        if (Number.isInteger(robot_count) && robot_count > 0) {
            console.log('Robot count submitted:', robot_count);
            // Clear previous robots, gauges and plates
            const robots = document.getElementById("robots");
            const gauges = document.getElementById("gauges");
            const plates = document.getElementById("plates");
            robots.innerHTML = `<h2 class="open-sans-myfont">Robots</h2>`;
            gauges.innerHTML = `<h2 class="open-sans-myfont">Robots Overall Time</h2>`;
            plates.innerHTML = `<h2 class="open-sans-myfont">Conveyor</h2>`;
            for (let position = 1; position <= robot_count; position++) {
                // Create and append robot info element
                const robot = create_robot_info_element(position);
                robots.appendChild(robot);
                // Create and append gauge info element
                const gauge = create_gauge(position);
                gauges.appendChild(gauge);
                gauge_objects[position] = new JustGage({
                    id: `${Robot.TYPE}-${Robot.OVERALL_TIME}-${position}`,
                    value: 0,
                    min: 0,
                    max: 100,
                    label: "units"
                });
                // Create and append plate info element
                const plate = create_plate_info_element(position, `Pos ${position}`);
                plates.appendChild(plate);
            }
            // Create and append plate info element
            const plate = create_plate_info_element(0, `OUTPUT`);
            plates.appendChild(plate);
        } else {
            alert('Please enter a positive integer.');
        }
        event.target.value = '';
    }
});

document.getElementById('random_order_button').onclick = call_random_order_method;
function call_random_order_method() {
    console.log("Placing random order");
    ws.send("PlaceRandomOrder");
}

document.getElementById('random_order_input').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const order_count = Number(event.target.value);
        if (Number.isInteger(order_count) && order_count > 0) {
            console.log('Order count submitted:', order_count);
            for (let i = 0; i < order_count; i++) {
                ws.send("PlaceRandomOrder");
            }
        } else {
            alert('Please enter a positive integer.');
        }
        event.target.value = '';
    }
});