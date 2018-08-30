const PwmDriver = require('adafruit-i2c-pwm-driver'),
	sleep = require('sleep'),
	readline = require('readline'),
	movement = require('./movement');

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

//determines which config file it uses.
const mover = new movement('arm-2');

function getPosition(code) {
	if (false) {
		//do nothing
	} else if (code === 'p') { //nuetral
		return mover.goHome();
	} else if (code === 'o') { //center low
		return mover.goPickupCenter();
	} else if (code === 'l') { //center high
		return mover.goPicture();
	} else if (code === 'z') { //center top low
		return mover.goPickupOne();
	} else if (code === 'x') { //center left low
		return mover.goPickupTwo();
	} else if (code === 'v') { //center right low
		return mover.goPickupThree();
	} else if (code === 'b') { //center bottom low
		return mover.goPickupFour();
	} else if (code === 'n') { //salute forward up
		return mover.goSalute();
	} else if (code === 'k') { //sleep
		return mover.goSleep();
        } else if (code === 'u') { //linear robot drop off
		return mover.goDropOff();
	} else { //default center high
	}
	return false;
}

function updateDof(targetDof, current, change) {
	var ret = 0;

	if (!current) {
		current = mover.currentPosition[targetDof];
	}
	ret = current + change;
	return ret;
}

var mydof = {};
var currDof = "";
var isDirty = true;

//driver.setPWM(flags.dof,0,flags.pwm);
process.stdin.on('keypress', (str, key) => {
  //reset the mydof if we're just picking one
	if (key.ctrl) {
		mydof = {};
	}

  //figure out which keys were pressed
  if (key.ctrl && key.name === 'c') {
    process.exit();
  } else if (key.ctrl && key.name === 'q') {
    currDof = 'dof0';
    console.log('updated ', currDof);
  } else if (key.ctrl && key.name === 'w') {
    currDof = 'dof1';
    console.log('updated ', currDof);
  } else if (key.ctrl && key.name === 'e') {
    currDof = 'dof2';
    console.log('updated ', currDof);
  } else if (key.ctrl && key.name === 'r') {
    currDof = 'dof3';
    console.log('updated ', currDof);
  } else if (key.ctrl && key.name === 't') {
    currDof = 'dof4';
    console.log('updated ', currDof);
  } else if (key.ctrl && key.name === 'y') {
    currDof = 'dof5';
    console.log('updated ', currDof);
  } else if (key.ctrl && (
	key.name === 'z' || key.name === 'x' || key.name === 'v' || 
	key.name === 'b' || key.name === 'o' || key.name === 'l' || 
	key.name === 'p' || key.name === 'n' || key.name === 'k' ||
	key.name === 'u' )) {
    	Promise.all(getPosition(key.name)).catch(function(error){if (error) { console.log(error); }});
			mydof = mover.currentPosition;
  } else if (key.name === 'a') {
        mydof[currDof] = updateDof(currDof, mydof[currDof],-10);	
				isDirty = true;
  } else if (key.name === 's') {
				mydof[currDof] = updateDof(currDof, mydof[currDof],-5);
				isDirty = true;
  } else if (key.name === 'd') {
				mydof[currDof] = updateDof(currDof, mydof[currDof],-1);
				isDirty = true;
  } else if (key.name === 'f') {
				mydof[currDof] = updateDof(currDof, mydof[currDof],1);
				isDirty = true;
  } else if (key.name === 'g') {
				mydof[currDof] = updateDof(currDof, mydof[currDof],5);
				isDirty = true;
  } else if (key.name === 'h') {
				mydof[currDof] = updateDof(currDof, mydof[currDof],10);
				isDirty = true;
  } else if (key.shift && key.name === 'z') {
	console.log(mydof);
  } else {
    console.log(`You pressed the "${str}" key`);
    console.log();
    console.log(key);
    console.log();
  }
  //console.log(currDof);
  //console.log(mydof[currDof]);

  if (isDirty) {
	  //updateArm(mydof);
		mover.handleMoveSingle(mydof);
		isDirty = false;
  }
});
