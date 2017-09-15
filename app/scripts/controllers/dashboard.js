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

    $scope.$state = $state;
    $scope.dtrHost=""
    $scope.ucpHost=""

    pwdService.getSession().then(function(session) {
      console.log(session);
      var sessionSetup = {
        "instances": [
            {"hostname": "manager1", "is_swarm_manager": true, "run": [["sh", "-c", "ucp.sh deploy worker1 2> /ucp.log"]]},
            {"hostname": "worker1", "is_swarm_worker": true, "run": [["sh", "-c", "ucp.sh setup-certs worker1"]]},
            {"type":"windows", "run": [["powershell", "-File", "c:/windows/system32/copy_certs.ps1", "-Node", "worker1", "-SessionId", session.id, "-FQDN", session.hostname]]}

        ]
      };
      pwdService.init(session,sessionSetup).then(function() {
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
    }, function(){
      return $location.path('/login');
    });

    $scope.openDTR = function() {
      $window.open('https://' + $scope.dtrHost, '_blank');
    }


    $scope.openUCP = function() {
      $window.open('https://' + $scope.ucpHost, '_blank');
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
        }
      }, 0);
    };

  });
