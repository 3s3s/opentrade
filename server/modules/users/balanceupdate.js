'use strict';

const database = require("../../database");
const adminUtils = require("../admin/utils");
const utils = require("../../utils.js");
const g_constants = require("../../constants.js");

//let g_UpdateBalance = false;
exports.UpdateBalance = function(userID, coin, newAmount, log, callback)
{
    g_constants.dbTables['balancelog'].delete("time*1 < "+Date.now()-1000*3600*48, () => {});
    require("./orderupdate").DeleteOrder(escape(coin), "(amount*price <= 0 OR amount*1 <=0 OR price*1 <= 0) AND time*1+3600*48*1000 < "+Date.now(), err => {});

    g_constants.dbTables['balance'].update("balance='"+utils.roundDown(newAmount, 5)+"'", "userID='"+userID+"' AND coin='"+escape(coin)+"'", err => {
        g_constants.dbTables['balancelog'].insert(
            userID,
            coin,
            newAmount,
            Date.now(),
            (log || "") + " err=" + (err || ""),
            e => {
                if (err && log != "admin fix balance")
                    return adminUtils.FixFalance(userID, escape(coin), callback);
                
                return callback(err);
            }
        );
    })
}