vows = require('vows')
sinon = require('sinon')
assert = require('assert')
StatsDInstrumentation = require('../../lib/statsd-instrument').StatsDInstrumentation

class User
  
  login: (password) ->
    password == 'correct-password'

  logout: (session_id) ->
    session_id == 'valid-session_id'

  forgotPassword: (email) ->
    /@/.test(email)

  visit: ->
    true
    
  deleteProfile: ->
    true

  friendsList: ->
    true
    
  changePassword: (existing_password, new_password) ->
    throw new Error('wrong existing password') if existing_password != 'correct-password'
    true

  uploadProfilePicture : (image_path) ->
    throw new Error('unsupported image format') if not /\.png$/.test(image_path)
    true

vows.describe('Instrumentation')
  .addBatch( 
            'Given a User' :
              'visting the site':
                  topic: ->
                    @increment_spy = sinon.spy()
                    instrument = new StatsDInstrumentation({ increment: @increment_spy })
                    instrument.count(User.prototype, 'visit', 'user.visits')
                    user = new User()
                    user.visit()
                  'should increment StatsD users visits counter' : ->
                    assert.isTrue @increment_spy.calledWith('user.visits')
              'trying to login' :
                'and providing a wrong password' :
                  topic: ->
                    @increment_spy = sinon.spy()
                    instrument = new StatsDInstrumentation({ increment: @increment_spy })
                    instrument.count_success(User.prototype, 'login', 'login')
                    user = new User
                    user.login 'correct-password'
                  'should increment StatsD login *success* counter' : ->                 
                    assert.isTrue @increment_spy.calledWith('login'+'.'+'success')
              'trying to logout' :
                'and not providing a valid session id to logout from' : 
                  topic: ->
                    @increment_spy = sinon.spy()
                    instrument = new StatsDInstrumentation({ increment: @increment_spy })
                    instrument.count_success(User.prototype, 'logout', 'logout')
                    user = new User
                    user.logout 'invalid-session_id'
                  'should increment StatsD logout *failure* counter' : ->
                    assert.isTrue @increment_spy.calledWith('logout'+'.'+'failure')
              'trying to change his password' :
                'without providing his correct existing password' :
                  topic: ->
                      @increment_spy = sinon.spy()
                      instrument = new StatsDInstrumentation({ increment: @increment_spy })
                      instrument.count_success(User.prototype, 'changePassword', 'password.change')
                      user = new User
                      user.changePassword 'incorrect_password', 'some_new_password'
                  'should increment StatsD password change *failure* counter' : ->
                      assert.isTrue @increment_spy.calledWith('password.change'+'.'+'failure')
              'trying to change upload profile picture' :
                'but provides an unsupported image format' :
                  topic: ->
                      @increment_spy = sinon.spy()
                      instrument = new StatsDInstrumentation({ increment: @increment_spy })
                      instrument.count_if(User.prototype, 'uploadProfilePicture', 'uploaded.pictures')
                      user = new User
                      user.uploadProfilePicture 'some_picture.invld'
                  'should not increment StatsD uploaded profile pictures counter' : ->
                      assert.isTrue not @increment_spy.calledWith('uploaded.pictures')      
              'notifying the system of forgetting his password' :
                'and not providing a valid email' :
                  topic: ->
                    @increment_spy = sinon.spy()
                    instrument = new StatsDInstrumentation({ increment: @increment_spy })
                    instrument.count_if(User.prototype, 'forgotPassword', 'forgotten.passwords')
                    user = new User()
                    user.forgotPassword('invalid_email')
                  'should not increment StatsD password forgotten counter' : ->
                    assert.isFalse @increment_spy.calledWith('forgotten.passwords')
              'trying to delete the user profile' :
                'given the user has been an internal beta user' :
                  topic: ->
                    @increment_spy = sinon.spy()
                    instrument = new StatsDInstrumentation({ increment: @increment_spy })
                    instrument.count_if(User.prototype, 'deleteProfile', 'leaving.users', (user) -> !user.beta)
                    user = new User()
                    user.beta = true
                    user.deleteProfile()
                  'should not increment the counter of production users leaving the service' : ->
                      assert.isFalse @increment_spy.calledWith('leaving.users')
              'getting list of friends' :
                  topic: ->
                    @timing_spy = sinon.spy()
                    instrument = new StatsDInstrumentation({ timing: @timing_spy })
                    instrument.measure(User.prototype, 'friendsList', 'friends.fetching')
                    times = [100, 99]
                    Date.prototype.getTime = -> times.pop()
                    user = new User()
                    user.friendsList()
                  'should time the fetching to see if caching is needed' : ->
                      assert.isTrue @timing_spy.calledWith('friends.fetching', 100-99)
                    
 ).export module