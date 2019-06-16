'use strict';

exports.DEBUG_LOG = true;

exports.share = {
    my_port: 40545
};

const PRIVATE_CONSTANTS_PATH = "../server/modules/private_constants";

////////////////////////////////////////////////////////////////////////////////////
// Private constants
const PRIVATE = require(require(PRIVATE_CONSTANTS_PATH).PRIVATE_PATH || PRIVATE_CONSTANTS_PATH);
/////////////////////////////////////////////////////////////////////////////////////

exports.IsAllowedAddress = function(addr)
{
    if (PRIVATE.IsUnlimitedAddress && PRIVATE.IsUnlimitedAddress(addr))
        return true;
        
    return false;
}

exports.WEB_SOCKETS = null;


