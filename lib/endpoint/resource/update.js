'use strict';

module.exports = require('../resource').extend({
  defaultOptions: {
    allowShortcut: false
  },

  // Before data exists for audit logging purposes
  beforeData: false,

  setBeforeData: function (result) {
    this.beforeData = result;

    return this;
  },

  getBeforeData: function () {
    return this.beforeData;
  }
}, {
  method: 'PUT'
});
