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

it ('should be fine executing only the move dof0 = 102', function() {
	mover.handleMove(mover.positions.onlyMove);
	assert.equal(mover.currentPosition["dof0", 102]);
});

it ('should be fine doing combo moves of setup and move dof0 = 104', function() {
	mover.handleMove(mover.positions.setupAndMove);
	assert.equal(mover.currentPosition["dof0",104]);
});

it ('should go through the whole sequence ending at exit dof0 = 108', function() {
	mover.handleMove(mover.positions.example);
	assert.equal(mover.currentPosition["dof0", 108]);
});

it ('should work with a single DOF dof0 = 109', function() {
	mover.handleMove(mover.positions.singleDof);
	assert.equal(mover.currentPosition["dof0", 109]);
});

it ('should work with a couple of DOFs which are single in their step', function() {
	mover.handleMove(mover.positions.doubleDof);
	assert.equal(mover.currentPosition["dof0", 110]);
	assert.equal(mover.currentPosition["dof1", 111]);
});
