'use strict';

module.exports = require('./update').extend({
  beforeHandler: function () {
    if (request.payload.operations) {
      request.payload = request.payload.operations;
    }

    return request;
  }
}, {
  method: 'PATCH'
});
