import winston from 'winston';

const Logger = winston.Logger;

module.exports = function (ns) {
	return new Logger({
		transports: [
			new (winston.transports.Console)({
				timestamp : true,
				label : ns.toString(),
				level : process.env.LOG_LVL || 'info' // eslint-disable-line no-process-env
			})
		]
	});
};
