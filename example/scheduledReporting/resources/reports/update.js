var _     = require('lodash'),
    Bluebird  = require('bluebird'),
    Norbert   = require('./../../../../index'),
    Report  = require('../../models/report');

module.exports = Norbert.Resource.Update.factory(
  {
    payload: {
      organizationId: Norbert.Joi.number().integer().required(),
      frequency: Norbert.Joi.number().integer(),
      foo: Norbert.Joi.object().required()
    }
  },

  function (request) {
    return Report.find(13)
    .bind(this)

    // Set the before data - Note: must clone object since its a reference
    .tap(function (report) {
      return this.setBeforeData(_.cloneDeep(report));
    })

    // Return saved shizzle dizzle
    .then(function (report) {
      return report.save({
        frequency: _.random(1, 125125)
      });
    });
  }
);