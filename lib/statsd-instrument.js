(function() {
  var Instrumentation, StatsD;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  StatsD = require('node-statsd').StatsD;
  Instrumentation = (function() {
    function Instrumentation(client) {
      this.client = client;
    }
    Instrumentation.prototype.instrument_count = function(obj, method_name, counter, cb) {
      var client, org;
      client = this.client;
      org = obj[method_name];
      obj[method_name] = function() {
        var always_count, counter_name, return_value, truthiness, _ref;
        return_value = false;
        truthiness = false;
        try {
          return_value = org.apply(this, arguments);
          truthiness = cb != null ? cb(this) : return_value;
        } catch (error) {
          truthiness = false;
        }
        _ref = counter(truthiness), counter_name = _ref[0], always_count = _ref[1];
        if (truthiness || always_count) {
          client.increment(counter_name);
        }
        return return_value;
      };
      return obj;
    };
    Instrumentation.prototype.count = function(obj, method_name, counter_name) {
      return this.instrument_count(obj, method_name, (function() {
        return [counter_name, true];
      }));
    };
    Instrumentation.prototype.count_if = function(obj, method_name, counter_name, cb) {
      return this.instrument_count(obj, method_name, (function() {
        return [counter_name, false];
      }), cb);
    };
    Instrumentation.prototype.count_success = function(obj, method_name, counter_name, cb) {
      var counter_generator;
      counter_generator = function(truthiness) {
        counter_name += truthiness ? '.success' : '.failure';
        return [counter_name, true];
      };
      return this.instrument_count(obj, method_name, counter_generator, cb);
    };
    Instrumentation.prototype.measure = function(obj, method_name, counter_name) {
      var org;
      org = obj[method_name];
      obj[method_name] = __bind(function() {
        var end, return_value, start;
        start = (new Date).getTime();
        return_value = org.apply(this, arguments);
        end = (new Date).getTime();
        this.client.timing(counter_name, end - start);
        return return_value;
      }, this);
      return obj;
    };
    return Instrumentation;
  })();
  exports.StatsDInstrumentation = Instrumentation;
  exports.StatsD = StatsD;
}).call(this);
