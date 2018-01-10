'use strict';

angular.module('yapp')
  .factory('pwdService', function($http, $location, $rootScope) {
    var p = {

      assignSession: function() {
       return $http.post('https://ee-beta.play-with-docker.com/workshops/c991c379-03dc-4183-af36-82040263ff8a/session', {}, {headers: {'Accept': 'application/json'}}).then(function(response) {
            return response.data.session_id;
        });
      },

      getSession: function() {
        var sessionId = $location.path().replace('/','');
        if (!sessionId) {
          return new Promise(function(resolve,reject){reject()});
        }
        return $http.get('https://ee-beta.play-with-docker.com/sessions/' + sessionId).then(function(response) {
          response.data.hostname = 'ee-beta.play-with-docker.com';
          return response.data;
        });
      },


      init: function(session) {
        // init the pwd session
        return  new Promise(function(resolve, reject) {
          pwd.init(session.id, {baseUrl: 'https://ee-beta.play-with-docker.com'}, function() {
            resolve();
          });
        });
      },

    };

    return p;
  });
