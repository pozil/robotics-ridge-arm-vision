const ERRORS = [
	{ code: 1, message: 'Serial signal error detected' },
	{ code: 2, message: 'Serial overrun error detected' },
	{ code: 4, message: 'Serial RX buffer full' },
	{ code: 8, message: 'Serial CRC error detected' },
	{ code: 16, message: 'Serial protocol error detected' },
	{ code: 32, message: 'Serial timeout error detected' },
	{ code: 64, message: 'Script stack error detected' },
	{ code: 128, message: 'Script call stack error detected' },
	{ code: 256, message: 'Script program counter error detected' },
];


module.exports = {
  VENDOR_ID: '1ffb',

  CMD_SET_TARGET:       {firstByte: 0x84, responseSize: 0},
  CMD_SET_SPEED:        {firstByte: 0x87, responseSize: 0},
  CMD_SET_ACCELERATION: {firstByte: 0x89, responseSize: 0},
  CMD_GET_POSITION:     {firstByte: 0x90, responseSize: 2},
  CMD_GET_MOVING_STATE: {firstByte: 0x93, responseSize: 1},
  CMD_CHECK_ERROR:      {firstByte: 0xA1, responseSize: 2},
  CMD_HOME:             {firstByte: 0xA2, responseSize: 0},

  READ_TIMEOUT: 500,

  ERRORS: ERRORS,
};
