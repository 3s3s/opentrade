'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const WebSocket = require('ws');

let chat = [];

exports.onNewMessage = function(ws, req, messageObject)
{
    if (messageObject.text.length == 0)
        return;
    
    utils.GetSessionStatus(req, status => {
        if (!status.active)
            return;
            
        IsUserBanned(status.id, ret => {
            if (ret == true)
                return;
                
            if (messageObject.text.length >150)
                messageObject.text = messageObject.text.substr(0, 150);
                
            const msg = {user: status.user, userID: status.id, message: messageObject};    
            
            SaveMessage(msg);
    
            // Broadcast to everyone else.
            const msgString = JSON.stringify({request: 'chat-message', message: msg});
            g_constants.WEB_SOCKETS.clients.forEach( client => {
                if (client.readyState === WebSocket.OPEN) 
                    try {client.send(msgString);} catch(e) {client.terminate();}
            });
                
        });
        
    });
}

function IsUserBanned(userID, callback)
{
    g_constants.dbTables['chatban'].selectAll('*', 'userID='+userID, '', (err, rows) => {
        if (err || !rows || !rows.length)
            return callback(false);
        return callback(true);
    })
}

exports.onDeleteBanUser = function(ws, req, userID)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active) return;
        if (status.id != 1) return;
        
        g_constants.dbTables['chatban'].delete('userID="'+escape(userID)+'"', err => {
            if (err)
            {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'answer', message: 'Error at unbanning user'}));
            }
            else
            {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'answer', message: 'User was unbanned'}));
            }
        });
    });
}

exports.onBanUser = function(ws, req, messageObject)
{
    if (!messageObject['message'] || 
        !messageObject['user'] ||
        !messageObject['userID'] ||
        !messageObject['info'] || 
        !messageObject.info['endTime'] ||
        !messageObject.info['comment'])
        return;
        
    utils.GetSessionStatus(req, status => {
        if (!status.active) return;
        if (status.id != 1) return;
        
        g_constants.dbTables['users'].selectAll('ROWID AS id', 'login="'+escape(messageObject.user)+'"', '', (err, rows) => {
            if (err || !rows || !rows.length)
                return;
                
            g_constants.dbTables['chatban'].insert(rows[0].id, Date.now(), messageObject.info.endTime, JSON.stringify(messageObject.info.comment), e => {
                
            });
        });
    });
    
}

exports.onDeleteMessage = function(ws, req, messageObject)
{
    if (!messageObject['message'] || !messageObject['user'])
        return;
        
    utils.GetSessionStatus(req, status => {
        if (!status.active) return;
        if (status.id != 1) return;
        
        GetLastMessages(messages => {
            let tmp = [];
            for (var i=0; i<messages.length; i++)
            {
                if (messages[i].user == 'octo8')
                {
                    var k = 1;
                }
                if (messages[i].message.text == messageObject.message.text && messages[i].user == messageObject.user)
                    continue;
                tmp.push(messages[i]);
            }
            chat = tmp;
            
            SaveToDB();
        });
    });
}

exports.onRequestMessages = function(ws)
{
    require("./market").UpdateMarket();
    
    GetLastMessages(messages => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'chat-messages', message: messages}));
    });
}

function GetLastMessages(callback)
{
    if (chat.length || !g_constants.dbTables['KeyValue'])
    {
        callback(chat);
        return;
    }
    
    try
    {
        g_constants.dbTables['KeyValue'].get('chat', (err, value) => {
            try { chat = JSON.parse(value) } catch(e) {}
            callback(chat);
        });
    }
    catch(e)
    {
        callback(chat);
    }
}

function SaveMessage(msg)
{
    chat.push(msg);
    
    var tmp = (chat.length > 300) ? chat.slice(chat.length-300) : chat;
    chat = tmp;
    
    setTimeout(SaveToDB, 30000);
}

function SaveToDB()
{
    g_constants.dbTables['KeyValue'].set('chat', JSON.stringify(chat))
}