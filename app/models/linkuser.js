var db = require('../config');
var Click = require('./click');
var crypto = require('crypto');

var LinkUser = db.Model.extend({
  tableName: 'links_users',
  hasTimestamps: true,
});

module.exports = Link;
