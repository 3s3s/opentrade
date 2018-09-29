'use strict';

const url = require('url');
const utils = require("../../utils.js");
const admin_utils = require('./utils.js');
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

exports.onChangeRole = function(ws, req, data)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active || status.id != 1)
        {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'user-role-change', message: 'Error: bad status'}));
            return;
        }
        
        if (!data.userID || !data.role)  
        {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'user-role-change', message: 'Error: bad request'}));
            return;
        }
        
        let bIsRoleValid = false;
        for (var i=0; i<g_constants.Roles.length; i++)    
            if (data.role == g_constants.Roles[i])  bIsRoleValid = true;
            
        if (!bIsRoleValid)
        {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'user-role-change', message: 'Error: bad new role'}));
            return;
        }
            
        admin_utils.GetUserRole(data.userID, info => {
            if (!info.role || info.role == data.role)
            {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'user-role-change', message: 'Error: same new role'}));
                return;
            }
            
            info.role = data.role;
            g_constants.dbTables['users'].update('info="'+escape(JSON.stringify(info))+'"', 'ROWID='+data.userID, err => {
                if (ws.readyState === WebSocket.OPEN) 
                {
                    ws.send(JSON.stringify({request: 'user-role-change', message: err ? err.message || 'Update DB error' : 'success', info: info}));
                }
            });
        });
    });
}

exports.DeleteDustOrders = function()
{
    const WHERE = "amount*1 <> 0 AND (amount*1 <= "+g_constants.share.DUST_VOLUME + "*1 OR price*1 <= "+g_constants.share.DUST_VOLUME + "*1)";
    g_constants.dbTables['orders'].selectAll('ROWID AS id, *', WHERE, '', (err, rows) => {
        if (err || !rows || !rows.length)
            return;
            
        AsyncCloseOrder(rows, 0);
    });
}

exports.onDeleteOrders = function(ws, req, data)
{
    if (!data || !data.coinName || !data.price)
        return;
        
    utils.GetSessionStatus(req, status => {
        if (status.id != 1)
            return;
            
       const WHERE = 'coin="'+escape(data.coinName)+'" AND price*1+0.000001 > '+escape(data.price)+'*1 AND price*1-0.000001 < '+escape(data.price) + '*1';
       g_constants.dbTables['orders'].selectAll('ROWID AS id, *', WHERE, '', (err, rows) => {
           if (err || !rows || !rows.length)
            return;
            
            AsyncCloseOrder(rows, 0);
       });
    });
}

function AsyncCloseOrder(rows, index)
{
    if (index >= rows.length)
        return;

    orders.CloseUserOrder(rows[index].userID, rows[index].id, () => {
        setTimeout(AsyncCloseOrder, 1, rows, index+1);
    });
}

exports.onQueryRole = function(ws, req, data)
{
    utils.GetSessionStatus(req, status => {
        if (status.id == 1)
        {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'user-role', message: 'root'}));
            return;
        }
        admin_utils.GetUserRole(status.id, info => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'user-role', message: info.role || 'User'}));
        });
    });
}

function DeleteTrade(data, callback)
{
    g_constants.dbTables['history'].selectAll('ROWID AS id, *', 'id='+data.id, '', (err, rows) => {
        if (err || !rows || !rows.length) return callback();
        
        UpdateBalances(rows, err => { g_constants.dbTables['history'].delete('ROWID='+rows[0].id, callback); });
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
