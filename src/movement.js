const Winston = require('winston');
const PwmDriver = require('adafruit-i2c-pwm-driver');
const Sleep = require('sleep');

// Configure logs
Winston.loggers.add('MOVEMENT', {
  console: { level: 'info', colorize: true, label: 'ARM' }
});
const LOG = Winston.loggers.get('MOVEMENT');


module.exports = class movement {
  
	constructor(hostname) {
		this.hostname = hostname;
		this.driver = PwmDriver({address: 0x40, device: '/dev/i2c-1', debug: false, i2cDebug: false});
		this.driver.setPWMFreq(50);
		//test environment only?
		if (hostname.startsWith('test')) {
			hostname = "../test/" + hostname
		} else {
			hostname = "../config/" + hostname
		}
		this.configFile = hostname + '-movement.json';
		this.positions = require(this.configFile);
		this.currentPosition = {};
	}

	init() {

	}

	goPickupCenter() {
		this.handleMove(this.positions["pickupCenter"]);
	}

	goPickupOne() {
		this.handleMove(this.positions["pickupOne"]);

	}

	goPickupTwo() {
		this.handleMove(this.positions["pickupTwo"]);
	}

	goPickupThree() {
		this.handleMove(this.positions["pickupThree"]);
	}

	goPickupFour() {
		this.handleMove(this.positions["pickupFour"]);
	}

	goHome() {
		console.log("home");
		this.handleMove(this.positions["home"]);		

	}

	goSalute() {
		this.handleMove(this.positions["salute"]);
	}

	goSleep() {
		this.handleMove(this.positions["sleep"]);
	}

	goPicture() {
		console.log("picture");
		this.handleMove(this.positions["picture"]);
	}

	goDropOff() {
		this.handleMove(this.positions["dropoff"]);
	}

	handleMove(sequence) {
		console.log("move");
		console.log(sequence);
		if (sequence["setup"]) {
			this.handleMoveSingle(sequence["setup"]);
		}
		if (sequence["move"]) {
			this.handleMoveSingle(sequence["move"]);
		}
		if (sequence["action"]) {
			this.handleMoveSingle(sequence["action"]);
		}
		if (sequence["exit"]) {
			this.handleMoveSingle(sequence["exit"]);
		}
	}

	handleMoveSingle(coordinates) {
		console.log("single move");
		console.log(coordinates);
		for (var curr = 0; curr < 6; curr++) {
			console.log("in loop");
			if (coordinates["dof"+curr]) {
				this.driver.setPWM(curr,0,coordinates["dof"+curr]);
				console.log("set dof" + curr);
				this.currentPosition["dof"+curr] = coordinates["dof"+curr];
			} else {
				console.log("no coordinated" + curr);
			}
		}
		if (coordinates["msleep"]) {
			Sleep.msleep(coordinates["msleep"]);
		}
		this.currentPosition = coordinates;
	}

}
