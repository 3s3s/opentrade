'use strict';

const PRIVATE_PATH = "../../server/modules/private_constants";
const PRIVATE = require(require(PRIVATE_PATH).PRIVATE_PATH || PRIVATE_PATH);

exports.SSL_KEY = PRIVATE.SSL_KEY;
exports.SSL_CERT = PRIVATE.SSL_CERT;
exports.password_private_suffix = PRIVATE.password_private_suffix;

