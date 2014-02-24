/*
 * @fileOverview user view page JS
 * @requires AngularJS
 *
 */

// user view page includes the User Editor editor
angular.module('UserView', ['PolicyList'])
    .controller('UserViewCtrl', function ($scope) {
        $scope.form = $('#user-update-form');
        $scope.ec2_expanded = false;
        $scope.s3_expanded = false;
        $scope.autoscale_expanded = false;
        $scope.elb_expanded = false;
        $scope.iam_expanded = false;
        $scope.toggleEC2Content = function () {
            $scope.ec2_expanded = !$scope.ec2_expanded;
        };
        $scope.toggleS3Content = function () {
            $scope.s3_expanded = !$scope.s3_expanded;
        };
        $scope.toggleAutoscaleContent = function () {
            $scope.autoscale_expanded = !$scope.autoscale_expanded;
        };
        $scope.toggleELBContent = function () {
            $scope.elb_expanded = !$scope.elb_expanded;
        };
        $scope.toggleIAMContent = function () {
            $scope.iam_expanded = !$scope.iam_expanded;
        };
    })
    .controller('UserUpdateCtrl', function($scope, $http, $timeout) {
        $http.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
        $scope.jsonEndpoint = '';
        $scope.initController = function (jsonEndpoint) {
            $scope.jsonEndpoint = jsonEndpoint;
        };
        $scope.submit = function($event) {
            var data = $($event.target).serialize();
            $http({method:'POST', url:$scope.jsonEndpoint, data:data,
                   headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
              success(function(oData) {
                var results = oData ? oData.results : [];
                // could put data back into form, but form already contains changes
                if (oData.error == undefined) {
                    Notify.success(oData.message);
                } else {
                    Notify.failure(oData.message);
                }
              }).
              error(function (oData, status) {
                var errorMsg = oData['message'] || '';
                Notify.failure(errorMsg);
              });
        };
    })
    .controller('UserPasswordCtrl', function($scope, $http, $timeout) {
        $http.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
        $scope.jsonRandomEndpoint = '';
        $scope.jsonChangeEndpoint = '';
        $scope.data = '';
        $scope.initController = function (jsonRandomEndpoint, jsonChangeEndpoint) {
            $scope.jsonRandomEndpoint = jsonRandomEndpoint;
            $scope.jsonChangeEndpoint = jsonChangeEndpoint;
            var newPasswordForm = $('#new_password');
            // add password strength meter to first new password field
            newPasswordForm.after("<hr id='password-strength'/>");
            newPasswordForm.on('keypress', function () {
                var val = $(this).val();
                var score = zxcvbn(val).score;
                $('#password-strength').attr('class', "password_" + score);
            });
            $("#change-password-modal").on('show', function () {
                $('#password').focus(); // doesn't seem to work.
            });
        };
        // Handles first step in submit.. validation and dialog
        $scope.submitChange = function($event) {
            $('#passwords-match').css('display', 'none');
            var newpass = $event.target.new_password.value;
            var newpass2 = $event.target.new_password2.value;
            if (newpass != newpass2) {
                $('#passwords-match').css('display', 'block');
                return false;
            }
            $scope.data = $($event.target).serialize();
            // open modal to get current password
            $('#change-password-modal').foundation('reveal', 'open');
        };
        // handles server call for changing the password
        $scope.changePassword = function($event) {
            // add in current password, then submit the request
            var data = $scope.data+"&password="+$event.target.password.value;
            var form = $($event.target);
            $.generateFile({
                csrf_token: form.find('input[name="csrf_token"]').val(),
                filename: "not-used", // let the server set this
                content: data,
                script: $scope.jsonChangeEndpoint
            });
            $('#change-password-modal').foundation('reveal', 'close');
            // same notes about setTimeout apply as below
            setTimeout(function() {
                $('#new_password').val("");
                $('#new_password2').val("");
                $('#password-strength').removeAttr('class');
            }, 2000);
        };
        // Handles first step in submit.. validation and dialog
        $scope.submitRandom = function($event) {
            // open modal to get current password
            $('#random-password-modal').foundation('reveal', 'open');
        };
        // handles server call for generating a random password
        $scope.genPassword = function($event) {
            // add in current password, then submit the request
            var data = "password="+$event.target.password.value;
            var form = $($event.target);
            $.generateFile({
                csrf_token: form.find('input[name="csrf_token"]').val(),
                filename: "not-used", // let the server set this
                content: data,
                script: $scope.jsonRandomEndpoint
            });
            $('#change-password-modal').foundation('reveal', 'close');
            // same notes about setTimeout apply as below
            setTimeout(function() {
                $('#new_password').val("");
                $('#new_password2').val("");
                $('#password-strength').removeAttr('class');
            }, 2000);
        };
    })
    .controller('UserAccessKeysCtrl', function($scope, $http, $timeout) {
        $http.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
        $scope.jsonEndpoint = '';
        $scope.jsonItemsEndpoint = '';
        $scope.items = [];
        $scope.itemsLoading = true;
        $scope.userWithKey = '';
        $scope.keyToDelete = '';
        $scope.initController = function (jsonEndpoint, jsonItemsEndpoint) {
            $scope.jsonEndpoint = jsonEndpoint;
            $scope.jsonItemsEndpoint = jsonItemsEndpoint;
            $scope.getItems(jsonItemsEndpoint);
        };
        $scope.getItems = function (jsonItemsEndpoint) {
            $http.get(jsonItemsEndpoint).success(function(oData) {
                var results = oData ? oData.results : [];
                $scope.itemsLoading = false;
                $scope.items = results;
            }).error(function (oData, status) {
                var errorMsg = oData['message'] || '';
                if (errorMsg && status === 403) {
                    $('#euca-logout-form').submit();
                }
            });
        };
        $scope.generateKeys = function ($event) {
            var form = $($event.target);
            $.generateFile({
                csrf_token: form.find('input[name="csrf_token"]').val(),
                filename: "not-used", // let the server set this
                content: "no-content",
                script: $scope.jsonEndpoint
            });
            // this is clearly a hack. We'd need to bake callbacks into the generateFile
            // stuff to do this properly. Probably should open an issue. TODO
            setTimeout(function() {
                $scope.itemsLoading = true;
                $scope.items = [];
                $scope.getItems($scope.jsonItemsEndpoint);
            }, 2000);
            /* keeping this stuff in case we do the callbacks in generateFile
            $http({method:'POST', url:$scope.jsonEndpoint, data:'',
                   headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
              success(function(oData) {
                var results = oData ? oData.results : [];
                $scope.itemsLoading = true;
                $scope.items = [];
                $scope.getItems($scope.jsonItemsEndpoint);
                Notify.success(oData.message);
              }).
              error(function (oData, status) {
                if (status == 403) window.location = '/';
                var errorMsg = oData['message'] || '';
                Notify.failure(errorMsg);
              });
              */
        };
        $scope.makeAjaxCall = function (url, item) {
            url = url.replace("_name_", item['user_name']).replace("_key_", item['access_key_id']);
            $http({method:'POST', url:url, data:'',
                   headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
              success(function(oData) {
                var results = oData ? oData.results : [];
                $scope.itemsLoading = true;
                $scope.items = [];
                $scope.getItems($scope.jsonItemsEndpoint);
                Notify.success(oData.message);
              }).
              error(function (oData, status) {
                if (status == 403) window.location = '/';
                var errorMsg = oData['message'] || '';
                Notify.failure(errorMsg);
              });
        };
        $scope.confirmDelete = function (item) {
            var modal = $('#delete-key-modal');
            $scope.userWithKey = item.user_name;
            $scope.keyToDelete = item.access_key_id;
            modal.foundation('reveal', 'open');
        };
        $scope.deleteKey = function (url) {
            url = url.replace("_name_", $scope.userWithKey).replace("_key_", $scope.keyToDelete);
            $http({method:'POST', url:url, data:'',
                   headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
              success(function(oData) {
                var results = oData ? oData.results : [];
                $scope.itemsLoading = true;
                $scope.items = [];
                $scope.getItems($scope.jsonItemsEndpoint);
                Notify.success(oData.message);
              }).
              error(function (oData, status) {
                if (status == 403) window.location = '/';
                var errorMsg = oData['message'] || '';
                Notify.failure(errorMsg);
              });
            $('#delete-key-modal').foundation('reveal', 'close');
        };
    })
    .controller('UserGroupsCtrl', function($scope, $http, $timeout) {
        $http.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
        $scope.addEndpoint = '';
        $scope.removeEndpoint = '';
        $scope.jsonItemsEndpoint = '';
        $scope.jsonGroupsEndpoint = '';
        $scope.jsonGroupPoliciesEndpoint = '';
        $scope.jsonGroupPolicyEndpoint = '';
        $scope.items = [];
        $scope.itemsLoading = true;
        $scope.policyName = '';
        $scope.policyJson = '';
        $scope.initController = function (addEndpoint, removeEndpoint, jsonItemsEndpoint, jsonGroupsEndpoint, jsonGroupPoliciesEndpoint, jsonGroupPolicyEndpoint) {
            $scope.addEndpoint = addEndpoint;
            $scope.removeEndpoint = removeEndpoint;
            $scope.jsonItemsEndpoint = jsonItemsEndpoint;
            $scope.jsonGroupsEndpoint = jsonGroupsEndpoint;
            $scope.jsonGroupPoliciesEndpoint = jsonGroupPoliciesEndpoint;
            $scope.jsonGroupPolicyEndpoint = jsonGroupPolicyEndpoint;
            $scope.getItems(jsonItemsEndpoint);
            $scope.getAvailableGroups();
        };
        $scope.getItems = function (jsonItemsEndpoint) {
            $http.get(jsonItemsEndpoint).success(function(oData) {
                var results = oData ? oData.results : [];
                $scope.itemsLoading = false;
                $scope.items = results;
                for (var i=0; i<results.length; i++) {
                    $scope.loadPolicies(results[i].group_name, i);
                }
            }).error(function (oData, status) {
                var errorMsg = oData['message'] || '';
                if (errorMsg && status === 403) {
                    $('#euca-logout-form').submit();
                }
            });
        };
        $scope.loadPolicies = function (groupName, index) {
            var url = $scope.jsonGroupPoliciesEndpoint.replace('_name_', groupName);
            $http.get(url).success(function(oData) {
                var results = oData ? oData.results : [];
                $scope.items[index].policies = results;
            }).error(function (oData, status) {
                var errorMsg = oData['message'] || '';
                if (errorMsg && status === 403) {
                    $('#euca-logout-form').submit();
                }
            });
        };
        $scope.getAvailableGroups = function () {
            $http.get($scope.jsonGroupsEndpoint).success(function(oData) {
                var results = oData ? oData.results : [];
                $scope.groups = results;
                options = "";
                for (var i=0; i<results.length; i++) {
                    options += "<option value='"+results[i]+"'>"+results[i]+"</option>";
                }
                $('#group_name').find('option').remove().end().append($(options));
                $('#group_name').trigger('chosen:updated');
            }).error(function (oData, status) {
                var errorMsg = oData['message'] || '';
                if (errorMsg && status === 403) {
                    $('#euca-logout-form').submit();
                }
            });
        };
        $scope.addUserToGroup = function ($event) {
            group_name = $('#group_name').val();
            url = $scope.addEndpoint.replace("_group_", group_name);
            $http({method:'POST', url:url, data:'',
                   headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
              success(function(oData) {
                var results = oData ? oData.results : [];
                $scope.itemsLoading = true;
                $scope.items = [];
                $scope.getItems($scope.jsonItemsEndpoint);
                $scope.getAvailableGroups();
                Notify.success(oData.message);
              }).
              error(function (oData, status) {
                var errorMsg = oData['message'] || '';
                Notify.failure(errorMsg);
              });
        };
        $scope.removeUserFromGroup = function (item) {
            group_name = item.group_name;
            url = $scope.removeEndpoint.replace("_group_", group_name);
            $http({method:'POST', url:url, data:'',
                   headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
              success(function(oData) {
                var results = oData ? oData.results : [];
                $scope.itemsLoading = true;
                $scope.items = [];
                $scope.getItems($scope.jsonItemsEndpoint);
                $scope.getAvailableGroups();
                Notify.success(oData.message);
              }).
              error(function (oData, status) {
                var errorMsg = oData['message'] || '';
                Notify.failure(errorMsg);
              });
        };
        $scope.showPolicy = function ($event, groupName, policyName) {
            $event.preventDefault();
            $scope.policyJson = ''; // clear any previous policy
            $scope.policyName = policyName
            var url = $scope.jsonGroupPolicyEndpoint.replace('_name_', groupName).replace('_policy_', policyName);
            $http.get(url).success(function(oData) {
                var results = oData ? oData.results : [];
                $scope.policyJson = results;
            }).error(function (oData, status) {
                var errorMsg = oData['message'] || '';
                if (errorMsg && status === 403) {
                    $('#euca-logout-form').submit();
                }
            });
            $('#policy-view-modal').foundation('reveal', 'open');
        };
    })
    .controller('UserQuotasCtrl', function($scope, $http) {
        $http.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
        $scope.jsonEndpoint = '';
        $scope.initController = function (jsonEndpoint) {
            $scope.jsonEndpoint = jsonEndpoint;
        };
        $scope.submit = function($event) {
            var data = $($event.target).serialize();
            $http({method:'POST', url:$scope.jsonEndpoint, data:data,
                   headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
              success(function(oData) {
                var results = oData ? oData.results : [];
                Notify.success(oData.message);
              }).
              error(function (oData, status) {
                var errorMsg = oData['message'] || '';
                Notify.failure(errorMsg);
              });
        };
    })
;
