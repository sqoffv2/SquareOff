var p2 = require('p2');
var _ = require('lodash');
var config = require('./config');

function Sim(gameState) {

    this.gameState = gameState;

    this.scoreHandler = _.noop;

    // var self = this;
    // setInterval( function() { self.scoreHandler(); }, 500 );

    this.reset();

    this.initBlocks(gameState.grid);

    // simulation

    this.fixedTimeStep = 1/60;
    this.maxSubSteps = 10;
    this.lastTime = process.hrtime();

}

Sim.prototype.initBlocks = function SimInitBlocks(grid) {
    var y = grid.length;
    while (y--) {
        var row = grid[y];
        var x = row.length;
        while (x--) {
            if (row[x] > 0) {
                this.addBlock(x, y);
            }
        }
    }
};

Sim.prototype.update = function SimUpdate() {

    var deltaTime = process.hrtime(this.lastTime);

    this.lastTime = process.hrtime();

    this.world.step( this.fixedTimeStep, deltaTime[1]/1e9, this.maxSubSteps );

    this.gameState.disc.pos.x = this.discBody.interpolatedPosition[0];
    this.gameState.disc.pos.y = this.discBody.interpolatedPosition[1];
};

Sim.prototype.reset = function SimReset() {
    // set up p2-based physics simulation

    this.world = new p2.World();
    this.world.applyGravity = false;
    this.world.applySpringForces = false;
    this.world.applyDamping = false;

    // create materials with no friction and perfect bounce

    this.discMaterial = new p2.Material();
    this.bounceMaterial = new p2.Material();

    var bounceContactMaterial = new p2.ContactMaterial(this.bounceMaterial, this.discMaterial, {
        friction : 0,
        restitution: 1.0 + config.DISC.BOUNCE_SPEEDUP,
    });
    this.world.addContactMaterial(bounceContactMaterial);

    // Add a disc

    var discShape = new p2.Circle({ radius: config.DISC.DIAMETER/2 });
    discShape.material = this.discMaterial;
    this.discBody = new p2.Body({
        mass:1,
        position:[0, 0],
        angularVelocity: 0,
        fixedRotation: true,
        velocity: [Math.random()*20 - 10, Math.random()*20 - 10],
    });
    this.discBody.addShape(discShape);
    this.world.addBody(this.discBody);

    // add some walls

    var topWall    = this.makeWall( [0, config.GRID.HEIGHT/2 + config.GRID.WALL_DEPTH/2],  [config.GRID.WIDTH*2, config.GRID.WALL_DEPTH] );
    var bottomWall = this.makeWall( [0, -config.GRID.HEIGHT/2 - config.GRID.WALL_DEPTH/2], [config.GRID.WIDTH*2, config.GRID.WALL_DEPTH] );
    var rightWall  = this.makeWall( [config.GRID.WIDTH/2 + config.GRID.WALL_DEPTH/2, 0],   [config.GRID.WALL_DEPTH, config.GRID.HEIGHT*2] );
    var leftWall   = this.makeWall( [-config.GRID.WIDTH/2 - config.GRID.WALL_DEPTH/2, 0],  [config.GRID.WALL_DEPTH, config.GRID.HEIGHT*2] );

    this.world.addBody( topWall    );
    this.world.addBody( bottomWall );
    this.world.addBody( rightWall  );
    this.world.addBody( leftWall   );

    this.world.enableBodyCollision();
};

Sim.prototype.addBlock = function SimAddBlock(x, y) {

    // add block to sim

    var blockShape = new p2.Box({ width: 1, height: 1 });
    blockShape.material = this.bounceMaterial;

    var px = -1 * config.GRID.WIDTH/2 + 1/2 + x;
    var py = -1 * config.GRID.HEIGHT/2 + 1/2 + y;

    var blockBody = new p2.Body({ position: [px, py] });
    blockBody.addShape(blockShape);

    this.world.addBody(blockBody);

    // update gameState grid as well

    this.gameState.grid[y][x] += 1;

    return blockBody;
};

Sim.prototype.onScore = function SimOnScore(callback) {
    this.scoreHandler = callback;
};

Sim.prototype.makeWall = function SimMakeWall(position, size) {

    var wallShape = new p2.Box({ width: size[0], height: size[1] });
    wallShape.material = this.bounceMaterial;

    var wallBody = new p2.Body({ position: position });
    wallBody.addShape(wallShape);

    return wallBody;
};

module.exports = Sim;
