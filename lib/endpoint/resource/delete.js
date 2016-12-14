'use strict';

var _ = require('lodash');

module.exports = require('../resource').extend({
  defaultOptions: {
    allowShortcut: false
  }
}, {
  method: 'DELETE',

  statusCode: 204,

  resultFormatter: function (resource, request, result) {
    if (
      !_.isUndefined(result)
      && !_.isNull(result)
      && _.isFunction(result.toEndpoint)
    ) {
      return result.toEndpoint();
    }

    return result;
  }
});
