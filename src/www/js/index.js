// app/getConfigurationNames
(function (socket, undefined) {

    'use strict';

    var app = angular.module('indexModule', ['ngSanitize', 'ngTouch']);

    app.controller('indexCtrl', ['$scope', '$http', function($scope, $http) {

        if (typeof(socket) === "undefined") {

            console.error('Socket is undefined. Cannot start without it.')
            return;
        }

        var self = this;

        var configurationNamesModel = [],
            openTaskModel = {},
            workersModel = [],
            socketModel = '';

        self.getConfigurationNames = function _getConfigurationNames() {

            $http.post('app/getConfigurationNames')
            .then(function _getConfigurationNamesResponse(res) {

                self.configurationNamesModel = res.data;
            });
        };

        self.openTask = function _openTask(taskName) {

            $http.post('app/openTask', { name: taskName })
            .then(function _openTaskResponse(res) {

                self.openTaskModel = res.data;
            }, function _openTaskResponseError(res) {

                console.error(res.data);
                self.openTaskModel = undefined;
            });
        };

        self.getWorkers = function _getWorkers(taskName) {

            $http.post('app/workers')
            .then(function _getWorkersResponse(res) {

                self.workersModel = res.data;
            });
        };

        self.init = function _init() {

            self.getConfigurationNames();
            self.getWorkers();
        }

        self.runTask = function _runTask(taskName) {

            self.socketModel = '';

            socket.emit('runTask', { name: taskName });
        };

        socket.on('workerOnline', function (data) {

            self.getWorkers();
        });

        socket.on('workerOffline', function (data) {

            self.getWorkers();
        });

        socket.on('log', function (data) {

            if (data instanceof Array) {

                var adata = data.map(function _logArrMap(el) {

                    if ('string' === typeof(el)) {

                        return el;
                    } else {

                        return JSON.stringify(el);
                    }
                });


                self.socketModel += adata.join(' ');
            } else {

                self.socketModel += data;
            }

            $scope.$applyAsync();
        });

        self.init();
    }]);

})((typeof(socket) === "undefined" ? undefined : socket));