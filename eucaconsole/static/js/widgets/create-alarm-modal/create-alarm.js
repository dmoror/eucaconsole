angular.module('CreateAlarmModal', [
    'ModalModule',
    'AlarmServiceModule',
    'MetricServiceModule',
    'ScalingGroupsServiceModule',
    'AlarmActionsModule'
])
.directive('createAlarm', ['MetricService', 'AlarmService', function (MetricService, AlarmService) {
    var defaults = {};

    return {
        restrict: 'A',
        require: ['^modal', 'createAlarm'],
        templateUrl: function (element, attributes) {
            return attributes.template;
        },
        link: function (scope, element, attrs, ctrls) {
            var modalCtrl = ctrls[0],
                createAlarmCtrl = ctrls[1];

            var modalName;
            scope.editDimensions = false;

            createAlarmCtrl.initializeModal(attrs);

            scope.$on('modal:open', function (event, name) {
                modalName = name;
                if (modalName === 'copyAlarm') {
                    scope.editDimensions = true;
                }
                createAlarmCtrl.initializeModal(attrs);
            });
            scope.$on('modal:close', function (event, name) {
                if(name === modalName) {
                    scope.resetForm();
                }
            });
        },
        controller: ['$scope', '$rootScope', 'AlarmService', 'ModalService', function ($scope, $rootScope, AlarmService, ModalService) {
            var vm = this;
            $scope.alarm = {};
            var csrf_token = $('#csrf_token').val();

            $scope.onNameChange = function () {
                $scope.createAlarmForm.name.$setTouched();
            };

            $scope.$watchCollection('alarm', function (newVal) {
                if(newVal.metric && $scope.createAlarmForm.name.$untouched) {
                    $scope.alarm.name = $scope.alarmName();
                }
            });

            $scope.alarmName = function (count) {
                // Name field updates when metric selection changes,
                // unless the user has changed the value themselves.
                count = count || 0;
                if(count > 20) {
                    $scope.createAlarmForm.name.$setValidity('uniqueName', false);
                    return $scope.alarm.name;
                }
                
                var alarm = $scope.alarm;
                var resName = $scope.resourceName || $scope.resourceId;
                if (resName === undefined) {
                    resName = [];
                    Object.keys($scope.dimensions).forEach(function(key) {
                        if (resName.length > 0) {
                            resName.push(' - ');
                        }
                        resName.push($scope.dimensions[key].join(' - '));
                    });
                    resName = resName.join('');
                }
                var name = [
                    alarm.metric.namespace,
                    resName,
                    alarm.metric.name].join(' - ');

                if(count > 0) {
                    name = name + [' (', ')'].join(count);
                }

                var collision = $scope.existingAlarms.some(function (alarm) {
                    return alarm.name === name;
                });

                if(collision) {
                    name = $scope.alarmName(count + 1);
                }

                return name;
            };

            this.composeAlarmMetric = function (attrs) {
                $scope.alarm.metric.namespace = $scope.namespace;
                $scope.alarm.dimensions = $scope.dimensions;
                $scope.alarm.statistic = attrs.defaultStatistic;
                $scope.alarm.comparison = '>=';
                $scope.alarm.evaluation_periods = defaults.evaluation_periods;
                $scope.alarm.period = defaults.period;

                $scope.checkNameCollision();
            };

            this.initializeModal = function(attrs) {
                defaults = {
                    statistic: attrs.defaultStatistic,
                    metric: attrs.defaultMetric,
                    comparison: '>=',
                    evaluation_periods: 1,
                    period: 300
                };

                $scope.title = attrs.title || 'Create Alarm';

                $scope.existingAlarms = [];
                if(attrs.alarmName) {
                    AlarmService.getAlarm(attrs.alarmName)
                        .then(function (res) {
                            var alarm = res.alarm;
                            vm.initializeForCopy(alarm, attrs);
                        });
                } else {
                    this.initializeForCreate(attrs);
                }
            };

            this.initializeForCopy = function (alarm, attrs) {
                $scope.alarm = alarm;
                $scope.alarm.name = 'Copy of ' + alarm.name;
                $scope.alarm.dimensions = alarm.dimensions;
                $scope.dimensions = alarm.dimensions;
                $scope.namespace = alarm.namespace;
                $scope.resourceType = attrs.resourceType;
                $scope.resourceId = attrs.resourceId;
                finishInit(attrs)
            };

            this.initializeForCreate = function (attrs) {
                $scope.namespace = attrs.namespace;
                $scope.resourceType = attrs.resourceType;
                $scope.resourceId = attrs.resourceId;
                $scope.dimensions = attrs.dimensions ? JSON.parse(attrs.dimensions) : undefined;
                if ($scope.dimensions === undefined) {
                    $scope.dimensions = {};
                    $scope.dimensions[$scope.resourceType] = [$scope.resourceId];
                }
                $scope.resourceName = attrs.resourceName;
                finishInit(attrs)
            };

            var finishInit = function(attrs) {
                if (attrs.loadMetricChoices !== 'false') {
                    MetricService.getMetrics($scope.namespace, $scope.dimensions)
                        .then(function (metrics) {
                            $scope.metrics = metrics;

                            $scope.alarm.metric = metrics.find(function(metric) {
                                return metric.name === defaults.metric;
                            });

                            defaults.metric = $scope.alarm.metric;
                            vm.composeAlarmMetric(attrs);
                        });
                }
                else {
                    // let's construct the metric object from data passed
                    $scope.alarm.metric = {
                        name: defaults.metric,
                        unit: attrs.unit
                    };

                    vm.composeAlarmMetric(attrs);
                }
            }

            $scope.createAlarm = function () {
                if($scope.createAlarmForm.$invalid) {
                    var $error = $scope.createAlarmForm.$error;
                    Object.keys($error).forEach(function (error) {
                        $error[error].forEach(function (current) {
                            current.$setTouched();
                        });
                    });
                    return;
                }

                var alarm = $scope.alarm;

                AlarmService.createAlarm({
                    name: alarm.name,
                    metric: alarm.metric.name,
                    namespace: alarm.metric.namespace,
                    statistic: alarm.statistic,
                    comparison: alarm.comparison,
                    threshold: alarm.threshold,
                    period: alarm.period,
                    evaluation_periods: alarm.evaluation_periods,
                    unit: alarm.unit,
                    description: alarm.description,
                    dimensions: alarm.dimensions,
                    alarm_actions: alarm.alarm_actions,
                    insufficient_data_actions: alarm.insufficient_data_actions,
                    ok_actions: alarm.ok_actions
                }, csrf_token).then(function success (response) {
                    ModalService.closeModal('createAlarm');
                    Notify.success(response.data.message);
                    $rootScope.$broadcast('alarmStateView:refreshList');
                }, function error (response) {
                    ModalService.closeModal('createAlarm');
                    Notify.failure(response.data.message);
                });
            };

            $scope.$on('actionsUpdated', function (event, actions) {
                var targets = {
                    ALARM: 'alarm_actions',
                    INSUFFICIENT_DATA: 'insufficient_data_actions',
                    OK: 'ok_actions'
                };
                $scope.alarm.insufficient_data_actions = [];
                $scope.alarm.alarm_actions = [];
                $scope.alarm.ok_actions = [];

                actions.forEach(function (action) {
                    var target = targets[action.alarm_state];
                    $scope.alarm[target].push(action.arn);
                });
            });

            $scope.resetForm = function () {
                $scope.alarm = angular.copy(defaults);
                $scope.checkNameCollision();
                $scope.createAlarmForm.$setPristine();
                $scope.createAlarmForm.$setUntouched();
            };

            $scope.checkNameCollision = function () {
                $scope.existingAlarms = [];
                AlarmService.getAlarmsForDimensions($scope.dimensions)
                    .then(function success(alarms) {
                        $scope.existingAlarms = alarms;
                        $scope.alarm.name = $scope.alarmName();
                    });
            };
        }]
    };
}])
.directive('uniqueName', function () {
    return {
        restrict: 'A',
        require: ['ngModel', '^createAlarm'],
        link: function (scope, element, attrs, ctrls) {
            var modelCtrl = ctrls[0],
                formCtrl = ctrls[1];

            modelCtrl.$validators.uniqueName = function (modelValue, viewValue) {
                return !scope.existingAlarms.some(function (alarm) {
                    return alarm.name === viewValue;
                });
            };

        }
    };
});
