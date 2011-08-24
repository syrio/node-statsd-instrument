(function() {
  var StatsDInstrumentation, User, assert, sinon, vows;
  vows = require('vows');
  sinon = require('sinon');
  assert = require('assert');
  StatsDInstrumentation = require('../../lib/statsd-instrument').StatsDInstrumentation;
  User = (function() {
    function User() {}
    User.prototype.login = function(password) {
      return password === 'correct-password';
    };
    User.prototype.logout = function(session_id) {
      return session_id === 'valid-session_id';
    };
    User.prototype.forgotPassword = function(email) {
      return /@/.test(email);
    };
    User.prototype.visit = function() {
      return true;
    };
    User.prototype.deleteProfile = function() {
      return true;
    };
    User.prototype.friendsList = function() {
      return true;
    };
    User.prototype.changePassword = function(existing_password, new_password) {
      if (existing_password !== 'correct-password') {
        throw new Error('wrong existing password');
      }
      return true;
    };
    User.prototype.uploadProfilePicture = function(image_path) {
      if (!/\.png$/.test(image_path)) {
        throw new Error('unsupported image format');
      }
      return true;
    };
    return User;
  })();
  vows.describe('Instrumentation').addBatch({
    'Given a User': {
      'visting the site': {
        topic: function() {
          var instrument, user;
          this.increment_spy = sinon.spy();
          instrument = new StatsDInstrumentation({
            increment: this.increment_spy
          });
          instrument.count(User.prototype, 'visit', 'user.visits');
          user = new User();
          return user.visit();
        },
        'should increment StatsD users visits counter': function() {
          return assert.isTrue(this.increment_spy.calledWith('user.visits'));
        }
      },
      'trying to login': {
        'and providing a wrong password': {
          topic: function() {
            var instrument, user;
            this.increment_spy = sinon.spy();
            instrument = new StatsDInstrumentation({
              increment: this.increment_spy
            });
            instrument.count_success(User.prototype, 'login', 'login');
            user = new User;
            return user.login('correct-password');
          },
          'should increment StatsD login *success* counter': function() {
            return assert.isTrue(this.increment_spy.calledWith('login' + '.' + 'success'));
          }
        }
      },
      'trying to logout': {
        'and not providing a valid session id to logout from': {
          topic: function() {
            var instrument, user;
            this.increment_spy = sinon.spy();
            instrument = new StatsDInstrumentation({
              increment: this.increment_spy
            });
            instrument.count_success(User.prototype, 'logout', 'logout');
            user = new User;
            return user.logout('invalid-session_id');
          },
          'should increment StatsD logout *failure* counter': function() {
            return assert.isTrue(this.increment_spy.calledWith('logout' + '.' + 'failure'));
          }
        }
      },
      'trying to change his password': {
        'without providing his correct existing password': {
          topic: function() {
            var instrument, user;
            this.increment_spy = sinon.spy();
            instrument = new StatsDInstrumentation({
              increment: this.increment_spy
            });
            instrument.count_success(User.prototype, 'changePassword', 'password.change');
            user = new User;
            return user.changePassword('incorrect_password', 'some_new_password');
          },
          'should increment StatsD password change *failure* counter': function() {
            return assert.isTrue(this.increment_spy.calledWith('password.change' + '.' + 'failure'));
          }
        }
      },
      'trying to change upload profile picture': {
        'but provides an unsupported image format': {
          topic: function() {
            var instrument, user;
            this.increment_spy = sinon.spy();
            instrument = new StatsDInstrumentation({
              increment: this.increment_spy
            });
            instrument.count_if(User.prototype, 'uploadProfilePicture', 'uploaded.pictures');
            user = new User;
            return user.uploadProfilePicture('some_picture.invld');
          },
          'should not increment StatsD uploaded profile pictures counter': function() {
            return assert.isTrue(!this.increment_spy.calledWith('uploaded.pictures'));
          }
        }
      },
      'notifying the system of forgetting his password': {
        'and not providing a valid email': {
          topic: function() {
            var instrument, user;
            this.increment_spy = sinon.spy();
            instrument = new StatsDInstrumentation({
              increment: this.increment_spy
            });
            instrument.count_if(User.prototype, 'forgotPassword', 'forgotten.passwords');
            user = new User();
            return user.forgotPassword('invalid_email');
          },
          'should not increment StatsD password forgotten counter': function() {
            return assert.isFalse(this.increment_spy.calledWith('forgotten.passwords'));
          }
        }
      },
      'trying to delete the user profile': {
        'given the user has been an internal beta user': {
          topic: function() {
            var instrument, user;
            this.increment_spy = sinon.spy();
            instrument = new StatsDInstrumentation({
              increment: this.increment_spy
            });
            instrument.count_if(User.prototype, 'deleteProfile', 'leaving.users', function(user) {
              return !user.beta;
            });
            user = new User();
            user.beta = true;
            return user.deleteProfile();
          },
          'should not increment the counter of production users leaving the service': function() {
            return assert.isFalse(this.increment_spy.calledWith('leaving.users'));
          }
        }
      },
      'getting list of friends': {
        topic: function() {
          var instrument, times, user;
          this.timing_spy = sinon.spy();
          instrument = new StatsDInstrumentation({
            timing: this.timing_spy
          });
          instrument.measure(User.prototype, 'friendsList', 'friends.fetching');
          times = [100, 99];
          Date.prototype.getTime = function() {
            return times.pop();
          };
          user = new User();
          return user.friendsList();
        },
        'should time the fetching to see if caching is needed': function() {
          return assert.isTrue(this.timing_spy.calledWith('friends.fetching', 100 - 99));
        }
      }
    }
  })["export"](module);
}).call(this);
