var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var crypto = require('crypto');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(partials());
  app.use(express.bodyParser());
  app.use(express.static(__dirname + '/public'));
  app.use(express.cookieParser('secret string!'));
});

app.get('/', function(req, res) {
  cookieExists(req, function(exists) {
    if(exists) {
      console.log("RENDERING INDEX");
      res.render('index');
    } else {
      console.log("COOKIE CHECK FAILED");
      res.redirect('/login');
    }
  })
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/logout', function(req, res) {
  console.log('Logged out');
  res.clearCookie('token');
  res.clearCookie('user');
  res.redirect('/login');
});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.get('/create', function(req, res) {
  res.render('index');
});

app.get('/links', function(req, res) {
  // db.knex('user_link')
  // .join('urls', 'urls.id', '=', 'user_link.link_id')
  // .join('users', 'users.id', '=', 'user_link.user_id')
  // // .where('users.username', '=', req.cookies.user)
  // .select()
  // .then(function(res){
  //   console.log("/links RESPONSE: ", res, req.cookies.user);
  // });
  db.knex('users')
    .where('username', '=', req.cookies.user)
    .select('id')
    .then(function(uid) {
      Links.reset();
      Links.query('where', 'user_id', '=', uid[0].id).fetch().then(function(resp) {
        res.send(200, resp);
      });
    });
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }
  // , username: req.cookies.user 
  new Link({ url: uri}).fetch().then(function(found) {
    if (found) {
      console.log("LINK FOUND ATTRIBUTES: ", found.attributes);
      //new UserLink({link_id: found.attributes.id, user_id: }).fetch().then(function(found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }
        db.knex('users')
          .where('username', '=', req.cookies.user)
          .select('id')
          .then(function(uid) {
            var link = new Link({
              url: uri,
              title: title,
              base_url: req.headers.origin,
              user_id: uid[0].id
            });
            link.save().then(function(newLink) {
              Links.add(newLink);
              res.send(200, newLink);
            });

            // var user_link = new UserLink({
            //   user_id: uid[0].id,
            //   // link_id: ?????
            // });
          })
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
var setCookie = function(req, res){
  //save cookie to session table
  //should store cookie object and time expiration
  //first, hash together username, password, and time requested
  //set to cookie
  //get current time & add 10 minutes
  //set each to a new record
  var currentTime = Date.now();
  var expirationDate = currentTime + 600000;
  var token = crypto.createHash('sha1').update(req.body.username + "" + req.body.password + "" + currentTime).digest('hex').toString();
  db.knex('users')
    .where('username', '=', req.body.username)
    .select('id')
    .then(function(uid) {
      console.log("SELECTING IN setCookie: ", uid);
      db.knex('sessions')
      .insert({
        token: token,
        expiration_date: expirationDate,
        user_id: uid[0].id
      }).then(function() {
        console.log("inserted token");
        res.cookie('token', token);
        res.cookie('user', req.body.username);
        return res.redirect('/');
      });
    });
}

var cookieExists = function(req, callback){
  console.log('Cookie Exists: ', req.cookies);
  if(req.cookies.hasOwnProperty('token')) {
    db.knex('users')
      .where('username', '=', req.cookies.user)
      .select('id')
      .then(function(uid) {
        console.log("SELECTING IN cookieExists: ", uid);
        db.knex('sessions')
        .where('user_id', '=', uid[0].id)
        .andWhere('token', '=', req.cookies.token)
        .andWhere('expiration_date', '>', Date.now())
          .exec(function(err, sessions) {
          console.log("sessions: ", sessions);
          if (sessions.length >= 1){
            console.log("COOKIE EXISTS");
            callback(true);
          } else {
            console.log("NO COOKIE");
            callback(false);
          }
        });
      });
    } else {
      callback(false);
    }
}

app.post('/login', function(req, res) {

  var encryptedPassword = crypto.createHash('sha1').update(req.body.password).digest('hex').toString();
  console.log("encryptedPassword: ", encryptedPassword);
  console.log(req.body);
  db.knex('users')
    .where('username', '=', req.body.username)
    .andWhere('password', '=', encryptedPassword)
    .exec(function(err, users) {
      if (users.length >= 1){
        setCookie(req, res);
        console.log('-------');
      } else {
        return res.redirect('/login');
      }
    });
});

app.post('/signup', function(req, res) {

  var encryptedPassword = crypto.createHash('sha1').update(req.body.password).digest('hex').toString();

  console.log('encrypted :', encryptedPassword);

  db.knex('users')
    .insert({
      username: req.body.username,
      password: encryptedPassword
    }).then(function() {
      console.log("inserted username: ", JSON.stringify(req.body.username), " and password: ", encryptedPassword);
      return res.redirect('/');
    });
});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
