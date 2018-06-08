'use strict';

const SUPPORT_EMAIL = 'support@email.com';
const NOREPLY_EMAIL = 'no-reply@email.com';

const MAILER_NAME = 'OpenTrade Mailer';
const START_MESSAGE = 'OpenTrade started!';

const DashForks = ['DASH', 'WAVI'];

exports.DEBUG_LOG = true;

exports.share = {
   tradeEnabled: false,
   recaptchaEnabled: false,
   
   my_portSSL: 40443,
   
   TRADE_MAIN_COIN: "Marycoin",
   TRADE_MAIN_COIN_TICKER: "MC",
   TRADE_DEFAULT_PAIR: "Litecoin"
};

exports.TRADE_COMISSION = 0.001;

exports.my_port = process.env.PORT || 40080;

exports.SESSION_TIME = 3600*1000; //one hour

exports.recaptcha_pub_key = "6LeX5SQUAAAAAKTieM68Sz4MECO6kJXsSR7_sGP1";
const MAX_IP_CONNECTIONS = 100;

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
       'name' : 'chatban',
       'cols' : [
           ['userID', 'TEXT UNIQUE'],
           ['startBanTime', 'INTEGER'],
           ['endBanTime', 'INTEGER'],
           ['comment', 'TEXT']
        ],
        'commands' : 'PRIMARY KEY (userID)'
   },
   {
       'name' : 'apikeys',
       'cols' : [
           ['userid', 'INTEGER'],
           ['key', 'TEXT UNIQUE PRIMARY KEY'],
           ['read', 'INTEGER'],
           ['write', 'INTEGER'],
           ['withdraw', 'INTEGER'],
           ['info', 'TEXT']
        ]
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
          ['info', 'TEXT'],
          ['uuid', 'TEXT UNIQUE PRIMARY KEY']
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
   {
       'name' : 'referals',
       'cols' : [
           ['userFrom', 'TEXT'],
           ['pageFrom', 'TEXT'],
           ['IP', 'TEXT'],
           ['timeIn', 'TEXT'],
           ['timeReg', 'TEXT'],
           ['userRegID', 'TEXT UNIQUE'],
           ['history', 'TEXT'],
           ['uid', 'TEXT UNIQUE']
        ],
        'commands': 'PRIMARY KEY (userRegID, uid)'
   }
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

exports.Roles = ['Administrator', 'Support', 'User'];

exports.dbName = './database/sqlite.db';

////////////////////////////////////////////////////////////////////////////////////
// Private constants
const PRIVATE = require("./modules/private_constants");
exports.password_private_suffix = PRIVATE.password_private_suffix;
exports.recaptcha_priv_key = PRIVATE.recaptcha_priv_key;
exports.SUPPORT_EMAIL = PRIVATE.SUPPORT_EMAIL || SUPPORT_EMAIL;
exports.NOREPLY_EMAIL = PRIVATE.NOREPLY_EMAIL || NOREPLY_EMAIL;
exports.START_MESSAGE = PRIVATE.START_MESSAGE || START_MESSAGE;
exports.MAILER_NAME = PRIVATE.MAILER_NAME || MAILER_NAME;

exports.DONATORS = [
    {userID: 1, percent: 99},
];

if (PRIVATE.donators) exports.DONATORS = PRIVATE.donators;

exports.walletpassphrase = function (ticker)
{
    return PRIVATE.walletspassphrase[ticker] || "";
}

exports.SSL_options = {
    key: require("fs").readFileSync(PRIVATE.SSL_KEY),
    cert: require("fs").readFileSync(PRIVATE.SSL_CERT)
};

////////////////////////////////////////////////////////////////////////////////////

exports.IsDashFork = function(name)
{
    for (let i=0; i<DashForks.length; i++)
        if (name == DashForks[i])
            return true;
    return false;
}

let g_IP_connections = {};
exports.IsAllowedAddress = function(addr)
{
    if (PRIVATE.IsUnlimitedAddress && PRIVATE.IsUnlimitedAddress(addr))
        return true;
        
    if (!g_IP_connections[addr]) g_IP_connections[addr] = {n: 0};
    if (g_IP_connections[addr].n < 0) g_IP_connections[addr].n = 0;
    if (g_IP_connections[addr].n > MAX_IP_CONNECTIONS)
        return false;
    
    g_IP_connections[addr].n++;
    return true;
}
exports.ReleaseAddress = function(addr)
{
    if (PRIVATE.IsUnlimitedAddress && PRIVATE.IsUnlimitedAddress(addr))
        return;
        
    if (g_IP_connections[addr] && g_IP_connections[addr].n > 0) 
        g_IP_connections[addr].n--;
}