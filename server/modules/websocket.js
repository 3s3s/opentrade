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
        {
            SendError(ws, 'Error: empty message');
            return;
        }
        let client = {};
        try {
            client = JSON.parse(data);
        } catch(e) {
            SendError(ws, 'Error: '+e.message);    
            return;
        }
        
        if (!client.request)
        {
            SendError(ws, 'Error: request not found');
            return;
        }
        SendResponce(ws, request, client);
    });
}

function SendResponce(ws, req, client)
{
    if (ws['client_request'])
        delete ws['client_request'];
        
    ws['client_request'] = client.request;
    if (client.request == 'getchat')
    {
        chat.onRequestMessages(ws);
        return;
    }
    if (client.request == 'getchart')
    {
        trade.onGetChart(ws, req, client.message);
        return;
    }
    if (client.request == 'getrole')
    {
        tradeAdmin.onQueryRole(ws, req, client.message);
        return;
    }
    if (client.request == 'del_chat_message')
    {
        chat.onDeleteMessage(ws, req, client.message);
        return;
    }
    if (client.request == 'ban_chat_user')
    {
        chat.onBanUser(ws, req, client.message);
        return;
    }
    if (client.request == 'deleteBan')
    {
        chat.onDeleteBanUser(ws, req, client.message.userID);
        return;
    }
    if (client.request == 'postchat')
    {
        chat.onNewMessage(ws, req, client.message);
        return;
    }
    if (client.request == 'admincoins')
    {
        coins.onGetCoins(ws, req);
        return;
    }
    if (client.request == 'newcoin')
    {
        coins.onNewCoin(ws, req, client.message);
        return;
    }
    if (client.request == 'delcoin')
    {
        coins.onDelCoin(ws, req, client.message);
        return;
    }
    if (client.request == 'delete_trade')
    {
        tradeAdmin.onDelTrade(ws, req, client.message);
        return;
    }
    if (client.request == "rpc_test")
    {
        coins.onTestRPC(ws, req, client.message);
        return;
    }
    if (client.request == "getwallet")
    {
        wallet.onGetWallet(ws, req);
        return;
    }
    if (client.request == "getpair")
    {
        trade.onGetPair(ws, req, client.message);
        return;
    }
    if (client.request == "getpairbalance")
    {
        trade.onGetBalance(ws, req, client.message);
        return;
    }
    SendError(ws, 'Error: invalid request');
}

function SendError(ws, message)
{
   if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'error', message: message}));
}