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
		this.driver = PwmDriver({address: 0x40, device: '/dev/i2c-1', debug: true, i2cDebug: false});
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

	goHome() {
		this.handleMove(this.positions["home"]);		
	}

	goSalute() {
		this.handleMove(this.positions["salute"]);
	}

	goSleep() {
		this.handleMove(this.positions["sleep"]);
	}

	goPicture() {
		this.handleMove(this.positions["picture"]);
	}

	goDropOff() {
		this.handleMove(this.positions["dropoff"]);
	}

	handleMove(sequence) {
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
		for (var curr = 0; curr++; curr <= 5) {
			if (coordinates["dof"+curr]) {
				driver.setPWM(curr,0,coordinates["dof"+curr]);
				this.currentPosition["dof"+curr] = coordinates["dof"+curr];
			}
		}
		if (coordinates["msleep"]) {
			Sleep.msleep(coordinates["msleep"]);
		}
	}

	
}
