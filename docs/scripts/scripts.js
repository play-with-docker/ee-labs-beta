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
    'ngUrlParser',
    'vcRecaptcha',
    'ngOnload'
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
          url: 'http://labs.play-with-docker.com',
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
        return $http.get($location.protocol() + '://' + session.hostname + '/sessions/' + session.id).then(function(response) {
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

      init: function(session) {
        // init the pwd session
        return  new Promise(function(resolve, reject) {
          pwd.init(session.id, {baseUrl: 'http://'+ session.hostname, ImageName: 'franela/ucp:2.1.5'}, function() {
            resolve();
          });
        })
        .then(function() {
          if (Object.keys(session.instances).length == 0) {
            waitingDialog.show('Please wait, your session will be ready in a minute.');
            let ucpInstance;
            // create UCP node
            return p.newInstance()
              .then(function(instance) {
                session.instances[instance.name] = instance;
                ucpInstance = instance;
                var ucp_cmd = [
                  '/deployucp.sh'
                ];

                return p.exec(ucpInstance.name, ucp_cmd).then(function(){
                  waitingDialog.hide();
                });

              });
              // DTR stuff
              //.then(function() {
                 //create DTR node
                //return p.newInstance()
                  //.then(function(instance) {
                    //session.instances[instance.name] = instance;
                     //setup UCP and DTR
                  //});
              //});
            } else {
              return new Promise(function(resolve, reject){resolve()});
            }
        });
      },

      newInstance: function() {
        return new Promise(function(resolve, reject) {
          pwd.createInstance(function(err, instance) {
            if (err) {
              return reject(err);
            }
              return resolve(instance);
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
  .controller('DashboardCtrl', ["$scope", "$state", "$location", "pwdService", "elemService", "$timeout", "$sce", "$document", "urlParser", function($scope, $state, $location, pwdService, elemService, $timeout, $sce, $document, urlParser) {
    $document.domain = 'localhost';
    var iframeIntro;
    var mainIntro = introJs();
    var introOptions = {
      exitOnEsc: false,
      exitOnOverlayClick: false,
      skipLabel: 'Exit',
      keyboardNavigation: false,
      showBullets: false,
      hideNext: true
    };

    mainIntro.setOptions(introOptions);

    $scope.instances = [];

    $scope.tutorials = [
      {name: "Log-in", id: 'login',  href:"/#/login", element:'#login > div > div'},
      {name: "Add node", id: 'add_node', href:"/#/resources/nodes?page=1&count=25", element:'.negative'},
      {name: "Deploy service", id: 'deploy_service', href:"/#/resources/applications?page=1&count=10", element:'[data-title="\'Volumes\'"]'},
      {name: "Access service", id: 'access_service', href:"/#/resources/services?page=1&count=25", element:'[data-title="\'Name\'"]'}
    ];

    $scope.$state = $state;

    pwdService.getSession().then(function(session) {
      console.log(session);
      pwdService.init(session).then(function() {
        for (var i in session.instances) {
          let instance = session.instances[i];
          // Only populate URL for first instance
          if ($scope.instances.length < 1) {
            let dashIP = instance.ip.replace(/\./g,'-');
            instance.url = 'http://pwd'+dashIP+'-8443.'+session.hostname;
          }
          $scope.instances.push(instance);
        }
        $scope.$apply();
        $scope.showInstance($scope.instances[0]);
      });
    }, function(){
      return $location.path('/login');
    });


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

    $scope.runTutorial = function(tutorial) {
      var cw = $('iframe').get(0).contentWindow;

        //change url  need to
        if (tutorial.href) {
          cw.location.href= cw.location.origin + tutorial.href;
        }
        $scope.currentTutorial = tutorial;
        startTour(tutorial.id);
    };

    $scope.onFrameLoad = function() {
      // add mainIntro steps;
      mainIntro.addSteps([
        {
          element: $('.sidebar .btn').get(0),
          intro: "Let's create a new instance"
        },
        {
          element: $('.nav-sidebar').get(0),
          intro: 'Select the newly created instance'
        },
        {
          element: $('.jumbotron').get(0),
          intro: 'Paste the token by using your mouse <b>right</b> click and press enter',
          position: 'left',
          showNext: true
        },
        {
          element: $('.nav-sidebar').get(0),
          intro: 'Go back to node1',
        },
        {
          element: $('jumbotron').get(0),
          intro: "Congratulations!, you've added a second node to your swarm cluster!. You can check the status of your cluster nodes or add/remove them  on this screen" ,
        }
      ]);

      mainIntro.onchange(function(step) {
        switch (this._currentStep) {
          case 0:
            step.onclick = function() {
              $scope.$on('newInstance', function() {
                mainIntro.nextStep();
                step.onclick = undefined;
              });
            };
            break;

          case 1:
            step.onclick = function() {
              mainIntro.nextStep();
              step.onclick = undefined;
            };
            break;

          // going back to deploy screen
          case 3:
            step.onclick = function() {
              // change iframe url to deploy a new app
              var cw = $('iframe').get(0).contentWindow;
              cw.setTimeout(function() {
                cw.location.href="#/resources/nodes";
              });
              mainIntro.exit();
              step.onclick = undefined;
            };
            break;
        }
      });
    };


    var startTour = function(id) {
      if (iframeIntro) {
        // exit any other previous steps when changing pages
        iframeIntro.exit();
      }

      if ($scope.currentTutorial) {
        elemService.onElementReady($('iframe').get(0).contentWindow, $scope.currentTutorial.element)
          .then(function() {
            // set the steps and start the tour
            $scope.tourSteps(id);
            iframeIntro.start();
          });
      }
    };

    $scope.tourSteps = function(id) {
      var c = $('iframe').get(0).contentWindow.document;
      iframeIntro = introJs(c.body);
      iframeIntro.setOptions(introOptions);

      switch (id) {

        case 'login':
          iframeIntro.addSteps([{
            element: $('#login .form',c).get(0),
            intro: "log-in using <b>admin/admin1234</b>",
            position: 'top'
          }]);
          $('#login .form',c).keypress(function(evt) {
            if (evt.keyCode == 13) {
              iframeIntro.nextStep();
            }
          });
          //elemService.onElementReady($('iframe').get(0).contentWindow,'.upload-section')
            //.then(function() {
              //var cw = $('iframe').get(0).contentWindow;
              //cw.setTimeout(function() {
                //cw.location.href="#/dashboard";
              //});
            //});
          break;


        case 'access_service':
          iframeIntro.addSteps([
            {
              element: $('table',c).get(0),
              intro: "Click on the <b>test_vote</b> service to check our service",
            }
          ]);
          iframeIntro.onchange(function(step) {
            if (this._currentStep == 0) {
              step.onclick = function() {
                iframeIntro.exit();
                $scope.runTutorial({id: 'show_service', element:'.ui.side.modal'});
                step.onclick = undefined;
              };
            }
          });
          break;

        case 'show_service':
          iframeIntro.addSteps([
            {
              element: $('.ui.side.modal',c).get(0),
              intro: "Scroll down to the bottom and click on the <b>ingress</b> link to see your app. Congratunations!, you've deployed your first app in UCP",
              position: 'left'
            }
          ]);
          iframeIntro.oncomplete(function() {
            var cw = $('iframe').get(0).contentWindow;
            cw.setTimeout(function() {
              cw.location.href="#/dashboard";
            });
          });
          break;


        case 'add_node':
          iframeIntro.addSteps([
            {
              element: $('#nodes > div > div:nth-child(1) > div.eleven.wide.column > div > div',c).get(0),
              intro: "Click the <b>Add Node</b> button to create a new node",
            },
            {
              element: undefined,
              intro: "Copy the swarm join URL"
            }
          ]);
          iframeIntro.onchange(function(step) {
            if (this._currentStep == 0) {
              step.onclick = function() {
                iframeIntro.nextStep();
                step.onclick = undefined;
              };
            }
          });
          iframeIntro.oncomplete(function() {
            mainIntro.start();
          });
          break;

        case 'deploy_service':
          iframeIntro.addSteps([
            {
              element: $('.ui.green.button',c).get(0),
              intro: "Let's deploy a new stack now ",
            }
          ]);
          iframeIntro.onchange(function(step) {
            var self = this;
            switch (this._currentStep) {
              case 0:
                step.onclick = function() {
                  elemService.onElementReady($('iframe').get(0).contentWindow,'.ui.side.modal')
                    .then(function() {
                      iframeIntro.addSteps([
                        {
                          element: $('.ui.side.modal',c).get(0),
                          intro: `Now is the moment to deploy our stack, enter your app name and paste the following definition:
<pre>
version: "3"
services:

  redis:
    image: redis:alpine
    ports:
      - "6379"
    networks:
      - frontend
    deploy:
      replicas: 1
      update_config:
        parallelism: 2
        delay: 10s
      restart_policy:
        condition: on-failure
  vote:
    image: dockersamples/examplevotingapp_vote:before
    ports:
      - 5000:80
    networks:
      - frontend
    depends_on:
      - redis
    deploy:
      replicas: 2
      update_config:
        parallelism: 2
      restart_policy:
        condition: on-failure

networks:
  frontend:
  backend:
</pre>`,
                          position: 'left'
                        },
                        {
                          element: $('.ui.side.modal',c).get(0),
                          intro: "Your service has been deployed!. Move to the next tutorial to access your service",
                          position: 'left'
                        }
                      ]);
                      iframeIntro.goToStepNumber(2).start();
                      step.onclick = undefined;
                    });
                };
                break;

              case 1:
                $('.ui.submit',c).click(function() {
                  iframeIntro.nextStep();
                  // once this step intro is done, go to services
                  iframeIntro.oncomplete(function(){
                    var cw = $('iframe').get(0).contentWindow;
                    cw.setTimeout(function() {
                      cw.location.href="#/resources/services";
                    });
                  });
                });
                break;
            }
          });
          break;
      }

    };

    $scope.newInstance = function() {
      var inst = {};
      $scope.instances.push(inst);
      pwdService.newInstance().then(function(instance) {
          Object.assign(inst, instance);
          $scope.$apply();
          $scope.$broadcast('newInstance', instance);
      });
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
        pwdService.createSession($scope.recaptchaResponse)
          .then(function(session) {
            $location.path('/dashboard');
          });
      }

      return false;
    }

  }]);
