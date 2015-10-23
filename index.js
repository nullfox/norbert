'use strict';

var Server = require('./lib/server');

module.exports = {
  Joi: require('joi'),
  Promise: require('bluebird'),

  Server: Server,

  // Native resource/collection
  Resource: Server.Resource,
  Collection: Server.Collection
};