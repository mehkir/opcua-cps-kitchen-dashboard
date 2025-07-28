const gauges = {};

function create_robot_info_element(pos) {
  const p = document.createElement('p');
  p.className = 'open-sans-myfont';
  p.id = `robot-${pos}`;

  p.innerHTML = `
    <span style="display: block; text-align: center;">Pos ${pos}</span><br>
    Recipe ID: <span id="recipe-${pos}">None</span> <br>
    Dish name: <span id="dish-${pos}">None</span> <br>
    Current tool: <span id="tool-${pos}">None</span> <br>
    Action: <span id="action-${pos}">None</span> <br>
    Ingredients: <span id="ingredients-${pos}">None</span>
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

    set_if_exists('recipe', data.recipe);
    set_if_exists('dish', data.dish);
    set_if_exists('tool', data.tool);
    set_if_exists('action', data.action);
    set_if_exists('ingredients', data.ingredients);
}


function createGauge(pos) {
    const div = document.createElement('div');
    div.id = `gauge-${pos}`;
    return div;
}

function create_plate_info_element(pos) {
    const p = document.createElement('p');
    p.className = 'open-sans-myfont';
    p.id = `plate-${pos}`;

    p.innerHTML = `
        <span style="display: block; text-align: center;">Pos ${pos}</span><br>
        ID: <span id="plate-id-${pos}">None</span> <br>
        Recipe ID: <span id="plate-recipe-${pos}">None</span> <br>
        Occupied: <span id="plate-occupied-${pos}">None</span>
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

    set_if_exists('id', data.id);
    set_if_exists('recipe', data.recipe);
    set_if_exists('occupied', data.occupied);
}

function handle_received_data(pos, value) {
    const robot_id = `robot-${pos}`;
    if (!document.getElementById(robot_id)) {
        const new_robot = create_robot_info_element(pos);
        const container = document.getElementById("robots")
        container.appendChild(new_robot);
    }
    const gauge_id = `gauge-${pos}`;
    if (!document.getElementById(gauge_id)) {
        const new_gauge = createGauge(pos);
        const container = document.getElementById("gauges")
        container.appendChild(new_gauge);

        gauges[pos] = new JustGage({
            id: `gauge-${pos}`,
            value: 0,
            min: 0,
            max: 100,
            label: "units"
        });
    } else {
        gauges[pos].refresh(value);
    }
    const plate_id = `plate-${pos}`;
    if (!document.getElementById(plate_id)) {
        const new_plate = create_plate_info_element(pos);
        const container = document.getElementById("plates")
        container.appendChild(new_plate);
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
        // const value = Number(data.value[1]);
        // console.log("after parsing:", data.value[1]);
        // handle_received_data(1,value);
    };
});

document.getElementById('random_order_button').onclick = call_random_order_method;
function call_random_order_method() {
    console.log("Placing random order");
    ws.send("PlaceRandomOrder");
}

document.getElementById('random_order_input').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const value = Number(event.target.value);
        if (Number.isInteger(value) && value > 0) {
            console.log('Input submitted:', value);
            for (let i = 0; i < value; i++) {
                ws.send("PlaceRandomOrder");
            }
        } else {
            alert('Please enter a positive integer.');
        }
        event.target.value = '';
    }
});