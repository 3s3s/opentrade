'use strict';

const url = require('url');
const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const RPC = require("../rpc.js");
const WebSocket = require('ws');
const database = require("../../database");
const orders = require("../users/orders.js");

exports.onDelTrade = function(ws, req, data)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active || status.id != 1)
            return;
            
        DeleteTrade(data, ret => {
            SendLastTrade(ws);
        });
    });
};

exports.onQueryRole = function(ws, req, data)
{
    utils.GetSessionStatus(req, status => {
        if (status.id == 1)
        {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'user-role', message: 'root'}));
            return;
        }
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'user-role', message: 'user'}));
    });
}

function DeleteTrade(data, callback)
{
    g_constants.dbTables['history'].selectAll('ROWID AS id, *', 'id='+data.id, '', (err, rows) => {
        if (err || !rows || !rows.length) return callback();
        
        database.BeginTransaction(err => {
            if (err) return callback();
            
            const ID = rows[0].id;

            UpdateBalances(rows, err => {
                if (err)
                {
                    database.RollbackTransaction();
                    return callback();
                }
                g_constants.dbTables['history'].delete('ROWID='+ID, err => {
                    database.EndTransaction();
                    callback();
                })
            });
        });
    });

    function UpdateBalances(rows, callback)
    {
        RemoveBalances(rows, err => {
            if (err) return callback(err);
            
            AddBalances(rows, err => {
                if (err) return callback(err);
                
                ProcessComission(rows[0].comission, rows[0].coin_pair);
                callback(0);
            });
        });
    }
    
    function RemoveBalances(rows, callback)
    {
        orders.AddBalance(rows[0].buyUserID, -1*rows[0].fromSellerToBuyer, rows[0].coin, err => {
            if (err) return callback(err);

            orders.AddBalance(rows[0].sellUserID, -1*rows[0].fromBuyerToSeller, rows[0].coin_pair, callback);
        });
    }
    function AddBalances(rows, callback)
    {
        orders.AddBalance(rows[0].sellUserID, rows[0].fromSellerToBuyer, rows[0].coin, err => {
            if (err) return callback(err);

            orders.AddBalance(rows[0].buyUserID, rows[0].fromBuyerToSeller*1+rows[0].comission*1, rows[0].coin_pair, callback);
        });
    }
    
    function ProcessComission(comission, price_pair)
    {
        for (var i=0; i<g_constants.DONATORS.length; i++)
        {
            if (g_constants.DONATORS[i].percent && g_constants.DONATORS[i].userID)
                orders.AddBalance(g_constants.DONATORS[i].userID, -1*(comission*(g_constants.DONATORS[i].percent*1-1)) / 100.0, price_pair, () => {});
        }
    }

}

function SendLastTrade(ws)
{
    g_constants.dbTables['history'].selectAll('ROWID AS id, *', '', 'ORDER BY id DESC LIMIT 1', (err, rows) => {
        if (err) return;

        for (var i=0; i<rows.length; i++)
        {
            rows[i]['buyUserAccount'] = utils.Encrypt(rows[i].buyUserID);
            rows[i]['sellUserAccount'] = utils.Encrypt(rows[i].sellUserID);
        }
                
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'last_trade', message: rows, client_request: ws['client_request'] || ""}));
    });
}
