'use strict';

exports.recaptcha_pub_key = "6LeX5SQUAAAAAKTieM68Sz4MECO6kJXsSR7_sGP1";

exports.NOREPLY_EMAIL = 'no-reply@multicoins.org';
exports.SUPPORT_EMAIL = 'ivanivanovkzv@gmail.com';

exports.SESSION_TIME = 3600*1000; //one hour

exports.my_port = process.env.PORT || 40080;
exports.my_portSSL = 40443;

exports.dbName = './database/sqlite.db';

exports.dbTables = [
   {
      'name' : 'KeyValue',
      'cols' : [
          ['key', 'TEXT UNIQUE PRIMARY KEY'],
          ['value', 'TEXT']
        ]
   },
   {
      'name' : 'users',
      'cols' : [
          ['login', 'TEXT UNIQUE'],
          ['email', 'TEXT UNIQUE'],
          ['password', 'TEXT'],
          ['info', 'TEXT']
        ],
        'commands' : 'PRIMARY KEY (login, email)'
   },
   {
      'name' : 'sessions',
      'cols' : [
          ['token', 'TEXT UNIQUE PRIMARY KEY'],
          ['time', 'TEXT'],
          ['userid', 'INTEGER']
        ]
   },
   {
      'name' : 'support',
      'cols' : [
          ['hash', 'TEXT UNIQUE PRIMARY KEY'],
          ['time', 'TEXT'],
          ['subject', 'TEXT'],
          ['email', 'TEXT'],
          ['message', 'TEXT'],
          ['state', 'TEXT']
        ]
   },
];

exports.DEBUG_MODE = process.env.PORT ? true : false;
exports.WEB_SOCKETS = null;

////////////////////////////////////////////////////////////////////////////////////
// Private constants
const PRIVATE = require("./modules/private_constants");
exports.password_private_suffix = PRIVATE.password_private_suffix;
exports.recaptcha_priv_key = PRIVATE.recaptcha_priv_key;

exports.SSL_options = {
    key: require("fs").readFileSync(PRIVATE.SSL_KEY),
    cert: require("fs").readFileSync(PRIVATE.SSL_CERT)
};

////////////////////////////////////////////////////////////////////////////////////