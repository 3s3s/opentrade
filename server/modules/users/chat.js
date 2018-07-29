'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const WebSocket = require('ws');

let chat = {ru: [], en: []};

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
            let tmp = {};
            for (let key in messages)
            {
                if (!tmp[key]) tmp[key] = [];

                const msg = messages[key];
                for (var i=0; i<msg.length; i++)
                {
                    if (msg[i].message.text == messageObject.message.text && msg[i].user == messageObject.user && messageObject.message.lang == key)
                        continue;
                        
                    tmp[key].push(msg[i]);
                }
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
        let msgArray = [];
        for (var key in messages)
            msgArray = msgArray.concat(messages[key]);
            
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({request: 'chat-messages', message: msgArray}));
    });
}

function GetLastMessages(callback)
{
    if (!g_constants.dbTables['KeyValue'])
        return callback(chat);
        
    for (var key in chat)
        if (chat[key].length) return callback(chat);

    try
    {
        g_constants.dbTables['KeyValue'].get('chat', (err, value) => {
            try {
                chat = JSON.parse(value);
                /*const parsed = JSON.parse(value);
                let msgArray = [];
                for (var key in parsed)
                    msgArray = msgArray.concat(parsed[key]);
                
                let tmp = {};    
                for (var i=0; i<msgArray.length; i++)
                {
                    if (!tmp[msgArray[i].message.lang]) tmp[msgArray[i].message.lang] = [];
                    tmp[msgArray[i].message.lang].push(msgArray[i]);
                }
                
                chat = tmp;//JSON.parse(value);*/
            } catch(e) {}
            callback(chat);
        });
    }
    catch(e) {
        callback(chat);
    }
}

function SaveMessage(msg)
{
    if (!msg.message || !msg.message.lang || !chat[msg.message.lang]) return;
    
    chat[msg.message.lang].push(msg);
    
    var tmp = (chat[msg.message.lang].length > 300) ? chat[msg.message.lang].slice(chat[msg.message.lang].length-300) : chat[msg.message.lang];
    chat[msg.message.lang] = tmp;
    
    setTimeout(SaveToDB, 30000);
}

function SaveToDB()
{
    g_constants.dbTables['KeyValue'].set('chat', JSON.stringify(chat))
}