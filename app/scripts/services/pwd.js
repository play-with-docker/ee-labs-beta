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
