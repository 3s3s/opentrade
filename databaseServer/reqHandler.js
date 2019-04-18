'use strict';

const utils = require("./utils");
const database = require("./database")
const WebSocket = require('ws');

exports.handle = function(app, wss)
{
    app.post('/query', OnQuery);
    
    wss.on('connection', onWebSocketConnection);
};

function ProcessQuery(q, callback)
{
    console.log('query...');
    try {
        const json = JSON.parse(q);
        
        console.log(json);
        
        //json={dbPath: "path/to/db", command: <sql | init> [, sql: "SQL string"] [, dbStructure: {dbTables: tables <, dbIndexes: indexes>}]}
        
        if (!json.dbPath) throw new Error('Error: dbPath is required!');
        if (!json.command) throw new Error('Error: command (init or sql) is required!');
        if (json.command == 'sql' && !json.sql) throw new Error('Error: command=sql but sql not found!')
        if (json.command == 'init' && (!json.dbPath || !json.dbStructure)) throw new Error('Error: command=init but dbPath or dbStructure not found!')
        
        if (json.command == 'init') 
        {
            if (!json.dbStructure.dbTables) throw new Error('dbStructure.dbTables not found');
            
            database.SetDatabase(json.dbPath, json.dbStructure);
                return callback({result: true, message: 'dbPath='+json.dbPath});
//            return utils.renderJSON(req, res, {result: true, message: 'dbPath='+json.dbPath});
        }
        if (json.command == 'sql') 
        {
            database.RunQuery(json.dbPath, json.sql, (err, rows) => {
                return callback({result: true, err: err, rows: rows});
//                return utils.renderJSON(req, res, {result: true, err: err, rows: rows});
            });
            return;
        }
        throw new Error('Not implemented');
    }
    catch(e) {
        console.log(e.message || 'Unknown error');
        return callback({result: false, message: e.message || 'Unknown error'});
    }
    
}

function OnQuery(req, res)
{
    console.log('OnQuery');
    if (!req.body || !req.body.q) 
        return utils.renderJSON(req, res, {result: false, message: 'Bad request req.body='+JSON.stringify(req.body)});
        
    ProcessQuery(req.body.q, ret => {
        utils.renderJSON(req, res, ret);
    })
}

function heartbeat() {
  this.isAlive = true;
}

function onWebSocketConnection(ws, req)
{
    console.log('onWebSocketConnection');
    
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    ws.on('message', data => {
        if (!data || !data.length)
            return SendError(ws, 'Error: empty message');

        let client = {};
        try {
            client = JSON.parse(data);
        } catch(e) {
            return SendError(ws, 'Error: '+e.message);    
        }
        
        if (!client.q || !client.id)
            return SendError(ws, 'Error: q or id not found');

        ProcessQuery(client.q, ret => {
            ret['id'] = client.id;
            //g_retArray.push({ws: ws, ret: ret});
            if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(ret));
        })
        
    });
    
    function SendError(ws, message)
    {
       if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({result: 'false', id: 0, message: message}));
    }
}


