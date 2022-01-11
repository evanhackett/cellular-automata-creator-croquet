const canvas = document.getElementById('canvas');

const Q = Croquet.Constants;
Q.INTERVAL = 400;
Q.CA_RESOLUTION = 120;

const INITIAL_RULES_CODE =
`const neighbors_alive = cell.neighbors.filter(neighbor => neighbor.value).length

const alive = cell.value

return (!alive && neighbors_alive === 3) || (alive && (neighbors_alive === 2 || neighbors_alive === 3))
`;

class MyModel extends Croquet.Model {

    init() {
        this.grid = Array(Q.CA_RESOLUTION).fill(0).map(_ => Array(Q.CA_RESOLUTION).fill(0).map(_ => Math.random() >= 0.5)); // make a 2d array of random booleans
        this.rules_code = INITIAL_RULES_CODE;
        this.future(1000).tick();
        this.subscribe("rules_text", "change", this.handleRulesChange);
        this.subscribe("simulation", "restart", this.handleRestart);
    }

    tick() {
        try {
            const rulesFunction = new Function("cell", this.rules_code);
            this.grid = step(rulesFunction, this.grid);
        } catch (error) {
            console.log(error);
        }
        this.publish("simulation", "step");
        this.future(Q.INTERVAL).tick();
    }

    handleRulesChange(new_rules_code) {
        this.rules_code = new_rules_code;
        this.publish("rules_text", "update");
    }

    handleRestart() {
        this.grid = Array(Q.CA_RESOLUTION).fill(0).map(_ => Array(Q.CA_RESOLUTION).fill(0).map(_ => Math.random() >= 0.5)); // make a 2d array of random booleans
    }
}

MyModel.register("MyModel");


class MyView extends Croquet.View {

    constructor(model) {
        super(model);
        this.model = model;

        this.text_area = document.getElementById('textarea');
        this.text_area.value = this.model.rules_code;
        this.text_area.addEventListener('input', event => {
            this.publish("rules_text", "change", event.target.value);
        }, false);

        const button = document.getElementById('restart-button');
        button.onclick = evt => {
            this.publish("simulation", "restart");
        };

        this.subscribe("simulation", "step", this.handleStep);
        this.subscribe("rules_text", "update", this.handleRulesTextUpdate);
    }

    handleStep() {
        drawGrid(canvas, this.model.grid, alive => alive ? {r: 255, g: 255, b: 255} : {r: 0, g: 0, b: 0});
    }

    handleRulesTextUpdate() {
        this.text_area.value = this.model.rules_code;
    }
}


// canvas is the dom node of the canvas to draw to
// grid is the 2d array of data to draw
// colorFn defines how to color a cell based on the cell's data
function drawGrid(canvas, grid, colorFn) {
    const ctx = canvas.getContext('2d');

    function colorCell(x, y, color) {
        // calculate dimensions of a cell based on the grid resolution and the canvas resolution. Assumes square canvas and grid.
        const cellSize = canvas.width / grid.length;
        ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
        ctx.fillRect(x*cellSize, y*cellSize, cellSize, cellSize);
    }
    
    grid.forEach((row, i) => {
        row.forEach((cell, j) => {
            colorCell(i, j, colorFn(cell));
        });
    });
}

// returns a new grid where each cell's value is the result of calling nextStateFn on every cell in the passed in grid
function step(nextStateFn, grid) { 
    // map over each cell, passing the position, cell value, and neighbors of the cell to nextStateFn. nextStateFn needs to return a cell value.
    return grid.map((cells, i) =>
	    cells.map((cell, j) =>
            nextStateFn({
                position: {x: i, y: j},
                value: cell,
		        neighbors: getNeighbors(grid, i, j)
            })
	    )
    );
}

function getNeighbors(grid, x,y) {
  // each cell has 8 neighbors. The array here is laid out visually, with the cell in the middle surrounded by its neighbors.
    return [    
        CN(grid, x-1, y-1), CN(grid, x, y-1), CN(grid, x+1, y-1),
        CN(grid, x-1, y),   /*Current Cell*/  CN(grid, x+1, y),
        CN(grid, x-1, y+1), CN(grid, x, y+1), CN(grid, x+1, y+1),
    ];
}

// CN stands for "create neighbor". This function returns an object with x,y coords and the boolean value of the given neighbor
function CN(grid, x, y) {
  // we have to wrap around when neighbors are beyond the edge. GNC (get neighbor's coord) returns the neighbors coord, wrapping if necessary.
    const GNC = n => n < 0 ? grid.length-1 : n >= grid.length-1 ? 0 : n;
    return { x: GNC(x), y: GNC(y), value: grid[GNC(x)][GNC(y)] };
}



const apiKey = "1q65cN8gpFatodMM4m4Bu1ghdMIipxg0ssDkyrC8q"; // paste from croquet.io/keys
const appId = "com.evanhackett.cellular-automata";
const name = Croquet.App.autoSession();
const password = Croquet.App.autoPassword();
Croquet.Session.join({apiKey, appId, name, password, model: MyModel, view: MyView});
