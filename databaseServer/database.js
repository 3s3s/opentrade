'use strict';

var sqlite3 = require('sqlite3').verbose();

const g_utils = require('./utils');

const databases = {};

exports.SetDatabase = function(path, dbStructure)
{
    exports.EndTransaction(path);
    
    databases[path] = {};
    
    databases[path]['tables'] = dbStructure.dbTables;
    databases[path]['indexes'] = dbStructure.dbIndexes;
    databases[path]['time'] = Date.now();
    
    exports.Init(path);
}

//var g_db;

exports.Init = function(dbPath, callback)
{
    const globalCallback = callback;
    
    const db = databases[dbPath].tables['db'] = databases[dbPath]['db'] = new sqlite3.Database(dbPath);

    //g_db.run('DROP TABLE history');
    //g_db.run('ALTER TABLE orders ADD COLUMN uuid TEXT UNIQUE')
    
    function CreateIndex(db, indexObject)
    {
        db.run("CREATE INDEX IF NOT EXISTS "+indexObject.name+" ON "+indexObject.table+" ("+indexObject.fields+")", function(err){
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
         
         dbTables.db.run('CREATE TABLE IF NOT EXISTS ' + dbTables[nIndex].name + cols, function(err) {
            if (!err)
            {
                cbError(false);
                return;
            }
                
            console.log(err.message);
            cbError(true);
         });
    }
    
    function Delete(db, table, where, callback)
    {
        try
        {
            db.run('DELETE FROM ' + table + ' WHERE ' + where, function(err) {
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
    
    function Insert(db, tableObject, values)
    {
        InsertCommon(db, tableObject, values, false);
    }
    function Insert2(db, tableObject, values)
    {
        InsertCommon(db, tableObject, values, true);
    }
    function InsertCommon(db, tableObject, values, bToMemory)
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
            db.run('INSERT INTO ' + tableObject.name + ' VALUES ' + vals, function(err) {
                if (callbackERR) setTimeout(callbackERR, 1, err); //callbackERR(err);
                if (err) 
                    console.log('INSERT error: ' + err.message);
                else
                    console.log('INSERT success');
            });
        }
        catch(e) {
            console.log(e.message);
            if (callbackERR) setTimeout(callbackERR, 1, e); //callbackERR(e);
        }
    }
    function SelectAll(db, cols, table, where, other, callback, param) 
    {
        try {
            let query = "SELECT " + cols + " FROM " + table;
            if (where.length)
                query += " WHERE " + where;
            if (other.length)
                 query += " " + other; 
                 
            if (!callback) 
                console.log("WARNING: SelectAll callback undefined!!!");

            db.all(query, param, (err, rows) => {
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
    function Update(db, tableName, SET, WHERE, callback)
    {
        try {
            let query = 'UPDATE ' + tableName;
            console.log(query); 
            
            if (!SET || !SET.length)  throw new Error("Table Update MUST have 'SET'");
            if (!WHERE || !WHERE.length) throw new Error("Table Update MUST have 'WHERE'");
                
            query += ' SET ' + SET;
            query += ' WHERE ' + WHERE;
            
            //console.log(query);   
            db.run(query, function(err) {
                if (callback) setTimeout(callback, 1, err); //callback(err);
                if (err) console.log("UPDATE error: " + err.message);
            });
        }
        catch(e) {
            console.log(e.message);
            if (callback) setTimeout(callback, 1, e); //callback(e);
        }
    }
    
    const dbTables = databases[dbPath].tables;
    const dbIndexes = databases[dbPath].indexes;
    
    //db.parallelize(() => {
        
        g_utils.ForEachSync(dbTables, CreateTable, err => {
            if (err) throw new Error('unexpected init db error 2');
            
            if (dbIndexes)
            {
                for (var i=0; i<dbIndexes.length; i++)
                    CreateIndex(db, dbIndexes[i]);
            }

            dbTables['KeyValue']['get'] = function(key, callback) {
                SelectAll(db, "value", this.name, "key='"+escape(key)+"'", "", (error, rows) => {
                    if (rows && rows.length && rows[0].value) 
                        callback(error, unescape(rows[0].value));
                    else
                        callback(error, "");
                });
            };
            dbTables['KeyValue']['set'] = function(key, value, callback) {
                this.get(key, (error, rows) => {
                    if (error || (!rows.length))
                        dbTables['KeyValue'].insert(key, value, callback);
                    if (!error && rows.length)
                        dbTables['KeyValue'].update("value = '"+escape(value)+"'", "key='"+escape(key)+"'", callback);
                });
            };
            
            if (globalCallback)
                globalCallback();
                
        }, function(err, params, cbError){
            if (err) throw new Error('unexpected init db error 1');
            
            const i = params.nIndex;
            
            dbTables[dbTables[i]['name']] = dbTables[i];
           
            dbTables[i]['insert'] = function() {
                Insert(db, this, arguments);};
            dbTables[i]['insert2'] = function() {
                Insert2(db, this, arguments);};

            dbTables[i]['Insert'] = function() {
                let args = [];
                for (let i = 0; i < arguments.length; i++) {
                  args[i] = arguments[i];
                }
                return new Promise((fulfilled, rejected) => {
                    args.push(err => { 
                        if (err) return rejected( new Error(err.message || "Insert error") );
                        fulfilled(null);
                    });
                    Insert(db, this, args);
                });
            };
            
            dbTables[i]['update'] = function(SET, WHERE, callback) {
                Update(db, this.name, SET, WHERE, callback);};
            
            dbTables[i]['Update'] = function(SET, WHERE) {
                const name = this.name;
                return new Promise((fulfilled, rejected) => {
                    Update(db, name, SET, WHERE, err => {
                        if (err) return rejected( new Error(err.message || "Update error") );
                        fulfilled(null);
                    });
                });
             };
            
            dbTables[i]['delete'] = function(WHERE, callback) {
                Delete(db, this.name, WHERE, callback);};
            
            dbTables[i]['selectAll'] = function(cols, where, other, callback, param) {
                SelectAll(db, cols, this.name, where, other, callback, param);};
            
            dbTables[i]['Select'] = function(cols, where = "", other = "", param) {
                const name = this.name;
                return new Promise((fulfilled, rejected) => {
                    SelectAll(db, cols, name, where, other, (err, rows) => {
                        if (err || !rows) return rejected( new Error(err && err.message ? err.message : "Select error") );
                        fulfilled(rows);
                    }, param);
                });
            };
            dbTables[i]['Select2'] = function(cols, where = "", other = "", param) {
                const name = this.name;
                return new Promise(fulfilled => {
                    SelectAll(db, cols, name, where, other, (err, rows) => {
                        if (err || !rows) return fulfilled([]);
                        fulfilled(rows);
                    }, param);
                });
            };
            
            cbError(false);
        });
    //});
};

exports.RunTransactions = function(dbPath)
{
    if (!databases || !databases[dbPath] || !databases[dbPath]['db'])
        return;

    Begin(databases[dbPath]['db']);
    
    function Begin(db)
    {
        db.run('BEGIN TRANSACTION', function(err){
            if (!err)
                setTimeout(End, 10000, db);
            else
                setTimeout(Begin, 2000, db);
        });
    }
    
    function End(db)
    {
        db.run('END TRANSACTION', function(err){
            if (!err)
            {
               // g_db.run("VACUUM");
                setTimeout(Begin, 1, db);
            }
            else
                setTimeout(End, 2000, db);
        });
    }
};

exports.BeginTransaction = function (dbPath, callback)
{
    if (!databases || !databases[dbPath] || !databases[dbPath]['db'])
        return callback ? callback(null) : "";

    databases[dbPath]['db'].run('BEGIN TRANSACTION', err => {
        if (callback) callback(err);
    });
};

exports.EndTransaction = function(dbPath, callback)
{
    if (!databases || !databases[dbPath] || !databases[dbPath]['db'])
        return callback ? callback(null) : "";
        
    databases[dbPath]['db'].run('END TRANSACTION', err => {
        if (callback) callback(err);
     });
};

exports.RunQuery = function(dbPath, SQL, callback)
{
    if (!databases || !databases[dbPath] || !databases[dbPath]['db'])
        return callback ? callback({err : new Error('database not init'), rows: []}) : "";

    databases[dbPath]['db'].parallelize(() => {
        
        if (SQL.toUpperCase().indexOf('SELECT') == 0)
            return databases[dbPath]['db'].all(SQL, callback);
            
        databases[dbPath]['db'].run(SQL, callback);
    });    
}
exports.SELECT = function(dbPath, query, callback, param)
{
    if (!databases || !databases[dbPath] || !databases[dbPath]['db'])
        return callback ? callback(null) : "";

    databases[dbPath]['db'].all(query, param, (err, rows) => {
        if (err) console.log("SELECT ERROR: query="+query+" message=" + err.message);
                
        query = null;
        if (callback) setTimeout(callback, 1, err, rows);
    });        
}

exports.run = function(dbPath, log, query, callback)
{
    if (!databases || !databases[dbPath] || !databases[dbPath]['db'])
        return callback ? callback(null) : "";

    databases[dbPath]['db'].run(query, err => {
        if (err) return exports.RollbackTransaction(callback);

        if (callback) callback(err);
    });
}

exports.RollbackTransaction = function(dbPath, callback)
{
    if (!databases || !databases[dbPath] || !databases[dbPath]['db'])
        return callback ? callback(null) : "";

    databases[dbPath]['db'].run('ROLLBACK', err => {
        if (callback) callback(err);
     });
};





