var cluster = require('cluster'),
    logger = require('./clog');

cluster.setupMaster({
    exec: 'worker.js',
    silent: true
});

var service = require('./service')(logger),
    webhost = require('./webhost'),
    www = webhost(logger, service);
