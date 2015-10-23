'use strict';

var Resource = require('../resource');

module.exports = Resource.extend({
}, {
  type: Resource.TYPE_COLLECTION,

  method: 'POST',

  statusCode: 201
});
