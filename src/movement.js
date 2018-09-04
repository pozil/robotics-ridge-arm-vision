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

	disconnect() {
		return new Promise(function(resolve, reject) {
			//something
			if (true) {
				resolve();
			} else {
				reject();
			}
		});
	}

	goPickupCenter() {
		let that = this;
		return that.handleMove(this.positions["pickupCenter"]);
	}

	goPickupOne() {
		let that = this;
		return that.handleMove(this.positions["pickupOne"]);

	}

	goPickupTwo() {
		let that = this;
		return that.handleMove(this.positions["pickupTwo"]);
	}

	goPickupThree() {
		let that = this;
		return that.handleMove(this.positions["pickupThree"]);
	}

	goPickupFour() {
		let that = this;
		return that.handleMove(this.positions["pickupFour"]);
	}

	goHome() {
		console.log("home");
		let that = this;
		return that.handleMove(this.positions["home"]);		

	}

	goSalute() {
		let that = this;
		return that.handleMove(this.positions["salute"]);
	}

	goSleep() {
		let that = this;
		return that.handleMove(this.positions["sleep"]);
	}

	goPicture() {
		console.log("picture");
		let that = this;
		return that.handleMove(this.positions["picture"]);
	}

	goDropOff() {
		let that = this;
		return that.handleMove(this.positions["dropoff"]);
	}

	handleMove(sequence) {
		console.log("move");
		console.log(sequence);
		let that = this;
		return new Promise(function(resolve,reject) {
			if (sequence["setup"]) {
				that.handleMoveSingle(sequence["setup"]);
			}
			if (sequence["move"]) {
				that.handleMoveSingle(sequence["move"]);
			}
			if (sequence["action"]) {
				that.handleMoveSingle(sequence["action"]);
			}
			if (sequence["action2"]) {
				that.handleMoveSingle(sequence["action2"]);
			}
			if (sequence["action3"]) {
				that.handleMoveSingle(sequence["action3"]);
			}
			if (sequence["exit"]) {
				that.handleMoveSingle(sequence["exit"]);
			}
			if (true) {
				resolve();
			} else {
				reject(new Error("How'd I get here?"));
			}

		});

	}

	handleMoveSingle(coordinates) {
		console.log("single move");
		console.log(coordinates);
		let that = this;
		for (var curr = 0; curr < 6; curr++) {
			if (coordinates["dof"+curr]) {
				that.driver.setPWM(curr,0,coordinates["dof"+curr]);
				that.currentPosition["dof"+curr] = coordinates["dof"+curr];
			} else {
				//console.log("no coordinated" + curr);
			}
		}
		if (coordinates["msleep"]) {
			Sleep.msleep(coordinates["msleep"]);
		}
	}

}
