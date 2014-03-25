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
  // app.use(express.cookieSession());
});

var setCookie = function(res){
  res.cookie('A','B');
}

var cookieExists = function(req){
  console.log('Cookie Exists: ', req.cookies);
  return req.cookies.hasOwnProperty('A') && req.cookies.A === 'B'
}

app.get('/', function(req, res) {
  if (cookieExists(req)){
    res.render('index');
  } else {
    res.redirect('/login');
  }
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/logout', function(req, res) {
  console.log('Logged out');
  res.clearCookie('A');
  res.redirect('/login');
});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.get('/create', function(req, res) {
  res.render('index');
});

app.get('/links', function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  })
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.post('/login', function(req, res) {

  var key = 'salt_from_the_user_document';
  var cipher = crypto.createCipher('aes-256-cbc', key);

  cipher.update(req.body.password, 'utf8', 'base64');
  var encryptedPassword = cipher.final('base64');

  console.log(req.body);
  db.knex('users')
    .where('username', '=', req.body.username)
    .andWhere('password', '=', encryptedPassword)
    .exec(function(err, users) {
      if (users.length >= 1){
        setCookie(res);
        return res.redirect('/');
      } else {
        return res.redirect('/login');
      }
    });
});

app.post('/signup', function(req, res) {

  var key = 'salt_from_the_user_document';
  var cipher = crypto.createCipher('aes-256-cbc', key);

  cipher.update(req.body.password, 'utf8', 'base64');
  var encryptedPassword = cipher.final('base64');

  console.log('encrypted :', encryptedPassword);

  db.knex('users')
    .insert({
      username: req.body.username,
      password: encryptedPassword
    }).then(function() {
      console.log("inserted username: ", JSON.stringify(req.body.username), " and password: ", encryptedPassword);
      return res.redirect('/');
    });
  res.redirect('/');
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
