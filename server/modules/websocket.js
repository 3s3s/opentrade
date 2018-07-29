'use strict';

const utils = require("../utils.js");
const g_constants = require("../constants.js");
const chat = require("./users/chat");
const wallet = require("./users/wallet");
const coins = require("./admin/coins");
const tradeAdmin = require("./admin/trades");
const trade = require("./users/trade");
const WebSocket = require('ws')

exports.onConnect = function(ws, req)
{
   //ws.on('open', function open() {});

    const request = req;
    ws.on('message', data => {
        if (!data || !data.length)
            return SendError(ws, 'Error: empty message');

        let client = {};
        try {
            client = JSON.parse(data);
        } catch(e) {
            return SendError(ws, 'Error: '+e.message);    
        }
        
        if (!client.request)
            return SendError(ws, 'Error: request not found');

        SendResponce(ws, request, client);
    });
}

function SendResponce(ws, req, client)
{
    if (ws['client_request'])
        delete ws['client_request'];
        
    ws['client_request'] = client.request;
    if (client.request == 'getchat')
        return chat.onRequestMessages(ws);

    if (client.request == 'getchart')
        return trade.onGetChart(ws, req, client.message);

    if (client.request == 'getrole')
        return tradeAdmin.onQueryRole(ws, req, client.message);
        
    if (client.request == 'del_orders')
        return tradeAdmin.onDeleteOrders(ws, req, client.message);

    if (client.request == 'del_chat_message')
        return chat.onDeleteMessage(ws, req, client.message);

    if (client.request == 'ban_chat_user')
        return chat.onBanUser(ws, req, client.message);

    if (client.request == 'deleteBan')
        return chat.onDeleteBanUser(ws, req, client.message.userID);

    if (client.request == 'postchat')
        return chat.onNewMessage(ws, req, client.message);

    if (client.request == 'admincoins')
        return coins.onGetCoins(ws, req);

    if (client.request == 'newcoin')
        return coins.onNewCoin(ws, req, client.message);

    if (client.request == 'delcoin')
        return coins.onDelCoin(ws, req, client.message);

    if (client.request == 'delete_trade')
        return tradeAdmin.onDelTrade(ws, req, client.message);

    if (client.request == "rpc_test")
        return coins.onTestRPC(ws, req, client.message);
   /* if (client.request == "daemon_start")
        return coins.onDaemonStart(ws, req, client.message);*/

    if (client.request == "getwallet")
        return wallet.onGetWallet(ws, req);

    if (client.request == "getpair")
        return trade.onGetPair(ws, req, client.message);

    if (client.request == "getpairbalance")
        return trade.onGetBalance(ws, req, client.message);

    if (client.request == "change_user_role")
        return tradeAdmin.onChangeRole(ws, req, client.message);
        
    if (client.request == 'support_coin')
        return coins.onSupport(ws, req, client.message);
        
    SendError(ws, 'Error: invalid request');
}

function SendError(ws, message)
{
   if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'error', message: message}));
}