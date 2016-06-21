
var path = require('path'),
	exec = require('child_process').exec,
	spawn = require('child_process').spawn;

require('dotenv').config();

module.exports = (function(path, exec, env, undefined) {
	'use strict';

	var defaultMsBuildPath = env.MSBUILD;

	var MsbuildClass = function _MsbuildClass(logger, config) {

		this.logger = logger;
		this.config = config;
		this.msbuildPath = this.config.msbuildPath || defaultMsBuildPath;
		this.childProcess = undefined;
	};

	MsbuildClass.prototype = function _MsbuildClassPrototype() {

		function _getConfig() {
			
			return this.config;
		}

		function _run(finishCallback) {

			var _this = this,
				msbuildPath = _this.msbuildPath,
				args = [
					path.normalize(_this.config.file),
					'/t:' + _this.config.target || 'Rebuild'
				];

			if (_this.config.params) {

				// /p:Configuration=?
				if (!_this.config.params.Configuration)
					args.push('/p:Configuration=Release');

				// /p:Platform=?
				if (!_this.config.params.Platform)
					args.push('/p:Platform=AnyCPU');

				for (var paKey in _this.config.params)
					args.push('/p:' + paKey + '=' + _this.config.params[paKey]);
			}

			_this.logger.log('MSBuild Task Starting \\>', '"' + msbuildPath + '" ' + args.join(' '), '\n');

			_this.childProcess = spawn(msbuildPath, args, 
				{ 
					cwd: path.normalize(_this.config.cwd),
					env: process.env
				});

			_this.logger.log('PID:', _this.childProcess.pid, '\n');

			_this.childProcess.stdout.setEncoding('utf8');
			_this.childProcess.stderr.setEncoding('utf8');

			_this.childProcess.stdout.on('data', function (buf) { _this.logger.log(buf); });
			_this.childProcess.stderr.on('data', function (buf) { _this.logger.error(buf); });

			_this.childProcess.on('error', function (err) { 

				_this.logger.error(err); 
				_this.childProcess = undefined;
				finishCallback(err, -1); 
			});

			_this.childProcess.on('close', function (code) { 

				_this.logger.log('ExitCode:', code, '\n'); 
				_this.childProcess = undefined;
				finishCallback(null, code); 
			});
		}

		return {
			run: _run,
			getConfig: _getConfig
		}
	}();

	return function _MsbuildClassNew(logger, config) {

		return new MsbuildClass(logger, config);
	};
})(path, exec, process.env);