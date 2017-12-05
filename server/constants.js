'use strict';

exports.recaptcha_pub_key = "6LessjsUAAAAAKx2nOalcIXbcesEtxvj-jxjVbvk";
exports.recaptcha_priv_key = require("./modules/private_constants").recaptcha_priv_key;

exports.my_port = 40080;
exports.my_portSSL = 40443;

exports.dbName = './database/sqlite.db';

const SSL_cert = './server.crt';
const SSL_key = './server.key';

exports.SSL_options = {
    key: require("fs").readFileSync(SSL_key),
    cert: require("fs").readFileSync(SSL_cert)
};

exports.dbTables = [
   {
      'name' : 'KeyValue',
      'cols' : [
          ['key', 'TEXT UNIQUE PRIMARY KEY'],
          ['value', 'TEXT']
        ]
   },
];