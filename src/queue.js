
var EventEmitter = require('events'),
    util = require('util');

module.exports = (function (EventEmitter, util, undefined) {

    'use strict';

    function QueueClass(logger) {

        EventEmitter.call(this);
        this.logger = logger;

        this.logger.debug('new queue initialized');

        this.queue = [];
    }

    util.inherits(QueueClass, EventEmitter);
    // "util.inherits()" adds following methods to prototype:
    //
    // .domain
    // ._events
    // ._maxListeners
    // .setMaxListeners
    // .getMaxListeners
    // .emit
    // .addListener
    // .on
    // .once
    // .removeListener
    // .removeAllListeners
    // .listeners
    // .listenerCount

    // switch .on() to Async
    var fnOn = QueueClass.prototype.on;
    QueueClass.prototype.on = function _on(type, listener) {

        fnOn.call(this, type, function _fnOn() {

            var _cbThis = this,
                _cbArgs = arguments;
            process.nextTick(function _nextTick() {

                listener.apply(_cbThis, _cbArgs);
            });
        });
    };

    // switch .addListener() to Async
    var fnAddListener = QueueClass.prototype.addListener;
    QueueClass.prototype.addListener = function _addListener(type, listener) {

        fnAddListener.call(this, type, function _fnAddListener() {

            var _cbThis = this,
                _cbArgs = arguments;

            process.nextTick(function _nextTick() {

                listener.apply(_cbThis, _cbArgs);
            });
        });
    };

    QueueClass.prototype.enqueue = function _enqueue(obj) {

        this.queue.push(obj);
        this.emit('enqueue');
    };

    QueueClass.prototype.dequeue = function _dequeue() {

        if (0 >= this.queue.length)
            return undefined;

        var response = this.queue.shift();
        this.emit('dequeue');

        return response
    };

    QueueClass.prototype.peek = function _peek() {

        if (0 >= this.queue.length)
            return undefined;

        var response = this.queue[0];

        return response
    };

    return function _newQueueClass(logger) {

        return new QueueClass(logger);
    };

})(EventEmitter, util);