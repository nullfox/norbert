'use strict';

module.exports = require('../resource').extend({
  defaultOptions: {
    allowShortcut: false
  },

  afterHandler: function (result) {
    if (!result) {
      throw this.error.notFound();
    }
  }
}, {
  method: 'GET'
});
