// thaw-argon-mongodb-web-service/test/main.test.js

'use strict';

// const engine = require('..');

exports.bogus = {
	setUp: function(done) {
		// this.val = [0];
		done();
	},
	test: function(test) {
		test.expect(1);
		test.equal(1, 1, 'Should be 1');
		// test.notEqual(engine, undefined);
		// test.ok(engine);
		test.done();
	}
};
