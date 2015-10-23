var _ = require('lodash'),
    Bluebird = require('bluebird');

var Report = function Report (data) {
  this.data = data;

  if (!_.has(this.data, 'id')) {
    this.data.id = _.random(1, 1000000);
  }

  return this;
};

Report.attributes = {
  id: {
    field: 'id',
    primaryKey: true
  }
};

Report.validation = function(Joi) {
  return {
    organizationId: Joi.number().integer().required(),
    frequency: Joi.number().integer().required()
  };
};

Report.factory = function () {
  return this.apply(Object.create(this.prototype), arguments);
};

Report.find = function () {
  return Bluebird.resolve(this.factory({
    id: 13,
    organizationId: 2,
    frequency: 86400
  }));
};

Report.findOne = function (options) {
  return this.findAll()
    .then(function (reports) {
      var where = _.object(_.map(options.where, function (value, key) { return [key, parseInt(value, 10)] }));

      return _.detect(reports, function (report) {
        return _.eq(_.omit(report.data, 'frequency'), where);
      });
    });
};

Report.all = Report.findAll = function () {
  return Bluebird.resolve([
  this.factory({
    id: 13,
    organizationId: 2,
    frequency: 86400
  }),
  this.factory({
    id: 125152,
    organizationId: 510553,
    frequency: 86400
  })
  ]);
};

Report.prototype.save = Report.prototype.update = function(data) {
  this.data = _.merge(this.data, data);

  return Bluebird.resolve(this);
};

Report.prototype.toEndpoint = function() {
  return this.data;
};

module.exports = Report;