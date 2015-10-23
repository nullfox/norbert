'use strict';

module.exports = require('./update').extend({
  beforeHandler: function () {
    if (this.request.payload.operations) {
      this.request.payload = this.request.payload.operations;
    }
  }
}, {
  method: 'PATCH'
});
