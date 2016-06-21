
var cluster = require('cluster'),
    queue = require('./queue'),
    path = require('path'),
    fs = require('fs');

require('dotenv').config();

module.exports = (function (cluster, queue, env, fs, path, undefined) {

    'use strict';

    function ServiceClass(logger) {

        this.logger = logger;
        this.queue = queue(logger);
        this.workers = {
            max: 1,
            working: []
        };
        this.logger.debug(env.TASK_DIR);

        var _this = this;
        _this.queue.on('enqueue', function _serviceOnPush() {

            var nameSocket = _this.queue.peek();
            if (undefined === nameSocket)
                return undefined;

            _this.logger.log('Enqueuing item', nameSocket.name);

            var worker = reserveWorker.call(_this, nameSocket.name, nameSocket.socket);
            if (!worker)
                return undefined;

            _this.queue.dequeue();

            _this.logger.log('Running queue item', nameSocket.name);
            worker.run();
        });
        _this.queue.on('done', function _serviceWorkerDone() {

            _this.queue.emit('enqueue');
        });
    };

    ServiceClass.prototype = function() {

        function getConfigurationNames(callback) {

            var _this = this;

            if (callback) {

                fs.readdir(env.TASK_DIR, function _readTasksDirectory(err, files) {

                    if (err) {

                        _this.logger.error(err);
                        callback(err, null);
                        return;
                    }

                    var extLen = '.json'.length;

                    // only files with ".json" extension
                    var response = files.filter(function _filterTaskConfigFiles(name) {

                        var nameLen = name.length - extLen,
                            extPos = name.toLowerCase().lastIndexOf('.json');
                        return 0 < extPos && nameLen === extPos;
                    })
                    .map(function _mapTaskConfigFiles(name) {

                        return { name: name.substring(0, name.length - extLen) };
                    });

                    callback(null, response);
                });
            }
        }

        function getTaskConfiguration(name, callback) {

            var _this = this;

            if (callback) {

                fs.readFile(
                    path.join(env.TASK_DIR, name + '.json'),
                    { encoding: 'utf8', flag: 'r' },
                    function _readTaskConfigFile(err, data) {

                        if (err) {

                            _this.logger.error(err);
                            return callback(err, null);
                        }

                        try {

                            var jContent = JSON.parse(data);
                            jContent.name = name;
                            return callback(null, jContent);
                        } 
                        catch (ex) {

                            _this.logger.error(ex.message, ex.stack);
                            return callback(ex.message, null);
                        }
                    });
            }
        }

        function getWorkers(callback) {

            var response = this.workers.working
                .filter(function _filterWorkers(e) {

                    return !!e;
                })
                .map(function _mapWorkers(e) {

                    return {pos: e.pos, name: e.name};
                });

            if (callback) 
                callback(null, response);

            return response;
        }

        function runTask(name, socket) {

            var _this = this;

            if (cluster.isWorker) {

                _this.logger.error('RunTask', name, 'must start on Cluster Master Node!');
                return;
            }

            _this.logger.log('Run task', name, 'requested.');
            _this.queue.enqueue({name: name, socket: socket});
        }

        return {
            getConfigurationNames: getConfigurationNames,
            getTaskConfiguration: getTaskConfiguration,
            getWorkers: getWorkers,
            runTask: runTask
        }
    }();

    function reserveWorker(name, socket) {

        var _this = this,
            pos = undefined,
            bAlreadyWorkingOnName = false;

        for(var i = 0; i < _this.workers.max; i++) {

            var w = _this.workers.working[i];

            // find unused worker
            if (undefined === pos && undefined === w) {

                pos = i;
            }

            // cannot start new worker for the same name
            if (w && w.name === name) {

                bAlreadyWorkingOnName = true;
                break;
            }
        }

        if (true === bAlreadyWorkingOnName) {

            _this.logger.error('Already working on', name);
            return undefined;
        }

        if (undefined === pos) {

            _this.logger.error('All workers are running.');
            return undefined;
        }

        var newInfo = {
            pos: pos,
            name: name,
            config: undefined,
            worker: undefined,
            run: function _runWorker() {

                var this_ = this;

                if (undefined !== _this.workers.working[this_.pos]) {

                    _this.logger.error('Some worker \'' 
                        + _this.workers.working[this_.pos].name
                        + '\' took this \''
                        + this_.name
                        + ' worker\'s place');
                    return;
                }

                _this.workers.working[this_.pos] = this_;

                _this.getTaskConfiguration(name, function(err, config){

                    this_.config = config;

                    var wkr = cluster.fork();
                    this_.worker = wkr;
                    _this.logger.log('Worker no', this_.pos, 'starting...');

                    wkr.on('message', function(msg) {

                        var data = msg.data || msg;
                        if ('log' === msg.type) {

                            _this.logger.logArgs(data);
                        } else { 

                            _this.logger.errorArgs(data);
                        }

                        socket.emit('log', data);
                    });

                    wkr.on('online', function _wkrOnline() {

                        _this.logger.log('Worker no', this_.pos, 'online. PID:', wkr.process.pid);
                        socket.emit('workerOnline', {pos: this_.pos, name: this_.name});
                    })

                    wkr.on('disconnect', function _wkrDisconnect() {

                        _this.logger.log('Worker no', this_.pos, 'disconnected. PID:', wkr.process.pid);
                        _this.workers.working[this_.pos] = undefined;
                        socket.emit('workerOffline', {pos: this_.pos, name: this_.name});
                        _this.queue.emit('done');
                    });

                    wkr.send(config); 
                });
            }
        };

        return newInfo;
    }

    return function _ServiceClassNew(logger) {

        return new ServiceClass(logger);
    };
})(cluster, queue, process.env, fs, path);