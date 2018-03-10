'use strict';

exports.TRADE_MAIN_COIN = "Marycoin";
exports.TRADE_COMISSION = 0.001;

exports.recaptcha_pub_key = "6LeX5SQUAAAAAKTieM68Sz4MECO6kJXsSR7_sGP1";

exports.NOREPLY_EMAIL = 'no-reply@multicoins.org';
exports.SUPPORT_EMAIL = 'ivanivanovkzv@gmail.com';

exports.SESSION_TIME = 3600*1000; //one hour

exports.my_port = process.env.PORT || 40080;
exports.my_portSSL = 40443;

exports.dbName = './database/sqlite.db';

exports.DONATORS = [
    {userID: 1, percent: 9},
    {userID: 58, percent: 10},
    {userID: 22, percent: 10},
    {userID: 10, percent: 25},
    {userID: 14, percent: 45}
];


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
          ['userID', 'TEXT'],
          ['coin', 'TEXT'],
          ['balance', 'TEXT'],
          ['history', 'TEXT'],
          ['info', 'TEXT']
        ],
        'commands' : 'FOREIGN KEY(coin) REFERENCES coins(name)'
   },
   {
      'name' : 'orders',
      'cols' : [
          ['userID', 'TEXT'],
          ['coin', 'TEXT'],
          ['buysell', 'TEXT'],
          ['amount', 'TEXT'],
          ['price', 'TEXT'],
          ['price_pair', 'TEXT'],
          ['time', 'TEXT'],
          ['info', 'TEXT']
        ],
        'commands' : 'FOREIGN KEY(coin) REFERENCES coins(name)'
   },
   
   {
      'name' : 'history',
      'cols' : [
          ['buyUserID', 'TEXT'],
          ['sellUserID', 'TEXT'],
          ['coin', 'TEXT'],
          ['coin_pair', 'TEXT'],
          ['fromSellerToBuyer', 'TEXT'],
          ['fromBuyerToSeller', 'TEXT'],
          ['buyerChange', 'TEXT'],
          ['comission', 'TEXT'],
          ['time', 'TEXT'],
          ['buysell', 'TEXT'],
          ['price', 'TEXT'],
          ['info', 'TEXT']
        ],
        'commands' : 'FOREIGN KEY(coin, coin_pair) REFERENCES coins(name, name)'
   },
/*   {
       'name' : 'tx_journal',
       'cols' : [
           ['from_to', 'TEXT UNIQUE PRIMARY KEY'],
           ['amount', 'TEXT'],
           ['status', 'TEXT'],
           ['comment', 'TEXT']
        ]
   }*/
];

exports.dbIndexes = [
  {
    'name' : 'uid',
    'table' : 'balance',
    'fields' : 'userID'
  },
  {
    'name' : 'uid_orders',
    'table' : 'orders',
    'fields' : 'userID, coin, buysell, amount, price'
  },
  {
    'name' : 'history_index',
    'table' : 'history',
    'fields' : 'buyUserID, sellUserID, coin, coin_pair, time'
  },
];


exports.DEBUG_MODE = process.env.PORT ? true : false;
exports.WEB_SOCKETS = null;
exports.ExchangeBalanceAccountID = 0;

////////////////////////////////////////////////////////////////////////////////////
// Private constants
const PRIVATE = require("./modules/private_constants");
exports.password_private_suffix = PRIVATE.password_private_suffix;
exports.recaptcha_priv_key = PRIVATE.recaptcha_priv_key;

exports.walletpassphrase = function (ticker)
{
    return PRIVATE.walletspassphrase[ticker] || "";
}

exports.SSL_options = {
    key: require("fs").readFileSync(PRIVATE.SSL_KEY),
    cert: require("fs").readFileSync(PRIVATE.SSL_CERT)
};

////////////////////////////////////////////////////////////////////////////////////