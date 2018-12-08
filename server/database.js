'use strict';

var sqlite3 = require('sqlite3').verbose();

const g_constants = require('./constants');
const g_utils = require('./utils');

var g_db;

function RunDBTransaction()
{
    exports.RunMemQueries(function(err) {});
}

exports.Init = function(callback)
{
    const globalCallback = callback;
    
    g_db = new sqlite3.Database(g_constants.dbName);
    
    //g_db.run('DROP TABLE history');
    //g_db.run('ALTER TABLE orders ADD COLUMN uuid TEXT UNIQUE')
    
    RunDBTransaction();
    setInterval(RunDBTransaction, 5000);
    
    function CreateIndex(indexObject)
    {
        g_db.run("CREATE INDEX IF NOT EXISTS "+indexObject.name+" ON "+indexObject.table+" ("+indexObject.fields+")", function(err){
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
         
         g_db.run('CREATE TABLE IF NOT EXISTS ' + dbTables[nIndex].name + cols, function(err) {
            if (!err)
            {
                cbError(false);
                return;
            }
                
            console.log(err.message);
            cbError(true);
         });
    }
    
    function Delete(table, where, callback)
    {
        try
        {
            g_db.run('DELETE FROM ' + table + ' WHERE ' + where, function(err) {
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
                g_db.run('INSERT INTO ' + tableObject.name + ' VALUES ' + vals, function(err) {
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

            g_db.all(query, param, (err, rows) => {
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
            g_db.run(query, function(err) {
                if (callback) setTimeout(callback, 1, err); //callback(err);
                if (err) console.log("UPDATE error: " + err.message);
            });
        }
        catch(e) {
            console.log(e.message);
            if (callback) setTimeout(callback, 1, e); //callback(e);
        }
    }
    
    g_db.parallelize(function(){
        
        g_utils.ForEachSync(g_constants.dbTables, CreateTable, function(err) {
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
                
        }, function(err, params, cbError){
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
            
            cbError(false);
        });
    });
};

exports.RunTransactions = function()
{
    Begin();
    
    function Begin()
    {
        g_db.run('BEGIN TRANSACTION', function(err){
            if (!err)
                setTimeout(End, 10000);
            else
                setTimeout(Begin, 2000);
        });
    }
    
    function End()
    {
        g_db.run('END TRANSACTION', function(err){
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
    g_db.run('BEGIN TRANSACTION', function(err){
        if (err) g_gotTransaction = false;
        //if (err) throw ("BeginTransaction error: " + err.message);
        if (callback) callback(err);
    });
};

exports.EndTransaction = function(callback)
{
    g_db.run('END TRANSACTION', err => {
        if (!err) g_gotTransaction = false;
        //if (err) throw ("EndTransaction error: " + err.message);
        if (callback) callback(err);
     });
};

exports.RunQuery = function(SQL, callback)
{
    g_db.run(SQL, callback);
}
exports.SELECT = function(query, callback, param)
{
    g_db.all(query, param, (err, rows) => {
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

    g_db.run(query, err => {
        if (err) return exports.RollbackTransaction(callback);

        g_gotTransaction = false;

        if (callback) callback(err);
    });
}

exports.RollbackTransaction = function(callback)
{
    g_db.run('ROLLBACK', err => {
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
    exports.BeginTransaction(function() {
        g_memQueries.forEach((val, index, array) => {
            console.log('run from memory: '+ val);
            g_db.run(val, error => {
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




