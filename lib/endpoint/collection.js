'use strict';

var _ = require('lodash'),
  Joi = require('joi'),
  Resource = require('./resource');

module.exports = Resource.extend({
  constructor: function () {
    this.constructor.__super__.constructor.apply(this, arguments);

    // If the endpoint doesn't specifiy a default limit, use the global
    if (!_.has(this.options, 'defaultLimit')) {
      this.options.defaultLimit = this.constructor.defaultLimit;
    }

    return this;
  },

  configure: function () {
    return _.merge(
      {
        validate: {
          query: {
            page: Joi.number().integer().default(1),
            limit: Joi.number().integer().default(this.options.defaultLimit),
            where: Joi.object()
          }
        }
      },
      Resource.prototype.configure.call(this)
    );
  }
}, {
  type: Resource.TYPE_COLLECTION,

  method: 'GET',

  defaultLimit: 200,

  // Default formatter builds collection/limit meta and data
  resultFormatter: function (collection, request, results) {
    results = results || [];

    if (!_.isArray(results)) {
      throw new TypeError('Results must be an array');
    }

    return {
      limit: request.query.limit,
      page: request.query.page,
      count: results.length,
      data: _.map(results, function (r) {
        return Resource.resultFormatter(collection, request, r);
      })
    };
  }
});
