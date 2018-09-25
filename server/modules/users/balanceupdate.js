'use strict';

const database = require("../../database");
const adminUtils = require("../admin/utils");
const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const orderupdate = require("./orderupdate");

let g_UpdateBalance = false;
exports.UpdateBalance = async function(userID, coin, newAmount, log = "", callback, c)
{
    const counter = c || 0;
    if (counter > 10)
        return callback({result: false, message: "UpdateBalance busy"});
        
    if (g_UpdateBalance)
        return setTimeout(exports.UpdateBalance, 100, userID, coin, newAmount, log, callback, counter+1);
        
    g_UpdateBalance = true;
        
    g_constants.dbTables['balancelog'].delete("time*1 < "+(Date.now()-1000*3600*48), () => {});
    orderupdate.DeleteOrder(escape(coin), "(amount*price <= 0 OR amount*1 <=0 OR price*1 <= 0) AND time*1+3600*48*1000 < "+Date.now(), err => {});
    
    /*g_constants.dbTables['balance'].selectAll('*', "userID='"+userID+"' AND coin='"+escape(coin)+"'", "", (err, rows) => {
       
        if (rows && rows.length == 0)
        {
            g_constants.dbTables['balance'].insert(
                userID,
                unescape(coin),
                utils.roundDown(newAmount),
                JSON.stringify({}),
                JSON.stringify({}),
                err => { 
                    g_UpdateBalance = false;
                    if (err) return callback(err);
                    
                    g_constants.dbTables['balancelog'].insert(
                        userID,
                        coin,
                        utils.roundDown(newAmount),
                        Date.now(),
                        (log || "") + " err=" + (err || ""),
                        e => { callback(null); }
                    );
                }    
            );
            return;
        }

        g_constants.dbTables['balance'].update("balance='"+utils.roundDown(newAmount)+"'", "userID='"+userID+"' AND coin='"+escape(coin)+"'", err => {
            g_UpdateBalance = false;
            if (err) return callback(err);

            g_constants.dbTables['balancelog'].insert(
                userID,
                coin,
                utils.roundDown(newAmount),
                Date.now(),
                (log || "") + " err=" + (err || ""),
                e => {  callback(null); }
            );
        })
        /*const e = await g_constants.dbTables['balance'].update2("balance='"+utils.roundDown(newAmount)+"'", "userID='"+userID+"' AND coin='"+escape(coin)+"'");
            
        g_UpdateBalance = false;
        if (e) return callback(e);

        g_constants.dbTables['balancelog'].insert(
                userID,
                coin,
                utils.roundDown(newAmount),
                Date.now(),
                (log || "") + " err=" + (err || ""),
                e => {  callback(null); }
        );*/

   // });
   
    try {
        const rows = await g_constants.dbTables['balance'].Select('*', "userID='"+userID+"' AND coin='"+escape(coin)+"'");
       
        if (rows.length == 0)
            await g_constants.dbTables['balance'].Insert(userID, unescape(coin), utils.roundDown(newAmount), JSON.stringify({}), JSON.stringify({}));
        else
            await g_constants.dbTables['balance'].Update("balance='"+utils.roundDown(newAmount)+"'", "userID='"+userID+"' AND coin='"+escape(coin)+"'");
        
        g_UpdateBalance = false;
            
        await g_constants.dbTables['balancelog'].Insert(userID, coin, utils.roundDown(newAmount), Date.now(), log);
            
        return callback(null);
    }
    catch(e) {
        g_UpdateBalance = false;
        return callback({result: false, message: e.message});
    }
}