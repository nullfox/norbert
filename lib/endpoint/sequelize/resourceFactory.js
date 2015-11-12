'use strict';

var _ = require('lodash'),
  util = require('util'),
  Joi = require('joi'),
  Resource = require('../resource');

var getPrimaryKey = function (model) {
  return _.detect(model.attributes, 'primaryKey', true).field;
};

var paramifyKey = function (param) {
  return util.format('%sId', param[0].toLowerCase() + param.slice(1));
};

var buildWhereResourceClause = function (model, request, options) {
  options = options || {};

  var where = {};

  // Figure out our where clause
  if (_.has(options, 'whereResource')) {
    where = options.whereResource;
  } else {
    var modelPrimaryKey = paramifyKey(model.name);

    // If the param is in non-falsey in the params hash, that's a key that exists
    var param = _.get(request, util.format('params.%s', modelPrimaryKey), false);

    // Create the where clause out of it for the primaryKey
    if (param) {
      where[getPrimaryKey(model)] = modelPrimaryKey;
    }

    // If there's a parent resource, push it real good
    if (_.has(options, 'parentResource')) {
      var parentResourceKey = paramifyKey(options.parentResource);

      where[parentResourceKey] = parentResourceKey;
    }
  }

  return where;
};

var buildWhereCollectionClause = function (model, request, options) {
  options = options || {};

  var where = {};

  if (_.has(options, 'whereCollection')) {
    where = options.whereCollection;
  } else if (_.has(options, 'parentResource')) {
    var parentResourceKey = paramifyKey(options.parentResource);

    where[parentResourceKey] = request.params[parentResourceKey];
  }

  var ops = {
    eq: '$eq',
    neq: '$ne',
    gt: '$gt',
    gte: '$gte',
    lt: '$lt',
    lte: '$lte'
  };

  if (_.has(request, 'query') && _.has(request.query, 'where')) {
    _.each(request.query.where, function (val, key) {
      if (!_.isPlainObject(val)) {
        val = { eq: val };
      }

      var clause = {};
      clause[key] = _.object(_.map(Object.keys(val), function (op) {
        if (val[op] === 'null') {
          val[op] = null;
        }

        return [ops[op], val[op]];
      }));

      where = _.merge(
        where,
        clause
      );
    });
  }

  return where;
};

var ResourceFactory = function (model) {
  this.model = model;
};

ResourceFactory.prototype.create = function (options) {
  options = options || {};

  var model = this.model;

  if (_.has(model, 'validation') && !_.has(options, 'payload')) {
    options.payload = model.validation(Joi);
  }

  return {
    options: options,
    callback: function (request) {
      // If we have a parent resource, push its param into payload params for create/update
      if (_.has(options, 'parentResource')) {
        options.payloadParams = (options.payloadParams || []).concat(options.parentResource);
      }

      // Build our payload with payloadParams
      var payload = _.merge(
        request.payload,
        _.pick(request.params, _.get(options, 'payloadParams'), [])
      );

      // Create and return the instance
      return model.create(payload)
        .bind(this)
        .catch(function (err) {
          // Trap conflicts and bubble up as 409
          if (err.name === 'SequelizeUniqueConstraintError') {
            throw this.error.conflict(util.format(
              'A %s already exists with the supplied information', model.name.toLowerCase()
            ));
          }

          throw err;
        });
    }
  }
};

ResourceFactory.prototype.read = function (options) {
  options = options || {};

  var model = this.model;

  return {
    options: options,
    callback: function (request) {
      // Build up our wear clause into a hash
      var clause = _.object(_.map(
        buildWhereResourceClause(model, request, options),
        function (paramKey, modelKey) {
          return [modelKey, request.params[paramKey]];
        }
      ));

      // Return it easy peasy
      return model.findOne({
        where: clause
      });
    }
  }
};

ResourceFactory.prototype.update = function (options) {
  options = options || {};

  var model = this.model;

  if (_.has(model, 'validation') && !_.has(options, 'payload')) {
    options.payload = model.validation(Joi);

    var primaryKey = getPrimaryKey(model);

    // If the payload validation doesn't include the PK, add it in
    if (!_.has(options.payload, primaryKey)) {
      options.payload[primaryKey] = Joi.number().integer().required();
    }
  }

  return {
    options: options,
    callback: function (request) {
      var builtClause = buildWhereResourceClause(model, request, options);

      // Build up our wear clause into a hash
      var clause = _.object(_.map(
        builtClause,
        function (paramKey, modelKey) {
          return [modelKey, request.params[paramKey]];
        }
      ));

      // If we have a parent resource, push its param into payload params for create/update
      if (_.has(options, 'parentResource')) {
        options.payloadParams = (options.payloadParams || []).concat(options.parentResource);
      }

      // Build our payload with payloadParams
      var payload = _.merge(
        request.payload,
        _.pick(request.params, _.get(options, 'payloadParams'), [])
      );

      // Blow up if it url params and payload params dont match
      _.each(builtClause, function (paramKey, modelKey) {
        if (request.params[paramKey] != payload[modelKey]) {
          throw this.error.badRequest('One or more payload values do not match the requested resource');
        }
      }.bind(this));

      // Find an instance then update and return it
      return model.findOne({
        where: clause
      })
      .then(function (instance) {
        return instance.update(payload);
      });
    }
  }
};

ResourceFactory.prototype.delete = function (options) {
  options = options || {};

  var model = this.model;

  return {
    options: options,
    callback: function (request) {
      // Build up our wear clause into a hash
      var clause = _.object(_.map(
        buildWhereResourceClause(model, request, options),
        function (paramKey, modelKey) {
          return [modelKey, request.params[paramKey]];
        }
      ));

      // Find an instance, delete if it exists
      return model.findOne({
        where: clause
      })
      .bind(this)
      .tap(function (instance) {
        if (!instance) {
          throw this.error.notFound();
        }
      })
      .then(function (instance) {
        return instance.destroy();
      });
    }
  }
};

ResourceFactory.prototype.collection = function (options) {
  options = options || {};

  var model = this.model;

  return {
    options: options,
    callback: function (request) {
      // Build up our wear clause into a hash
      var clause = buildWhereCollectionClause(model, request, options);

      var sorting = [];

      if (model.sorting) {
        sorting.push(model.sorting());
      }

      if (model.attributes && model.attributes.createdAt) {
        sorting.push([model.attributes.createdAt.field, 'ASC']);
      }

      // Return all based on paging
      return model.findAll({
        where: clause,
        limit: request.query.limit,
        offset: (request.query.page - 1) * request.query.limit,
        order: sorting
      });
    }
  }
};

module.exports = ResourceFactory;