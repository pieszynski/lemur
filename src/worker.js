var cluster = require('cluster'),
	logger = require('./clog');

cluster.worker.on('message', function _msgToWorker(msg) {

	if ('task' === msg.type) {

		runTask(msg);
	} else {

		logger.error('Unknown message', JSON.stringify(msg));
	}
});

function runTask(spec) {

	logger.log('Running task', spec.name, '\n');

	try {

		spec.steps.forEach(function _runTaskStep(stepConfig, stepIndex) {

			logger.log('Running step', stepConfig.name || stepIndex, '\n');

			var pluginName = './plugins/' + stepConfig.task;
			logger.log('Running plugin "' + pluginName + '" with config', JSON.stringify(stepConfig.config), '\n');

			var pluginTask = require(pluginName)(logger, stepConfig.config);
			pluginTask.run(function(err, code) {

				if (err)
					logger.error(err);
				
				logger.log('Worker ExitCode:', code, '\n');
				cluster.worker.disconnect();
			});
		});
	} catch(ex) {

		logger.error(ex.message, ex.stack);
	}
}