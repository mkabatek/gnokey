
// --- Gnokey signup aggregator / Subscription check --- //
var express = require('express');
var cors = require('cors');
var app = express();
var bodyParser = require('body-parser');
var path = require('path')

const PORT = 8081

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// static 
app.use('/', express.static(path.resolve(__dirname, '../public')))

// signup route
app.post('/signup', cors({
  origin: ['*']
}), (req, res) => {

  // save to DB
  // connection.query('INSERT IGNORE INTO `signups` SET ?', req.body, function(e, r){
  //     console.log(e, r);
  // });

  // done
  return res.status(200).end();
});

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`)
})