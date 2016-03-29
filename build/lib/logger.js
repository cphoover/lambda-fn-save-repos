'use strict';

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Logger = _winston2.default.Logger;

module.exports = function (ns) {
	return new Logger({
		transports: [new _winston2.default.transports.Console({
			timestamp: true,
			label: ns.toString(),
			level: process.env.LOG_LVL || 'info' // eslint-disable-line no-process-env
		})]
	});
};