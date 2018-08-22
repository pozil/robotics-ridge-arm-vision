const Winston = require('winston');
const PwmDriver = require('adafruit-i2c-pwm-driver');
const Sleep = require('sleep');

// Configure logs
Winston.loggers.add('ARM', {
  console: { level: 'info', colorize: true, label: 'ARM' }
});
const LOG = Winston.loggers.get('ARM');


module.exports = class movement {
  
	constructor(hostname) {
		this.hostname = hostname;
		this.driver = PwmDriver({address: 0x40, device: '/dev/i2c-1', debug: true, i2cDebug: false});
		//test environment only?
		if (hostname.startsWith('test')) {
			hostname = "../test/" + hostname
		}
		this.configFile = hostname + '-movement.json';
		this.positions = require(this.configFile);
		this.currentPosition = this.positions.home.setup;
	}

	init() {

	}

	goHome() {
		
	}

	goSleep() {

	}

	goPicture() {

	}

	goGantry() {
	
	}

	handleMove(sequence) {
		if (sequence["setup"]) {
			doSingleMove(sequence["setup"]);
		}
		if (sequence["move"]) {
			doSingleMove(sequence["move"]);
		}
		if (sequence["action"]) {
			doSingleMove(sequence["action"]);
		}
		if (sequence["exit"]) {
			doSingleMove(sequence["exit"]);
		}
	}

	doSingleMove(coordinates) {
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
