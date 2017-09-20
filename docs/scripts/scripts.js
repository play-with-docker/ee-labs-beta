'use strict';

/**
 * @ngdoc overview
 * @name yapp
 * @description
 * # yapp
 *
 * Main module of the application.
 */
angular
  .module('yapp', [
    'ui.router',
    'ngAnimate',
    'ngUrlParser'
  ])
  .config(["$sceDelegateProvider", function($sceDelegateProvider) {
    $sceDelegateProvider.resourceUrlWhitelist(['**']);
  }])
  .config(["$stateProvider", "$urlRouterProvider", "$httpProvider", function($stateProvider, $urlRouterProvider, $httpProvider) {

    $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

    $urlRouterProvider.otherwise('/dashboard');

    $stateProvider
      .state('base', {
        abstract: true,
        url: '',
        templateUrl: 'views/base.html'
      })
        .state('login', {
          url: '/login',
          parent: 'base',
          templateUrl: 'views/login.html',
          controller: 'LoginCtrl'
        })
        .state('dashboard', {
          url: '/dashboard',
          parent: 'base',
          templateUrl: 'views/dashboard.html',
          controller: 'DashboardCtrl'
        })
  }])
  .run(["$location", "$rootScope", function($location, $rootScope){
    // takes TLD from single dotted domains. ".co.uk" wouldn't work.
    $rootScope.tld = $location.host().split('.').slice(-2).join('.');
    document.domain = $rootScope.tld;
  }]);

'use strict';

angular.module('yapp')
  .factory('pwdService', ["$http", "$location", "$rootScope", function($http, $location, $rootScope) {
    var p = {

      createSession: function(secret) {
        var data = encodeURIComponent('g-recaptcha-response') + '=' + encodeURIComponent(secret);
        var req = {
          method: 'POST',
          url: 'https://microsoft.play-with-docker.com',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: data
        };
        return $http(req).then(function(response) {
          let s = {id: response.data.session_id, hostname: response.data.hostname};
          localStorage.setItem('session', JSON.stringify(s));
          s.instances = {};
          return s;
        });
      },

      getSession: function() {
        let session = JSON.parse(localStorage.getItem('session'));
        if (!session) {
          return new Promise(function(resolve,reject){reject()});
        }
        return $http.get('https' + '://' + session.hostname + '/sessions/' + session.id).then(function(response) {
          session.instances = response.data.instances;
          return session;
        });
      },

      exec: function(name, data) {
        return new Promise(function(resolve, reject) {
          pwd.exec(name, data, function(err) {
            if (err) {
              console.log('exec failed:', err);
              return reject(err);
            }
              return resolve();
          });
        });
      },

      init: function(session, data) {
        // init the pwd session
        return  new Promise(function(resolve, reject) {
          pwd.init(session.id, {baseUrl: 'https://'+ session.hostname}, function() {
            if (Object.keys(session.instances).length == 0) {
              waitingDialog.show('Please wait, your session will be ready in a few minutes.');
              let ucpInstance;
              // setup session and retrieve updated session
              p.setup(data).then(function() {
                return p.getSession().then(function(updatedSession) {
                  session.instances = updatedSession.instances;

                  // TODO decide if this needs to be within the SDK or not,
                  // but it's not pretty to handle it this way
                  pwd.instances = updatedSession.instances;

                  waitingDialog.hide();
                  resolve();
                });
              }, function() {
                  waitingDialog.message('Error provisiong session, please refresh to start over.');
                  localStorage.clear();
              });
            } else {
              resolve();
            }
          });
        });
      },

      setup: function(data) {
        return new Promise(function(resolve, reject) {
          pwd.setup(data, function(err) {
            if (err) {
              return reject(err);
            }
              return resolve();
          });
        });
      }
    };

    return p;
  }]);

'use strict';

angular.module('yapp')
  .factory('elemService', function() {
    var e = {

      onElementReady: function(w, selector) {
        return new Promise((resolve) => {
          var waitForElement = function() {
            var element = w.document.querySelector(selector);
            if (element) {
              resolve(element);
            } else {
              w.requestAnimationFrame(waitForElement);
            }
          };
          waitForElement();
        })
      }
    }

  return e;
});

'use strict';

/**
 * @ngdoc function
 * @name yapp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of yapp
 */
angular.module('yapp')
  .controller('DashboardCtrl', ["$scope", "$state", "$location", "pwdService", "$timeout", "$window", function($scope, $state, $location, pwdService, $timeout, $window) {

    $scope.instances = [];

    $scope.$state = $state;
    $scope.dtrHost=""
    $scope.ucpHost=""
    $scope.winHost=""

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
          } else if (instance.type == "windows") {
            $scope.winHost = instance.proxy_host + '.direct.' + session.hostname;
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
            $timeout(function(){
              // fit the term after it's rendered
              instance.term.fit();
            }, 0);
        }
      }, 0);
    };

  }]);

'use strict';

/**
 * @ngdoc function
 * @name yapp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of yapp
 */
angular.module('yapp')
  .controller('LoginCtrl', ["$scope", "$location", "pwdService", function($scope, $location, pwdService) {

    $scope.submit = function(form) {


      if (form.$valid) {
        pwdService.createSession()
          .then(function(session) {
            $location.path('/dashboard');
          });
      }

      return false;
    }

  }]);
