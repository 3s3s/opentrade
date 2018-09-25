'use strict';

const g_constants = require("../../constants.js");

let g_LockedUsers = [];

exports.LockUser = function(id)
{
    for (let i=0; i<g_LockedUsers.length; i++)
        if (g_LockedUsers[i] == id) return;
        
    g_LockedUsers.push(id);
}
exports.UnlockUser = function(id)
{
    let tmp = [];
    for (let i=0; i<g_LockedUsers.length; i++)
    {
        if (g_LockedUsers[i] == id) continue;
        tmp.push(g_LockedUsers[i]);
    }
    g_LockedUsers = tmp;
}

exports.IsLockedUser = function(id)
{
    for (let i=0; i<g_LockedUsers.length; i++)
        if (g_LockedUsers[i] == id) return true;
        
    return false;
}

/*exports.UpdateOrders = async function(SET, WHERE, callback)
{
    return g_constants.dbTables['orders'].update(SET, WHERE, err => {return callback({result: err ? false : true, message: ""})});
}*/

exports.DeleteOrder = function(coin, WHERE, callback)
{
    g_constants.dbTables['orders'].delete(WHERE, callback);
}