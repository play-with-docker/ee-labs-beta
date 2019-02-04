'use strict';

/**
 * @ngdoc function
 * @name yapp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of yapp
 */
angular.module('yapp')
  .controller('DashboardCtrl', function($scope, $state, $location, pwdService, $timeout, $window) {

    $scope.instances = [];

    $scope.feedback = "";

    $scope.feedbackSent;

    $scope.$state = $state;
    $scope.dtrHost=""
    $scope.ucpHost=""
    $scope.winHost=""

    jQuery('#feedbackModal').on('hidden.bs.modal', function (e) {
      $scope.$apply(function(){
        $scope.feedbackSent = null;
        $scope.feedback = "";
      });
    });

    pwdService.getSession().then(function(session) {
      pwdService.init(session).then(function() {
        for (var i in session.instances) {
          let instance = session.instances[i];
          if (instance.hostname == "manager1") {
            $scope.ucpHost = instance.proxy_host + '.direct.' + session.hostname;
          } else if (instance.hostname == "worker1") {
            $scope.dtrHost = instance.proxy_host + '.direct.' + session.hostname;
          }
          $scope.instances.push(instance);
        }
        $scope.$apply();
        $scope.showInstance($scope.instances[0]);
      });
    }, function() {
      //$location.path('/')
    });

    $scope.openDTR = function() {
      $window.open('https://' + $scope.dtrHost, '_blank');
    }


    $scope.openUCP = function() {
      $window.open('https://' + $scope.ucpHost, '_blank');
    }

    $scope.sendFeedback = function() {
      var $btn = jQuery('#feedbackSubmit').button('loading');
      doorbell.send($scope.feedback, "feedback@pwd.com", function() {
        $scope.$apply(function(){
          $scope.feedbackSent = true;
          $scope.feedback = "";
          $btn.button('reset');
        });
      }, function() {
        $scope.$apply(function(){
          $scope.feedbackSent = false;
          $btn.button('reset');
        });
      });
    }


    $scope.showInstance = function(instance) {
      $scope.selectedInstance = instance;
      // Wait for the DOM to be ready
      $timeout(function(){
        // create the term if it doesn't exist
        if (!instance.term && !instance.url) {
            var terms = pwd.createTerminal({selector: '#term-'+ $scope.instances.indexOf(instance)}, instance.name);
            // we'll handle one term per instance
            instance.term = terms[0];
            $timeout(function(){
              // fit the term after it's rendered
              instance.term.fit();
            }, 0);
        }
      }, 0);
    };

  });
