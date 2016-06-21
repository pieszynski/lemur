
var cluster = require('cluster'),
	Console = console.Console;

module.exports = (function(undefined) {

	'use strict';

	var bIsWorker = cluster.isWorker,
		logger = new Console(process.stdout, process.stderr);

	function debug() {

		var varg = [].slice.call(arguments);

		varg.unshift("DEBUG:");
		log.apply(null, varg);
	}

	function log() {

		var varg = [].slice.call(arguments);

		if (bIsWorker) {

			process.send({ type: 'log', data: varg });
		} else {

			logger.log.apply(logger, varg);
		}
	}

	function error() {

		var varg = [].slice.call(arguments);

		if (bIsWorker) {

			process.send({ type: 'error', data: varg });
		} else {

			console.error.apply(console, varg);
		}
	}

	function logArgs(args) {

		log.apply(null, args);
	}

	function errorArgs(args) {

		error.apply(null, args);
	}

	return {
		log: log,
		logArgs: logArgs,
		error: error,
		errorArgs: errorArgs,
		debug: debug
	}
})();