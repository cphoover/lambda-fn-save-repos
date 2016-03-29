import config from '../config';
import winston from 'winston';

const Logger = winston.Logger;

module.exports = function (ns) {
	return new Logger({
		transports: [
			new (winston.transports.Console)({
				timestamp : true,
				label : ns.toString(),
				level : config.get('LOG_LVL') || 'info'
			})
		]
	});
};
