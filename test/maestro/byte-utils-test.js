const ByteUtils = require('../../src/maestro/byte-utils'),
	JsHamcrest = require('jshamcrest').JsHamcrest;

JsHamcrest.Integration.Nodeunit();

module.exports = {

	'Should split low and high bits for value < 254': function (test) {
		test.deepEqual([ 10, 0 ], ByteUtils.toLowAndHighBits(10), 'Did not split low and high bits for value < 254');
		test.done();
	},

	'Should split low and high bits for value > 254': function (test) {
		test.deepEqual([ 0x70, 0x2E ], ByteUtils.toLowAndHighBits(6000), 'Did not split low and high bits for value > 254');
		test.done();
	},

	'Should join low and high bytes for value < 254': function (test) {
		test.equal(10, ByteUtils.fromLowAndHighBits([ 10, 0 ]), 'Did not join low and high bits for value < 254');
		test.done();
	},

	'Should join low and high bytes for value > 254': function (test) {
		test.equal(6000, ByteUtils.fromLowAndHighBits([ 0x70, 0x2E ]), 'Did not join low and high bits for value > 254');
		test.done();
	},

	'Should join low and high bytes for 8 bit value < 254': function (test) {
		test.equal(10, ByteUtils.fromLowAndHigh8Bits([ 10, 0 ]), 'Did not join low and high bits for 8 bit value < 254');
		test.done();
	},

	'Should join low and high bytes for 8 bit value > 254': function (test) {
		test.equal(6000, ByteUtils.fromLowAndHigh8Bits([ 0x70, 0x17 ]), 'Did not join low and high bits for 8 bit value > 254');
		test.done();
  },

  'Should byte arrays match': function (test) {
    const bytes = [0x01, 0xA1];
    const isMatch = ByteUtils.compareByteArrays(bytes, bytes);
    test.ok(isMatch, 'Byte arrays should match');
    test.done();
  },

  'Should byte arrays not match': function (test) {
    const a = [0x01, 0xA1];
    const b = [0x01, 0xA2];
    const isMatch = ByteUtils.compareByteArrays(a, b);
    test.ok(!isMatch, 'Byte arrays should not match');
    test.done();
  },

  'Should convert bytes to string': function (test) {
    const bytes = [0x01, 0xA1];
    const bytesAsString = ByteUtils.bytesToString(bytes);
    test.equal('0x1 0xA1', bytesAsString, 'Did not convert bytes to string correctly');
    test.done();
  },
};

