var fs    = require('fs'),
    path  = require('path'),
    _     = require('lodash');

module.exports = _.chain(fs.readdirSync(__dirname))
.without('index.js')
.map(function (f) {
  return require(path.join(__dirname, f));
})
.value();