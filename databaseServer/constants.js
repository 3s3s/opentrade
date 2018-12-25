'use strict';

exports.DEBUG_LOG = true;

exports.share = {
    my_portSSL: 40543
};

const PRIVATE_CONSTANTS_PATH = "../server/modules/private_constants";

////////////////////////////////////////////////////////////////////////////////////
// Private constants
const PRIVATE = require(require(PRIVATE_CONSTANTS_PATH).PRIVATE_PATH || PRIVATE_CONSTANTS_PATH);
exports.password_private_suffix = PRIVATE.password_private_suffix || "sdnejVFVBreb";
exports.share["my_portSSL"] = PRIVATE.SSL_PORTDB || exports.share["my_portSSL"];
/////////////////////////////////////////////////////////////////////////////////////

exports.SSL_options = {
    key: require("fs").readFileSync(PRIVATE.SSL_KEY),
    cert: require("fs").readFileSync(PRIVATE.SSL_CERT)
};

exports.IsAllowedAddress = function(addr)
{
    if (PRIVATE.IsUnlimitedAddress && PRIVATE.IsUnlimitedAddress(addr))
        return true;
        
    return false;
}

exports.WEB_SOCKETS = null;


