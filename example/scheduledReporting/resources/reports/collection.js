var Norbert   = require('./../../../../index'),
    Report  = require('../../models/report');

module.exports = Norbert.Collection.factory(
  {
    defaultLimit: 20
  },

  function handler (request) {
    return Report.all(request.params.reportId);
  }
);