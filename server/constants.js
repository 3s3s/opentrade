'use strict';

exports.recaptcha_pub_key = "6LeX5SQUAAAAAKTieM68Sz4MECO6kJXsSR7_sGP1";

exports.NOREPLY_EMAIL = 'no-reply@multicoins.org';

exports.SESSION_TIME = 3600*1000; //one hour

exports.my_port = process.env.PORT || 40080;
exports.my_portSSL = 40443;

exports.dbName = './database/sqlite.db';

const SSL_cert = './server.crt';
const SSL_key = './server.key';

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
];

exports.DEBUG_MODE = process.env.PORT ? true : false;

exports.password_private_suffix = require("./modules/private_constants").password_private_suffix;
exports.recaptcha_priv_key = require("./modules/private_constants").recaptcha_priv_key;

exports.SSL_options = {
    key: require("fs").readFileSync(SSL_key),
    cert: require("fs").readFileSync(SSL_cert)
};
