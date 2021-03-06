var _     = require('lodash'),
    Bluebird  = require('bluebird'),
    Norbert   = require('./../../../../index'),
    Report  = require('../../models/report');

module.exports = Norbert.Resource.Read.factory(
  {
    params: {
      reportId: Norbert.Joi.number().integer()
    }
  },

  function handler (request) {
    return Report.find();
  }
);