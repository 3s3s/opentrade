'use strict';

const SUPPORT_EMAIL = 'support@email.com';
const NOREPLY_EMAIL = 'no-reply@email.com';
const DOMAIN = 'localhost';

const MAILER_NAME = 'OpenTrade Mailer';
const START_MESSAGE = 'OpenTrade started!';
const OPENTRADE = "OpenTrade";

exports.ACCOUNTS_SERVER = "127.0.0.1";
exports.ACCOUNTS_PORT = 40745;

exports.ALLOW_EMAIL_CHANGING = true;

exports.DEBUG_LOG = true;

exports.share = {
   tradeEnabled: true,
   withdrawEnabled: true,
   recaptchaEnabled: false,
   emailVerificationEnabled: 'enabled', //'disabled' // !!! WARNING !!! DANGER !!! DO NOT CHANGE IT IN PRODUCTION !!! FOR TESTS ONLY !!!
   pinVerificationEnabled: 'enabled', //'disabled'
   
   TRADE_COMISSION: 0.001, //change trade comission percent
   DUST_VOLUME: 0.000001, //change minimal order volume
   
   TRADE_MAIN_COIN: "Marycoin",
   TRADE_MAIN_COIN_TICKER: "MC",
   TRADE_DEFAULT_PAIR: "Litecoin"
};

exports.SESSION_TIME = 3600*1000; //one hour

exports.recaptcha_pub_key = "6LeX5SQUAAAAAKTieM68Sz4MECO6kJXsSR7_sGP1";
const MAX_IP_CONNECTIONS = 100;

const MAX_USER_WITHDRAW = 100; //Percentage from trade deposit

const DATABASE_PATH = '/root/opentrade/server/database/sqlite.db';
const PRIVATE_CONSTANTS_PATH = "./modules/private_constants";

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
   },
   {
       'name' : 'payments',
       'cols' : [
           ['userTo', 'INTEGER'],
           ['userFrom', 'INTEGER'],
           ['volume', 'TEXT'],
           ['coin', 'TEXT'],
           ['time', 'INTEGER'],
           ['comment', 'TEXT']
        ]
   },
   {
       'name' : 'coupons',
       'cols' : [
           ['uid', 'TEXT UNIQUE'],
           ['UserFrom', 'INTEGER'],
           ['timeCreated', 'INTEGER'],
           ['amount', 'TEXT'],
           ['coin', 'TEXT'],
           ['timeClosed', 'INTEGER'],
           ['UserTo', 'INTEGER'],
           ['comment', 'TEXT']
        ],
        'commands': 'PRIMARY KEY (uid)'
   },
   {
       'name' : 'balancelog',
       'cols' : [
           ['userID', 'TEXT'],
           ['coin', 'TEXT'],
           ['amount', 'TEXT'],
           ['time', 'INTEGER'],
           ['log', 'TEXT'],
        ],
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

const DashForks = ['DASH', 'WAVI'];

exports.DEBUG_MODE = process.env.PORT ? true : false;
exports.WEB_SOCKETS = null;
exports.ExchangeBalanceAccountID = 0;

exports.Roles = ['Administrator', 'Support', 'Chat-admin', 'User'];

////////////////////////////////////////////////////////////////////////////////////
// Private constants
const PRIVATE = require(require(PRIVATE_CONSTANTS_PATH).PRIVATE_PATH || PRIVATE_CONSTANTS_PATH);
exports.dbName = PRIVATE.DATABASE_PATH || DATABASE_PATH;
exports.password_private_suffix = PRIVATE.password_private_suffix;
exports.MASTER_PASSWORD = PRIVATE.MASTER_PASSWORD || exports.password_private_suffix;
exports.recaptcha_priv_key = PRIVATE.recaptcha_priv_key;
exports.SUPPORT_EMAIL = PRIVATE.SUPPORT_EMAIL || SUPPORT_EMAIL;
exports.NOREPLY_EMAIL = PRIVATE.NOREPLY_EMAIL || NOREPLY_EMAIL;
exports.START_MESSAGE = PRIVATE.START_MESSAGE || START_MESSAGE;
exports.MAILER_NAME = PRIVATE.MAILER_NAME || MAILER_NAME;
exports.MAX_USER_WITHDRAW = PRIVATE.MAX_USER_WITHDRAW || MAX_USER_WITHDRAW;
exports.OPENTRADE = PRIVATE.OPENTRADE || OPENTRADE;
exports.DOMAIN = PRIVATE.DOMAIN || DOMAIN;

exports.share["my_portSSL"] = PRIVATE.SSL_PORT || 443;
exports.my_port = PRIVATE.PORT || 80;

exports.PORT_DB = PRIVATE.SSL_PORTDB || 40545;

exports.FIAT_ID = PRIVATE.FIAT_ID || [];


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
