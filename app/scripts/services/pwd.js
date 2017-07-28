'use strict';

angular.module('yapp')
  .factory('pwdService', function($http, $location, $rootScope) {
    var p = {

      createSession: function(secret) {
        var req = {
          method: 'POST',
          url: 'http://labs.play-with-docker.com',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: secret
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
  });
