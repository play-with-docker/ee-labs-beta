'use strict';

angular.module('yapp')
  .factory('pwdService', function($http, $location, $rootScope) {
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
          $location.hash(response.data.session_id)
          return response.data;
        });
      },

      getSession: function() {
        var sessionId = $location.path().replace('/','');
        if (!sessionId) {
          return new Promise(function(resolve,reject){reject()});
        }
        return $http.get('https://microsoft.play-with-docker.com' + '/sessions/' + sessionId).then(function(response) {
          response.data.hostname = "microsoft.play-with-docker.com";
          return response.data;
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
          pwd.init(session.id, {baseUrl: 'https://microsoft.play-with-docker.com'}, function() {
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
                  waitingDialog.message('Error provisiong session, click <a href="/">here</a> to start over.');
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
  });
