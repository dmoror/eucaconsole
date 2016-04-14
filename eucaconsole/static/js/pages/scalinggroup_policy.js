/**
 * @fileOverview Scaling Group Create Policy page JS
 * @requires AngularJS
 *
 */

// Add Scaling Group Policy page includes the Create Alarm dialog, so pull in that module
angular.module('ScalingGroupPolicy', ['EucaConsoleUtils', 'CloudWatchCharts', 'CreateAlarmModal', 'ModalModule'])
    .controller('ScalingGroupPolicyCtrl', function ($rootScope, $scope, eucaNumbersOnly) {
        $scope.policyForm = $('#add-policy-form');
        $rootScope.alarmChoices = {};
        $rootScope.alarm = '';
        $scope.policyName = '';
        $scope.adjustmentAmount = 1;
        $scope.coolDown = 300;
        $scope.isNotValid = true;
        $scope.initController = function (alarmChoices) {
            $rootScope.alarmChoices = alarmChoices;
            $scope.setWatch();
        };
        $scope.checkRequiredInput = function () {
            $scope.isNotValid = false;
            if( $scope.policyName === '' || $scope.policyName === undefined ){
                $scope.isNotValid = true;
            }else if( $scope.adjustmentAmount === '' || $scope.adjustmentAmount === undefined ){
                $scope.isNotValid = true;
            }else if( $scope.coolDown === '' || $scope.coolDown === undefined ){
                $scope.isNotValid = true;
            }else if( $rootScope.alarm === '' || $rootScope.alarm === undefined || 
                $rootScope.alarm === null || $rootScope.alarm === '""' ){
                $scope.isNotValid = true;
            }
        };
        $scope.setWatch = function () {
            $scope.$watch('policyName', function () {
                $scope.checkRequiredInput();
            });
            $scope.$watch('adjustmentAmount', function (newVal) {
                if(newVal) {
                    $scope.adjustmentAmount = eucaNumbersOnly(newVal);
                    $scope.isNotValid = false;
                } else {
                    $scope.isNotValid = true;
                }
                $scope.checkRequiredInput();
            });
            $scope.$watch('coolDown', function (newVal) {
                if(newVal) {
                    $scope.coolDown = eucaNumbersOnly(newVal);
                    $scope.isNotValid = false;
                } else {
                    $scope.isNotValid = true;
                }
                $scope.checkRequiredInput();
            });
            $scope.$watch('alarm', function () {
                $scope.checkRequiredInput();
            });

            $scope.$on('alarmStateView:refreshList', function ($event, args) {
                // Add new alarm to choices and set it as selected
                var newAlarm = args.name;
                $rootScope.alarmChoices[newAlarm] = newAlarm;
                $rootScope.alarm = newAlarm;
                $scope.isCreatingAlarm = false;
            });
        };
    })
;

