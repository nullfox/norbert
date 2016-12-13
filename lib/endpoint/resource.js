'use strict';

var util = require('util'),
  _ = require('lodash'),
  Bluebird = require('bluebird'),
  Bunyan = require('bunyan'),
  UUID = require('node-uuid');

var Resource = function () {
  var args = Array.prototype.slice.call(arguments);

  // Resource default options
  this.defaultOptions = {};

  // Resource can be created a few different ways
  // Just a callback ex: factory(function () {})
  // Options and callback ex: factory({ statusCode: 204 }, function () {})
  this.options = _.merge(
    _.cloneDeep(this.defaultOptions),
    _.isPlainObject(_.first(args))
      ? _.first(args)
      : {}
  );

  // Store our supplied callback
  this.callback = _.last(args);

  // Child logger
  this.logger = this.constructor.logger.child({
    requestId: UUID.v4()
  });

  return this;
};

/*
* STATIC
*/

// Statics so we can easily detect what type of endpoint we are
Resource.TYPE_COLLECTION = 'collection';
Resource.TYPE_RESOURCE = 'resource';

// Fluid instance creation
Resource.factory = function () {
  return this.apply(Object.create(this.prototype), arguments);
};

// Allows for Backbone-esque class extension
Resource.extend = require('class-extend').extend;

// Put boom on the static too, why not!
Resource.boom = require('boom');

// Default status code
Resource.statusCode = 200;

// Defines whether this is an actual single resource or collection
Resource.type = Resource.TYPE_RESOURCE;

// Default logger
Resource.logger = Bunyan.createLogger({
  name: 'Norbert'
});

// Default result formatter calls toEndpoint if it exists
Resource.resultFormatter = function (resource, result) {
  if (_.isFunction(result.toEndpoint)) {
    return result.toEndpoint();
  }

  return result;
};

/*
* PROTOTYPE
*/

// boom to the proto for easy error handling ex: return this.boom.badRequest()
var errors = _.object(Object.keys(Resource.boom).map(function (method) {
  return [
    method,
    function () {
      var args = arguments;

      console.log('%s error triggered:', method, args);

      // Return instance of our boom error
      return Resource.boom[method].apply(this, args);
    }
  ];
}));

Resource.prototype.error = errors;

// Executor for internal callback and transform pipeline
Resource.prototype.execute = function (request) {
  // Boom based errors pass through and don't get caught, lets stop that
  var verifyNotError = function (result) {
    if (result instanceof Error) {
      if (!_.has(result, 'isBoom') || !result.isBoom) {
        result = Resource.boom.wrap(result);
      }

      throw result;
    }

    return result;
  };

  // Create the chain
  return Bluebird

    // Push in the request and bind to the current context
    .resolve(request).bind(this)

    // Run beforeHandler callback
    .then(this.beforeHandler)

    // Call the actual handler and verify its not boom-able
    .then(this.callback).tap(verifyNotError)

    // Call afterHandler callback
    .tap(function (result) {
      return verifyNotError(this.afterHandler(result));
    })

    // Format the result
    .then(function (result) {
      return this.resolvedResultFormatter()(this, request, result);
    })

    // One last boom-check
    .tap(verifyNotError);
};

// Handler supplied to Hapi
Resource.prototype.handler = function (request, reply) {
  // Create the chain
  return Bluebird

    .resolve(request).bind(this)

    // Call execute which fires the callback
    .then(this.execute)

    // Responders
    .then(function respondWithResult(result) {
      reply(result).code(this.resolvedStatusCode());
    })
    .catch(function respondWithError(error) {
      if (!_.has(error, 'isBoom') || !error.isBoom) {
        error = Resource.boom.wrap(error);
      }

      Resource.logger.error(error);

      reply(error);
    });
};

// Config method supplied to Hapi
Resource.prototype.config = function () {
  return this.configure();
};

// Internal configure method to be implemented/overriden by subclasses
Resource.prototype.configure = function () {
  var options = this.options;

  var config = {
    validate: {}
  };

  [
    'query',
    'params',
    'payload',
  ].forEach(function (t) {
    if (_.has(options, t)) {
      config.validate[t] = options[t];
    }
  });

  [
    'auth'
  ].forEach(function (t) {
    if (_.has(options, t)) {
      config[t] = options[t];
    }
  });

  return config;
};

// No-op beforeHandler to be implemented by subclasses
Resource.prototype.beforeHandler = function () {
  return;
};

// No-op afterHandler to be implemented by subclasses
Resource.prototype.afterHandler = function () {
  return;
};

// Resolved result formatter
Resource.prototype.resolvedResultFormatter = function () {
  return _.has(this.options, 'resultFormatter')
    ? this.options.resultFormatter
    : this.constructor.resultFormatter;
};

// Resolved status code
Resource.prototype.resolvedStatusCode = function () {
  return _.has(this.options, 'statusCode')
    ? this.options.statusCode
    : this.constructor.statusCode;
};

module.exports = Resource;
