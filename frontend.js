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

const gauges = {};

function create_robot_info_element(pos) {
  const p = document.createElement('p');
  p.className = 'open-sans-myfont';
  p.id = `robot-${pos}`;

  p.innerHTML = `
    <span style="display: block; text-align: center;">Pos ${pos}</span><br>
    Recipe ID: <span id="${Robot.RECIPE_ID}-${pos}">None</span> <br>
    Dish name: <span id="${Robot.DISH_NAME}-${pos}">None</span> <br>
    Current tool: <span id="${Robot.CURRENT_TOOL}-${pos}">None</span> <br>
    Action: <span id="${Robot.ACTION_NAME}-${pos}">None</span> <br>
    Ingredients: <span id="${Robot.INGREDIENTS}-${pos}">None</span>
  `;

  return p;
}

function update_robot_info_element(pos, data) {
    const set_if_exists = (id, new_value) => {
        const el = document.getElementById(`${id}-${pos}`);
        if (!el) return;
        if (new_value !== undefined && new_value !== null && new_value !== '') {
            el.textContent = new_value;
        }
    };

    set_if_exists(Robot.RECIPE_ID, data.recipe);
    set_if_exists(Robot.DISH_NAME, data.dish);
    set_if_exists(Robot.CURRENT_TOOL, data.tool);
    set_if_exists(Robot.ACTION_NAME, data.action);
    set_if_exists(Robot.INGREDIENTS, data.ingredients);
}


function create_gauge(pos) {
    const div = document.createElement('div');
    div.id = `gauge-${pos}`;
    return div;
}

function create_plate_info_element(pos, label) {
    const p = document.createElement('p');
    p.className = 'open-sans-myfont';
    p.id = `plate-${pos}`;

    p.innerHTML = `
        <span style="display: block; text-align: center;">${label}</span><br>
        ID: <span id="${Conveyor.PLATE_ID}-${pos}">None</span> <br>
        Recipe ID: <span id="${Conveyor.PLATE_RECIPE_ID}-${pos}">None</span> <br>
        Occupied: <span id="${Conveyor.PLATE_OCCUPIED}-${pos}">None</span>
    `;

    return p;
}

function update_plate_info_element(pos, data) {
    const set_if_exists = (id, new_value) => {
        const el = document.getElementById(`plate-${id}-${pos}`);
        if (!el) return;
        if (new_value !== undefined && new_value !== null && new_value !== '') {
            el.textContent = new_value;
        }
    };

    set_if_exists(Conveyor.PLATE_ID, data.id);
    set_if_exists(Conveyor.PLATE_RECIPE_ID, data.recipe);
    set_if_exists(Conveyor.PLATE_OCCUPIED, data.occupied);
}

function handle_received_data(pos, value) {
    // gauges[pos].refresh(value);
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
        // handle_received_data(1,value);
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
                gauges[position] = new JustGage({
                    id: `gauge-${position}`,
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