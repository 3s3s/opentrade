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
   {
      'name' : 'coins',
      'cols' : [
          ['name', 'TEXT UNIQUE PRIMARY KEY'],
          ['ticker', 'TEXT UNIQUE'],
          ['icon', 'TEXT'],
          ['address', 'TEXT'],
          ['rpc_user', 'TEXT'],
          ['rpc_password', 'TEXT'],
          ['info', 'TEXT']
        ]
   },
   {
      'name' : 'balance',
      'cols' : [
          ['userID', 'TEXT UNIQUE PRIMARY KEY'],
          ['coin', 'TEXT'],
          ['balance', 'TEXT'],
          ['history', 'TEXT'],
          ['info', 'TEXT']
        ],
        'commands' : 'FOREIGN KEY(coin) REFERENCES coins(name)'
   }
];

exports.dbIndexes = [
  {
    'name' : 'uid',
    'table' : 'balance',
    'fields' : 'userID'
  }
];


exports.DEBUG_MODE = process.env.PORT ? true : false;
exports.WEB_SOCKETS = null;
exports.ExchangeBalanceAccountID = 0;

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