'use strict';

/**
 * @ngdoc function
 * @name yapp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of yapp
 */
angular.module('yapp')
  .controller('LoginCtrl', function($scope, $location, pwdService) {
    // If there's a dialog open, hide it;
    waitingDialog.hide();

    $scope.submit = function(form) {


      if (form.$valid) {
        pwdService.createSession()
          .then(function(session) {
            $location.path('/dashboard');
          });
      }

      return false;
    }

  });
