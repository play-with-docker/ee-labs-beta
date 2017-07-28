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

    $scope.submit = function(form) {


      if (form.$valid) {
        pwdService.createSession($scope.recaptchaResponse)
          .then(function(session) {
            $location.path('/dashboard');
          });
      }

      return false;
    }

  });
