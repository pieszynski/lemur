var http = require('http'),
    express = require('express'),
    compression = require('compression'),
    bodyParser = require('body-parser'),
    socketio = require('socket.io');

module.exports = (function (undefined) {

    'use strict';

    function returnAsJson(res, err, obj) {

        if (err) {

            var msg = err instanceof Error ? err.message : err.toString();

            res.setHeader('Content-Type', 'text/plain');
            res.status(500).end(msg);
            return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.status(200).end(JSON.stringify(obj));
    }

    function WebHostClass(logger, service) {

        var _this = this;
        _this.logger = logger;
        _this.service = service;

        _this.app = express();
        _this.router = express.Router();
        _this.svr = http.Server(_this.app);
        _this.io = socketio(_this.svr);

        _this.app.disable('x-powered-by');
        _this.app.use(compression());
        _this.app.use(express.static(__dirname + '/www/'));
        _this.app.use(bodyParser.json());
        _this.app.use(bodyParser.urlencoded({extended: true}));

        _this.app.all(/.*/i, _this.router);
        _this.app.all('/', _this.router);

        _this.router.post('/app/getConfigurationNames', function (req, res, next) {

            _this.service.getConfigurationNames(function(err, data) {

                returnAsJson.call(_this, res, err, data);
            });            
        });

        _this.router.post('/app/openTask', function (req, res, next) {

            _this.service.getTaskConfiguration(req.body.name, function(err, data) {

                returnAsJson.call(_this, res, err, data);
            });
        });

        _this.router.post('/app/workers', function (req, res, next) {

            _this.service.getWorkers(function(err, data) {

                returnAsJson.call(res, res, err, data);
            });
        });

        _this.io.on('connection', function _socketConnection(socket) {

            socket.on('runTask', function(data) {

                _this.service.runTask(data.name, socket);
            });
        });

        _this.svr.listen(1337);
    }

    WebHostClass.prototype = function() {

        return {
        };
    }();

    return function _WebHostClassNew(logger, service) {

        return new WebHostClass(logger, service);
    };
})();