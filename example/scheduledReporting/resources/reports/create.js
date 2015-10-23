var Bluebird  = require('bluebird'),
  Norbert   = require('./../../../../index'),
  Report  = require('../../models/report');

module.exports = Norbert.Resource.Create.factory(
  {
    payload: {
      organizationId: Norbert.Joi.number().integer().required(),
      frequency: Norbert.Joi.number().integer()
    }
  },

  function (request) {
    return Report.factory({
      organizationId: request.payload.organizationId,
      frequency: request.payload.frequency
    }).save();
  }
);