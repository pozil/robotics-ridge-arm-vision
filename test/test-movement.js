var assert = require('assert');
var movement = require('../src/movement.js');
var positions = require('./testhost-movement.json');

it ('should find a basic config file', function() {
	assert.equal(positions.home.setup.dof0, 100, "basic test config passing");
});

const mover = new movement("testhost");

it ('should set current position to home dof0 = 100', function() {
	assert.equal(mover.currentPosition["dof0"], 100);
});

it ('should be fine executing only the setup dof0 = 101', function() {
	mover.handleMove(mover.positions.onlySetup);
	assert.equal(mover.currentPosition["dof0", 101]);
});
