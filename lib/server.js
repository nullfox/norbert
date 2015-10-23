'use strict';

var util          = require('util'),
  _               = require('lodash'),
  Hapi            = require('hapi'),
  Bluebird        = require('bluebird'),
  Bunyan          = require('bunyan'),
  BaseResource    = require('./endpoint/resource'),
  ResourceFactory = {
    Sequelize: require('./endpoint/sequelize/resourceFactory')
  };

var endpoints = {
  Create: require('./endpoint/resource/create'),
  Read: require('./endpoint/resource/read'),
  Update: require('./endpoint/resource/update'),
  Delete: require('./endpoint/resource/delete'),
  Partial: require('./endpoint/resource/partial'),
  Collection: require('./endpoint/collection')
};

var resolvePath = function (resource, path) {
  var resolvedPath = path;

  if (resource.constructor.type == BaseResource.TYPE_COLLECTION) {
    resolvedPath = path.replace(/\/$/, '').split('/').slice(0, -1).join('/');
  } else if (resource.options.allowShortcut) {
    resolvedPath = path.replace(/\}$/, '?}');
  }

  return resolvedPath;
};

var Server = function (options, hapiOptions) {
  this.options = options || {};

  this.hapiOptions = hapiOptions || {
    port: 3000
  };

  // Hold server in instance var
  this.server = false;

  // Documentation plugin
  this.addPlugin('lout');

  // Process monitoring
  this.addPlugin('good', {
    opsInterval: 1000,
    responsePayload: _.get(this.options, 'verboseLogging', false),
    reporters: [{
      reporter: require('good-console'),
      config: {
        format: 'YYYY-MM-DDTHH:mm:ssZ'
      },
      events: {
        log: '*',
        response: '*'
      }
    }]
  });

  return this;
};

Server.factory = function () {
  return this.apply(Object.create(this.prototype), arguments);
};

Server.setLogger = function (logger) {
  BaseResource.logger = logger;

  return this;
};

Server.prototype.getServer = function () {
  if (!_.has(this, 'server') || !this.server) {
    this.server = new Hapi.Server();
    this.server.connection(this.hapiOptions);
  }

  return this.server;
};

Server.prototype.addPlugin = function (pluginName, options) {
  this.getServer().register({
    register: require(pluginName),
    options: options || {}
  }, function (err) {
    if (err) {
      throw err;
    }
  });

  return this;
};

Server.prototype.addAuthenticator = function (name, scheme, schemeName, options) {
  var server = this.getServer();

  server.register(scheme, function (err) {
    if (err) {
      throw err;
    }

    server.auth.strategy(name, schemeName, options);
  });
};

Server.prototype.addRoute = function (path, resource) {
  this.getServer().route({
    method: resource.constructor.method,
    path: path,
    handler: resource.handler.bind(resource),
    config: resource.config.call(resource)
  });

  return this;
};

Server.prototype.addResource = function (path, cluster, options) {
  options = options || {};

  var self = this;

  cluster.forEach(function (resource) {
    // Allow us to set defaults for an entire swath of resources
    // These will be overriden by options set on the endpoint
    resource.options = _.merge(_.cloneDeep(options), resource.options);
  
    self.addRoute(resolvePath(resource, path), resource);
  });

  return this;
};

Server.prototype.addSequelizeResource = function (path, model, options) {
  options = options || {};

  // Get filtered endpoints to generate for
  var types = _.omit(endpoints, function (endpoint, type) {
    var cleanType = type.toLowerCase();

    if (cleanType === 'partial' || !_.get(options, cleanType, true)) {
      return true;
    }

    return false;
  });

  // Get a new resource factory
  var factory = new ResourceFactory.Sequelize(model);

  // Build up cluster via ^^^ factory
  var cluster = _.values(_.omit(_.map(types, function (Endpoint, type) {
    // Generate the method to build an Endpoint out of
    var generated = factory[type.toLowerCase()](_.cloneDeep(options));

    return new Endpoint(generated.options, generated.callback);
  }), _.isEmpty));

  return this.addResource(path, cluster, options);
};

Server.prototype.inspect = function () {
  var server = this.getServer();

  var routingTable = server.table()[0].table;

  return {
    routes: routingTable.map(function (r) {
      return {
        method: r.method,
        path: r.path
      };
    }),

    plugins: Object.keys(server.plugins),

    info: server.info
  };
};

Server.prototype.start = function () {
  var server = this.getServer();

  return new Bluebird(function (resolve) {
    server.start(resolve);
  })
  .bind(this)
  .tap(function () {
    BaseResource.logger.info(this.inspect(), 'Started %s server', BaseResource.logger.fields.name);
  });
};

Server.Resource = _.omit(endpoints, 'Collection');
Server.Collection = endpoints.Collection;

module.exports = Server;
