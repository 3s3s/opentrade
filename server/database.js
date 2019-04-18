'use strict';

const g_constants = require('./constants');
const g_utils = require('./utils');
const WebSocket = require('ws');

let g_wsPool = [];
let g_mapIdToCallback = {};

function getRandomInt(min = 0, max = 100) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function InitSocketPool()
{
    if (g_wsPool.length) return;

    g_wsPool = new Array(100)
    for (let i=0; i<100; i++)
        NewSocket(i); 
}

function NewSocket(index)
{
    const client = new WebSocket('ws://'+g_constants.DOMAIN+':'+g_constants.PORT_DB);
    client['index'] = index;
    
    g_wsPool[index] = client;

    client.on('open', heartbeat);
    client.on('ping', heartbeat);
    client.on('close', () =>  {
      clearTimeout(client.pingTimeout);
      g_wsPool[client.index] = null;
    });     
    client.on('message', data => {
        setTimeout(ProcessMessage, 1, data);
    });

    function heartbeat() {
      clearTimeout(this.pingTimeout);
        
      // Use `WebSocket#terminate()` and not `WebSocket#close()`. Delay should be
      // equal to the interval at which your server sends out pings plus a
      // conservative assumption of the latency.
      this.pingTimeout = setTimeout(() => {
        this.terminate();
        g_wsPool[this.index] = null;
      }, 30000 + 1000);
    }
    
    function ProcessMessage(data)
    {
        DeleteTimeouts();
        if (!data) return;
        try {
            const message = JSON.parse(data);
    
            if (!message.id) return;
            if (!g_mapIdToCallback[message.id] || !g_mapIdToCallback[message.id].callback) return;
                    
            const callback = g_mapIdToCallback[message.id].callback;
    
            setTimeout(callback, 1, message.err, message.rows || []);
    
            delete g_mapIdToCallback[message.id];
        }
        catch(e) {
            console.log(e.message);
        }
    }
    function DeleteTimeouts()
    {
        let keys = [];
        for (let key in g_mapIdToCallback)
        {
            if (g_mapIdToCallback[key].time && Date.now()-g_mapIdToCallback[key].time > 30000)
            {
                const callback = g_mapIdToCallback[key].callback;
                const cancel = g_mapIdToCallback[key].cancel;
                
                if (callback) setTimeout(callback, 1, new Error('sql timeout'), []);
                if (cancel && !callback) setTimeout(cancel, 1);
                
                //delete g_mapIdToCallback[key];
                //break;
                keys.push(key)
            }
        }
        for (let i=0; i<keys.length; i++)
            delete g_mapIdToCallback[keys[i]];
    }
}
    
function GetSocketFromPool(callback)
{
    const index = getRandomInt();
    const socket = g_wsPool[index];
    
    if (socket && (socket.readyState === WebSocket.OPEN))
        return callback(socket);
        
    if (!socket)
        NewSocket(index)

    setTimeout(GetSocketFromPool, 100, callback);
}

function remoteInit()
{
    InitSocketPool();

    return new Promise((ok, cancel) => {
        const id = Math.random();
        const strJSON = JSON.stringify({id: id, q: JSON.stringify(
            {
                dbPath: g_constants.dbName, 
                command: "init",
                dbStructure: {dbTables: g_constants.dbTables, dbIndexes: g_constants.dbIndexes}
            }
        )});
        
        GetSocketFromPool(socket => {
            socket.send(strJSON);
            return ok();
        });

        /*g_ws.on('open', () => {
          g_ws.send(strJSON);
          return ok();
        });*/

    });
}

function remoteRun(SQL, callback)
{
    const id = Math.random();
    g_mapIdToCallback[id] = {time: Date.now(), callback: callback};
        
    const strJSON = JSON.stringify({id: id, q: JSON.stringify(
        {
            dbPath: g_constants.dbName, 
            command: "sql",
            sql: SQL
        }
    )});
        
    GetSocketFromPool(socket => {
        socket.send(strJSON);
    });
    //if (g_ws.readyState === WebSocket.OPEN) g_ws.send(strJSON);
}


function RunDBTransaction()
{
    exports.RunMemQueries(function(err) {});
}

exports.Init = async function(callback)
{
    const globalCallback = callback;
    
    await remoteInit();
    
    //g_db = new sqlite3.Database(g_constants.dbName);
    
    //g_db.run('DROP TABLE history');
    //g_db.run('ALTER TABLE orders ADD COLUMN uuid TEXT UNIQUE')
    
    RunDBTransaction();
    setInterval(RunDBTransaction, 5000);
    
    function CreateIndex(indexObject)
    {
        //g_db.run("CREATE INDEX IF NOT EXISTS "+indexObject.name+" ON "+indexObject.table+" ("+indexObject.fields+")", function(err){
        remoteRun("CREATE INDEX IF NOT EXISTS "+indexObject.name+" ON "+indexObject.table+" ("+indexObject.fields+")", err => {
            if (err) throw new Error(err.message);
        });
    }
    
    function CreateTable(dbTables, nIndex, cbError)
    {
        var cols = ' (';
        for (var i=0; i<dbTables[nIndex].cols.length; i++) {
            cols += dbTables[nIndex].cols[i][0] + ' ' + dbTables[nIndex].cols[i][1];
            
            if (i != dbTables[nIndex].cols.length-1)
                cols += ', ';
        }
        
        if (dbTables[nIndex].commands) cols += ", "+dbTables[nIndex].commands;
    
         cols += ')';
         
         //g_db.run('CREATE TABLE IF NOT EXISTS ' + dbTables[nIndex].name + cols, function(err) {
         remoteRun('CREATE TABLE IF NOT EXISTS ' + dbTables[nIndex].name + cols, err => {
            if (!err)
                return cbError(false);

            console.log(err.message);
            cbError(true);
         });
    }
    
    function Delete(table, where, callback)
    {
        try
        {
            //g_db.run('DELETE FROM ' + table + ' WHERE ' + where, function(err) {
            remoteRun('DELETE FROM ' + table + ' WHERE ' + where, err => {
                if (callback) setTimeout(callback, 1, err); //callback(err)
                if (!err) 
                    return;
                console.log('DELETE error: ' + err.message);
            });
            
        }
        catch(e)
        {
            if (callback) setTimeout(callback, 1, e); //callback(e);
            console.log(e.message);
        }
    }
    
    function Insert(tableObject, values)
    {
        InsertCommon(tableObject, values, false);
    }
    function Insert2(tableObject, values)
    {
        InsertCommon(tableObject, values, true);
   }
    function InsertCommon(tableObject, values, bToMemory)
    {
        try {
            var callbackERR = values[values.length-1];
            
            if (values.length-1 != tableObject.cols.length ) {
                console.log('ERROR: Insert to table "'+tableObject.name+'" failed arguments count: ' + (values.length-1));
                
                return setTimeout(callbackERR, 1, true); //callbackERR(true);
            }
            
            var vals = ' (';
            for (var i=0; i<values.length-1; i++) {
                vals += "'" + escape(values[i]) + "'";
                
                if (i != values.length-2)
                    vals += ', ';
            }
            vals += ')';
            
            console.log('INSERT INTO ' + tableObject.name + ' VALUES ' + vals);
            if (bToMemory)
            {
                exports.addMemQuery('INSERT INTO ' + tableObject.name + ' VALUES ' + vals);
                setTimeout(callbackERR, 1, false);//callbackERR(false);
            }
            else
            {
                //g_db.run('INSERT INTO ' + tableObject.name + ' VALUES ' + vals, err => {
                remoteRun('INSERT INTO ' + tableObject.name + ' VALUES ' + vals, err => {
                    if (callbackERR) setTimeout(callbackERR, 1, err); //callbackERR(err);
                    if (err) 
                        console.log('INSERT error: ' + err.message);
                    else
                        console.log('INSERT success');
                });
            }
        }
        catch(e) {
            console.log(e.message);
            if (callbackERR) setTimeout(callbackERR, 1, e); //callbackERR(e);
        }
    }
    function SelectAll(cols, table, where, other, callback, param) 
    {
        try {
            let query = "SELECT " + cols + " FROM " + table;
            if (where.length)
                query += " WHERE " + where;
            if (other.length)
                 query += " " + other; 
                 
            if (!callback) 
                console.log("WARNING: SelectAll callback undefined!!!");

            //g_db.all(query, param, (err, rows) => {
            remoteRun(query, (err, rows) => {
                if (err) 
                    console.log("SELECT ERROR: query="+query+" message=" + err.message);
                
                query = null;
                if (callback) setTimeout(callback, 1, err, rows);
            });
        }
        catch (e) {
            console.log(e.message);
            if (callback) setTimeout(callback, 1, e, []); //callback(e);
        }
    }
    function Update(tableName, SET, WHERE, callback)
    {
        try {
            let query = 'UPDATE ' + tableName;
            console.log(query); 
            
            if (!SET || !SET.length)  throw new Error("Table Update MUST have 'SET'");
            if (!WHERE || !WHERE.length) throw new Error("Table Update MUST have 'WHERE'");
                
            query += ' SET ' + SET;
            query += ' WHERE ' + WHERE;
            
            //console.log(query);   
            //g_db.run(query, function(err) {
            remoteRun(query, err => {
                if (callback) setTimeout(callback, 1, err); //callback(err);
                if (err) console.log("UPDATE error: " + err.message);
            });
        }
        catch(e) {
            console.log(e.message);
            if (callback) setTimeout(callback, 1, e); //callback(e);
        }
    }
    
    //g_db.parallelize(() => {
        
        g_utils.ForEachSync(g_constants.dbTables, CreateTable, err => {
            if (err) throw new Error('unexpected init db error 2');
            
            if (g_constants.dbIndexes)
            {
                for (var i=0; i<g_constants.dbIndexes.length; i++)
                    CreateIndex(g_constants.dbIndexes[i]);
            }

            g_constants.dbTables['KeyValue']['get'] = function(key, callback) {
                SelectAll("value", this.name, "key='"+escape(key)+"'", "", function(error, rows) {
                    if (rows && rows.length && rows[0].value) 
                        callback(error, unescape(rows[0].value));
                    else
                        callback(error, "");
                });
            };
            g_constants.dbTables['KeyValue']['set'] = function(key, value, callback) {
                this.get(key, function(error, rows) {
                    if (error || (!rows.length))
                        g_constants.dbTables['KeyValue'].insert(key, value, callback);
                    if (!error && rows.length)
                        g_constants.dbTables['KeyValue'].update("value = '"+escape(value)+"'", "key='"+escape(key)+"'", callback);
                });
            };
            
            if (globalCallback)
                globalCallback();
                
        }, (err, params, cbError) => {
            if (err) throw new Error('unexpected init db error 1');
            
            const i = params.nIndex;
            
            g_constants.dbTables[g_constants.dbTables[i]['name']] = g_constants.dbTables[i];
           
            g_constants.dbTables[i]['insert'] = function() {
                Insert(this, arguments);};
            g_constants.dbTables[i]['insert2'] = function() {
                Insert2(this, arguments);};

            g_constants.dbTables[i]['Insert'] = function() {
                let args = [];
                for (let i = 0; i < arguments.length; i++) {
                  args[i] = arguments[i];
                }
                return new Promise((fulfilled, rejected) => {
                    args.push(err => { 
                        if (err) return rejected( new Error(err.message || "Insert error") );
                        fulfilled(null);
                    });
                    Insert(this, args);
                });
            };
            
            g_constants.dbTables[i]['update'] = function(SET, WHERE, callback) {
                Update(this.name, SET, WHERE, callback);};
            
            g_constants.dbTables[i]['Update'] = function(SET, WHERE) {
                const name = this.name;
                return new Promise((fulfilled, rejected) => {
                    Update(name, SET, WHERE, err => {
                        if (err) return rejected( new Error(err.message || "Update error") );
                        fulfilled(null);
                    });
                });
             };
            
            g_constants.dbTables[i]['delete'] = function(WHERE, callback) {
                Delete(this.name, WHERE, callback);};
            
            g_constants.dbTables[i]['selectAll'] = function(cols, where, other, callback, param) {
                SelectAll(cols, this.name, where, other, callback, param);};
            
            g_constants.dbTables[i]['Select'] = function(cols, where = "", other = "", param) {
                const name = this.name;
                return new Promise((fulfilled, rejected) => {
                    SelectAll(cols, name, where, other, (err, rows) => {
                        if (err || !rows) return rejected( new Error(err && err.message ? err.message : "Select error") );
                        fulfilled(rows);
                    }, param);
                });
            };
            g_constants.dbTables[i]['Select2'] = function(cols, where = "", other = "", param) {
                const name = this.name;
                return new Promise((fulfilled, rejected) => {
                    SelectAll(cols, name, where, other, (err, rows) => {
                        if (err || !rows) return fulfilled([]);
                        fulfilled(rows);
                    }, param);
                });
            };
            
            cbError(false);
        });
    //});
};

exports.RunTransactions = function()
{
    Begin();
    
    function Begin()
    {
        //g_db.run('BEGIN TRANSACTION', function(err){
        remoteRun('BEGIN TRANSACTION', err => {
            if (!err)
                setTimeout(End, 10000);
            else
                setTimeout(Begin, 2000);
        });
    }
    
    function End()
    {
        //g_db.run('END TRANSACTION', function(err){
        remoteRun('END TRANSACTION', err => {
            if (!err)
            {
               // g_db.run("VACUUM");
                setTimeout(Begin, 1);
            }
            else
                setTimeout(End, 2000);
        });
    }
};

let txLog = "";
let g_gotTransaction = false;
exports.BeginTransaction = function (log, callback, count)
{
    const counter = count || 0;
    if (g_gotTransaction && counter <= 3)
        return setTimeout(exports.BeginTransaction, 5000, log, callback, counter+1);
    
    if (g_gotTransaction && counter > 3)
        return callback({message: 'Transactions busy '+txLog});

    g_gotTransaction = true;   
    txLog = log;
    //g_db.run('BEGIN TRANSACTION', function(err){
    remoteRun('BEGIN TRANSACTION', err => {
        if (err) g_gotTransaction = false;
        //if (err) throw ("BeginTransaction error: " + err.message);
        if (callback) callback(err);
    });
};

exports.EndTransaction = function(callback)
{
    //g_db.run('END TRANSACTION', err => {
    remoteRun('END TRANSACTION', err => {
        if (!err) g_gotTransaction = false;
        //if (err) throw ("EndTransaction error: " + err.message);
        if (callback) callback(err);
     });
};

exports.RunQuery = function(SQL, callback)
{
   // g_db.run(SQL, callback);
    remoteRun(SQL, callback);
}
exports.SELECT = function(query, callback, param)
{
    //g_db.all(query, param, (err, rows) => {
    remoteRun(query, (err, rows) => {
        if (err) console.log("SELECT ERROR: query="+query+" message=" + err.message);
                
        query = null;
        if (callback) setTimeout(callback, 1, err, rows);
    });        
}

exports.run = function(log, query, callback, count)
{
    const counter = count || 0;
    if (g_gotTransaction && counter <= 3)
        return setTimeout(exports.BeginTransaction, 5000, log, callback, counter+1);
    
    if (g_gotTransaction && counter > 3)
        return callback({message: 'Transactions busy '+txLog});

    g_gotTransaction = true;   
    txLog = log;

    //_db.run(query, err => {
    remoteRun(query, err => {
        if (err) return exports.RollbackTransaction(callback);

        g_gotTransaction = false;

        if (callback) callback(err);
    });
}

exports.RollbackTransaction = function(callback)
{
    //g_db.run('ROLLBACK', err => {
    remoteRun('ROLLBACK', err => {
        g_gotTransaction = false;
        //if (err) throw ("EndTransaction error: " + err.message);
        if (callback) callback(err);
     });
};

var g_memQueries = [];
exports.addMemQuery = function(strQuery) 
{
    if (!strQuery || !strQuery.length) throw new Error('invlid SQL query');
    
    g_memQueries.push(strQuery);
};
exports.RunMemQueries = function(callback)
{
    if (!g_memQueries.length)
    {
        callback(false);
        return;
    }
    exports.BeginTransaction('RunMemQueries', () => {
        g_memQueries.forEach((val, index, array) => {
            console.log('run from memory: '+ val);
            //g_db.run(val, error => {
            remoteRun(val, error => {
                 if (error) //throw 'RunMemQueries unexpected error for query='+val;
                 {
                     console.log('ERROR for RUN SQL: '+ val + '\nmessage:'+(error.message || ''));
                 }
             });
        });
        g_memQueries = [];
        exports.EndTransaction(callback);
    });
    
}




