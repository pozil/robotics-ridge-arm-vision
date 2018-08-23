const PwmDriver = require('adafruit-i2c-pwm-driver'),
	sleep = require('sleep'),
	readline = require('readline'),
	movement = require('./movement');

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

const mover = new movement('arm-1');

function getPosition(code) {
	var myRet = {}
	if (false) {
		//do nothing
	} else if (code === 'p') { //nuetral
		//myRet = {dof0: 300, dof1: 300, dof2: 300, dof3: 300, dof4: 300, dof5: 300};
		mover.goHome();
	} else if (code === 'o') { //center low
		//myRet = {dof0: 280, dof1: 248, dof2: 298, dof3: 365, dof4: 300, dof5: 300};
		
	} else if (code === 'l') { //center high
		//myRet = {dof0: 280, dof1: 305, dof2: 270, dof3: 385, dof4: 300, dof5: 300};
		mover.goPicture();
	} else if (code === 'z') { //center top low
		//myRet = {dof0: 280, dof1: 241, dof2: 318, dof3: 375, dof4: 300, dof5: 300};
	} else if (code === 'x') { //center left low
                //myRet = {dof0: 274, dof1: 248, dof2: 298, dof3: 365, dof4: 300, dof5: 300};
	} else if (code === 'v') { //center right low
                //myRet = {dof0: 287, dof1: 248, dof2: 298, dof3: 365, dof4: 300, dof5: 300};
	} else if (code === 'b') { //center bottom low
                //myRet = {dof0: 280, dof1: 251, dof2: 278, dof3: 345, dof4: 300, dof5: 300};
	} else if (code === 'n') { //salute forward up
		mover.goSalute();
	} else if (code === 'k') { //sleep
		mover.goSleep();
        } else if (code === 'u') { //linear robot drop off
		mover.goDropoff();
	} else { //default center high
	}
	return myRet;
}


//driver.setPWM(flags.dof,0,flags.pwm);
process.stdin.on('keypress', (str, key) => {
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
    	getPosition(key.name);
  } else if (key.name === 'a') {
    mydof[currDof]-=10;
	isDirty = true;
  } else if (key.name === 's') {
    mydof[currDof]-=5;
	isDirty = true;
  } else if (key.name === 'd') {
    mydof[currDof]-=1;
	isDirty = true;
  } else if (key.name === 'f') {
    mydof[currDof]+=1;
	isDirty = true;
  } else if (key.name === 'g') {
    mydof[currDof]+=5;
	isDirty = true;
  } else if (key.name === 'h') {
    mydof[currDof]+=10;
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

  //if (isDirty) {
//	  updateArm(mydof);
  //}
});
