StatsD = require('node-statsd').StatsD

class Instrumentation
  
  constructor: (@client) ->

  instrument_count: (obj, method_name, counter, cb) ->
    client = @client
    org = obj[method_name]
    obj[method_name] = ->
      return_value = false
      truthiness = false
      try
        return_value = org.apply(this, arguments)
        truthiness = if cb? then cb(this) else return_value
      catch error
        truthiness = false
      [counter_name, always_count] = counter(truthiness)
      client.increment(counter_name) if truthiness or always_count
      return_value
    obj

    
  count: (obj, method_name, counter_name) ->
    @instrument_count(obj, method_name, (-> [counter_name, true]))
      
  count_if: (obj, method_name, counter_name, cb) ->
    @instrument_count(obj, method_name, (-> [counter_name, false]), cb)
      
  count_success: (obj, method_name, counter_name, cb) ->
    counter_generator = (truthiness) -> 
      counter_name += if truthiness then '.success' else '.failure'
      [counter_name, true]
    @instrument_count(obj, method_name, counter_generator , cb)
  
  measure: (obj, method_name, counter_name) ->
    org = obj[method_name]
    obj[method_name] = =>
      start = (new Date).getTime()
      return_value = org.apply(this, arguments)
      end = (new Date).getTime()
      @client.timing(counter_name, end - start)
      return_value
    obj

exports.StatsDInstrumentation = Instrumentation
exports.StatsD = StatsD