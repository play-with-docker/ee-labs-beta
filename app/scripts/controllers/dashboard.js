'use strict';

/**
 * @ngdoc function
 * @name yapp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of yapp
 */
angular.module('yapp')
  .controller('DashboardCtrl', function($scope, $state, $location, pwdService, elemService, $timeout, $sce, $document, urlParser) {
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
      {name: "Log-in", id: 'login',  href:"#/login", element:'#login > div > div'},
      {name: "Add node", id: 'add_node', href:"#/resources/nodes?page=1&count=25", element:'.negative'},
      {name: "Deploy service", id: 'deploy_service', href:"#/resources/applications?page=1&count=10", element:'[data-title="\'Volumes\'"]'},
      {name: "Access service", id: 'access_service', href:"#/resources/services?page=1&count=25", element:'[data-title="\'Name\'"]'}
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
      cw.setTimeout(function() {
        //change url we need to
        if (tutorial.href) {
          cw.location.href=tutorial.href;
        }
        $scope.currentTutorial = tutorial;
        startTour(tutorial.id);
      });
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
      var c = $('iframe').contents()[0];
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

  });
