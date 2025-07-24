const gauges = {};

function createRobotInfoElement(pos) {
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

function updateRobotInfoElement(pos, data) {
    const setIfExists = (id, newValue) => {
        const el = document.getElementById(`${id}-${pos}`);
        if (!el) return;
        if (newValue !== undefined && newValue !== null && newValue !== '') {
            el.textContent = newValue;
        }
        // else: keep the current textContent as-is
    };

    setIfExists('recipe', data.recipe);
    setIfExists('dish', data.dish);
    setIfExists('tool', data.tool);
    setIfExists('action', data.action);
    setIfExists('ingredients', data.ingredients);
}


function createGauge(pos) {
    const div = document.createElement('div');
    div.id = `gauge-${pos}`;
    return div;
}

function createPlateInfoElement(pos) {
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

function updatePlateInfoElement(pos, data) {
    const setIfExists = (id, newValue) => {
        const el = document.getElementById(`plate-${id}-${pos}`);
        if (!el) return;
        if (newValue !== undefined && newValue !== null && newValue !== '') {
            el.textContent = newValue;
        }
        // else: keep the current textContent as-is
    };

    setIfExists('id', data.id);
    setIfExists('recipe', data.recipe);
    setIfExists('occupied', data.occupied);
}

function handleReceivedData(pos, value) {
    const robotId = `robot-${pos}`;
    if (!document.getElementById(robotId)) {
        const newRobot = createRobotInfoElement(pos);
        const container = document.getElementById("robots")
        container.appendChild(newRobot);
    }
    const gaugeId = `gauge-${pos}`;
    if (!document.getElementById(gaugeId)) {
        const newGauge = createGauge(pos);
        const container = document.getElementById("gauges")
        container.appendChild(newGauge);

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
    const plateId = `plate-${pos}`;
    if (!document.getElementById(plateId)) {
        const newPlate = createPlateInfoElement(pos);
        const container = document.getElementById("plates")
        container.appendChild(newPlate);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
        console.log("✅ WebSocket connected");
    };

    ws.onmessage = (event) => {
        console.log("📨 Received from server:", event.data); // <--- Add this!
        const data = JSON.parse(event.data);
        const value = Number(data.value[1]);
        console.log("after parsing:", data.value[1]);
        handleReceivedData(1,value);
    };
});