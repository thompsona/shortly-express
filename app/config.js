var Bookshelf = require('bookshelf');
var path = require('path');

var db = Bookshelf.initialize({
  client: 'sqlite3',
  connection: {
    host: '127.0.0.1',
    user: 'your_database_user',
    password: 'password',
    database: 'shortlydb',
    charset: 'utf8',
    filename: path.join(__dirname, '../db/shortly.sqlite')
  }
});

db.knex.schema.hasTable('urls').then(function(exists) {
  if (!exists) {
    db.knex.schema.createTable('urls', function (link) {
      link.increments('id').primary();
      link.string('url', 255);
      link.string('base_url', 255);
      link.string('code', 100);
      link.string('title', 255);
      link.integer('visits');
      link.integer('user_id');
      link.timestamps();
    }).then(function (table) {
      console.log('Created Table', table);
    });
  }
});

db.knex.schema.hasTable('clicks').then(function(exists) {
  if (!exists) {
    db.knex.schema.createTable('clicks', function (click) {
      click.increments('id').primary();
      click.integer('link_id');
      click.timestamps();
    }).then(function (table) {
      console.log('Created Table', table);
    });
  }
});

/************************************************************/
// Add additional schema definitions below
/************************************************************/

db.knex.schema.hasTable('users').then(function(exists) {
  console.log("making users schema");
  if (!exists) {
    console.log("users schema didn't exist");
    db.knex.schema.createTable('users', function (user) {
      user.increments('id').primary();
      user.string('username');
      user.string('password');
      user.timestamps();
    }).then(function (table) {
      console.log('Created Table', table);
    });
  }
});

db.knex.schema.hasTable('sessions').then(function(exists) {
  console.log("making sessions schema");
  if (!exists) {
    console.log("sessions schema didn't exist");
    db.knex.schema.createTable('sessions', function (session) {
      session.increments('id').primary();
      session.integer('user_id');
      session.string('token');
      session.string('expiration_date');
    }).then(function (table) {
      console.log('Created Table', table);
    });
  }
});

db.knex.schema.hasTable('links_users').then(function(exists) {
  console.log("making links users schema");
  if (!exists) {
    console.log("links users schema didn't exist");
    db.knex.schema.createTable('links_users', function (user) {
      user.increments('id').primary();
      user.integer('user_id');
      user.integer('link_id');
      user.timestamps();
    }).then(function (table) {
      console.log('Created Table', table);
    });
  }
});

module.exports = db;
