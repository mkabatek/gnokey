
// --- simple signup aggregator --- //
const PORT = 8673;

var port = process.env.PORT || PORT;
var express = require('express');
var cors = require('cors');
var app = express();
var bodyParser = require('body-parser');

// mysql connection
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : '127.0.0.1',
  user     : 'root',
  password : 'root',
  database : 'simplepass_db'
});
connection.connect();

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// cors
// TODO whitelist other endpoints?
app.use(cors({
  origin: ['https://michaelharrisonroth.github.io']
}));

// signup route
app.post('/signup', (req, res) => {

  // save to DB
  connection.query('INSERT IGNORE INTO `signups` SET ?', req.body, function(e, r){
      console.log(e, r);
  });

  // done
  return res.status(200).end();
});

// setup ssl with letsencrypt
require('letsencrypt-express').create({
  server: 'staging',
  email: 'hi@michaelharrisonroth.com',
  agreeTos: true,
  approveDomains: ['simplepass.michaelharrisonroth.com'],
  app: app
}).listen(8083, port);

console.log('HTTP Listening on port', port);
