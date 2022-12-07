var mysql      = require('mysql');
require('dotenv').config()
const sqlConnectionParameters = {
  host     : process.env.SQL_HOST,
  database : process.env.SQL_DB,
  port	   : process.env.SQL_PORT,
  user     : process.env.SQL_USER,
  password : process.env.SQL_PASSWORD
};
let peekdex;
var connection = mysql.createConnection(sqlConnectionParameters);
connection.connect();
const loadPeekdex = () => {
  connection.query('SELECT * FROM peekdex;', function(err, rows, fields) {
    if (err) throw err;
    peekdex = rows;
  });
}
const getPeekdex = () => {

  return peekdex;
}
const getPeekmons = (userid, options={"shiny": null}) => {
  let returnValue = undefined;
  let optionList = "";
  if (options.shiny !== null) {
    optionList += "modifiers = " + String((options.shiny) ? 1 : 0) + " AND ";
  }
  connection.query('SELECT * FROM peekmons WHERE ' + optionList + 'trainer = ' + userid, function(err, rows, fields) {
    if (err) throw err;
    returnValue=JSON.parse(JSON.stringify(rows));
    //console.log(returnValue);
    return returnValue;
  });
}
loadPeekdex();
exports.getPeekmons = getPeekmons;
exports.getPeekdex = getPeekdex;
