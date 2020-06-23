'use strict';

const dictionary = require("./dictionary.js");
const g_constants = require("./constants.js");
const g_crypto = require('crypto');
const http = require('http');
const https = require('https');
const url = require('url');
var fs = require('fs');
const util = require('util');

const admin_utils = require("./modules/admin/utils.js");

const balance_log_file = fs.createWriteStream(__dirname + '/balance_debug.log', {flags : 'w'});
const log_file_user = require("fs").createWriteStream(__dirname + '/debug_user.log', {flags : 'w'});

exports.balance_log = function(d) { 
  balance_log_file.write(util.format(d) + '\n');
};
exports.log_user = function(user, d) {
    if (user != 1)
        return;
    
    log_file_user.write(util.format(d) + '\n');
}

exports.Hash = function(str)
{
    return g_crypto.createHash("sha256").update(str).digest('base64');
};
exports.HashPassword = function(strPassword)
{
    return exports.Hash(strPassword + g_constants.password_private_suffix);
};

exports.isNumeric = function(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

exports.roundDown = function(number, decimals) {
    
    try
    {
        if (!exports.isNumeric(number)) 
            return number;
            
        decimals = decimals || 7;
        
        if (!exports.isNumeric(decimals))
            return number;
            
        const ret =  ( Math.floor( number * Math.pow(10, decimals) ) / Math.pow(10, decimals) )*1;
        
        return ret; //(ret < 0.000001) ? 0 : ret;
    }
    catch(e)
    {
        return number;
    }
}

exports.Encrypt = function(str)
{
    const algorithm = 'aes256';
    const inputEncoding = 'utf8';
    const outputEncoding = 'hex';

    const key = g_constants.password_private_suffix;
    
    const cipher = g_crypto.createCipher(algorithm, key);
    
    let ciphered = cipher.update(escape(str), inputEncoding, outputEncoding);
    ciphered += cipher.final(outputEncoding);

    return ciphered;
}

exports.Decrypt = function(str)
{
    const algorithm = 'aes256';
    const inputEncoding = 'utf8';
    const outputEncoding = 'hex';

    const key = g_constants.password_private_suffix;
    
    const decipher = g_crypto.createDecipher(algorithm, key);
    
    let deciphered = decipher.update(str, outputEncoding, inputEncoding);
    deciphered += decipher.final(inputEncoding);

    return unescape(deciphered);
}

let validTokens = {};
let validSessions = {};

const g_tokenSecret = Math.random();
exports.CreateToken = function(password)
{
    const tokenPublic = Math.random();
    const ret = tokenPublic+"-"+exports.Hash(g_tokenSecret+""+tokenPublic+"").substr(0, 7)+"-"+exports.Hash(g_tokenSecret+""+tokenPublic+""+password+"").substr(0, 7);
    
    return ret;
}

exports.IsValidToken = function(token)
{
    const parts = token.split('-');
    if (parts.length != 3)
        return false;
    
    if (parts[1] != exports.Hash(g_tokenSecret+""+parts[0]+"").substr(0, 7))
        return false;
        
    return true;
}


exports.UpdateSession = function(userid, token, callback)
{
    if (!userid) 
    {
        g_constants.dbTables['sessions'].delete("token='"+escape(token)+"'");
        if (validTokens[escape(token)])
            delete validTokens[escape(token)];
            
        if (validSessions[escape(token)])
            delete validSessions[escape(token)];
            
        setTimeout(callback, 10);
        return;
    }
    
    if (validTokens[escape(token)] && (Date.now() - validTokens[escape(token)].time < 60000))
    {
        setTimeout(callback, 10);
        return;
    }
    
    validTokens[escape(token)] = {time: Date.now()};    
    g_constants.dbTables['sessions'].insert(token, Date.now(), userid, err => {
        if (!err) 
        {
            g_constants.dbTables['sessions'].delete('time <'+Date.now()+' - '+g_constants.SESSION_TIME);
            validTokens[escape(token)] = {time: Date.now()};
            setTimeout(callback, 10);
            return;
        }
        g_constants.dbTables['sessions'].update("time='"+Date.now()+"'", "token='"+escape(token)+"'", err => { 
            validTokens[escape(token)] = {time: Date.now()};
            setTimeout(callback, 10);
        });
    });
}

exports.CheckUserExist = function(user, email)
{
    return new Promise((ok, cancel) => {
        
        IsUserExist(user, exist => {
            if (exist.result == true)
                return ok({message: 'Sorry. This user already registered', info: exist.row});
    
            IsEmailExist(email, exist => {
                if (exist.result == true)
                    return ok({message: 'Sorry. This email already registered', info: exist.row});
    
                cancel(new Error('Checking user failed. Error: user not found'));
            });
        });
    });

    function IsUserExist(user, callback)
    {
        if (!user.length)
            return callback({result: false});

        g_constants.dbTables['users'].selectAll("ROWID AS id, *", "login='"+escape(user)+"'", "", function(error, rows) {
            if (rows && rows.length)
                return callback({result: true, row: rows[0]});

            callback({result: false});
        });
    }
    
    function IsEmailExist(email, callback)
    {
        if (!email.length)
            return callback({result: false});

        g_constants.dbTables['users'].selectAll("ROWID AS id, *", "email='"+escape(email)+"'", "", function(error, rows) {
            if (rows && rows.length)
                return callback({result: true, row: rows[0]});

            callback({result: false});
        });
    }
}

exports.ForEachSync = function(array, func, cbEndAll, cbEndOne)
{
    if (!array || !array.length)
    {
        console.log('success: ForEachAsync (!array || !array.length)');
        cbEndAll(false);
        return;
    }
    
    Run(0);
    
    function Run(nIndex)
    {
        if (nIndex >= array.length) throw new Error('error: ForEachSync_Run (nIndex >= array.length)');
        func(array, nIndex, onEndOne);
        
        function onEndOne(err, params)
        {
            if (!cbEndOne)
            {
                if (err) return cbEndAll(err);
                
                if (nIndex+1 < array.length && !err)
                    Run(nIndex+1);
                else
                    cbEndAll(false); //if all processed then stop and return from 'ForEachSync'
                return;
            }
            
            if (!params) params = {};
            
            params.nIndex = nIndex;
            
            cbEndOne(err, params, function(error) {
                if (error) {
                    //if func return error, then stop and return from 'ForEachSync'
                    console.log('error: ForEachSync_Run_cbEndOne return error');
                    return cbEndAll(true);
                }
                if (nIndex+1 < array.length)
                    Run(nIndex+1);
                else
                    cbEndAll(false); //if all processed then stop and return from 'ForEachSync'
            });
        }
    }
};

exports.UpdateRef = function(IP, userID)
{
    const WHERE = "uid=(SELECT uid FROM referals WHERE timeReg='0' AND IP='"+IP+"' ORDER BY timeIn*1 LIMIT 1)";
    
    console.log('UpdateRef WHERE='+WHERE);
    g_constants.dbTables['referals'].update(
        'timeReg="'+Date.now()+'", userRegID="'+userID+'"', 
        WHERE,
        err => {});
}

function InsertRef(req)
{
    const uuid = Math.random()*10000+"-"+Date.now()+"-"+exports.Encrypt(req.query['ref']);
    const tmpUserID = (req.headers['x-forwarded-for'] || req.connection.remoteAddress) + "-" + (Date.now()/(600*1000)).toFixed(0);
    
    if (!exports.isNumeric(req.query['ref']))
        return;
    
    g_constants.dbTables['users'].selectAll('ROWID AS id', 'ROWID='+escape(req.query['ref']), '', (err, rows) => {
        if (err || !rows || rows.length != 1)
            return;
            
        g_constants.dbTables['referals'].insert(
            req.query['ref'],
            req.headers.referer || "",
            req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            Date.now(),
            0,
            tmpUserID,
            JSON.stringify({}),
            uuid,
            err => {}
        );
    });

    //g_constants.dbTables['referals'].delete("timeReg = '0' AND timeIn < "+(Date.now()-24*3600*1000), err => {});
}

exports.GetSessionStatus = function(req, callback)
{
    if (req['query'] && req.query['ref'])
        InsertRef(req);
        
    if (req['session_status'])
        return callback(req['session_status']);
        
    const errMessage = 'Error: invalid session token (please login again)';
    
    req['token'] = exports.parseCookies(req)['token'] || '';
    if (!req.token || !req.token.length || !g_constants.dbTables['sessions'])
        return setTimeout(callback, 10, {active: false, message: errMessage});

    const token = escape(req.token);
    
    if (validSessions[token] && validSessions[token]['data'] && Date.now() - validSessions[token] < 60000)
        return setTimeout(callback, 10, validSessions[token]['data']);

    if (!exports.IsValidToken(token))
        return setTimeout(callback, 10, {active: false, message: "invalid token"});
	
    g_constants.dbTables['sessions'].selectAll('*', 'token="'+token+'"', '', (err, rows) => {
        if (err || !rows || !rows.length)
            return setTimeout(callback, 10, {active: false, message: errMessage});

        if (Date.now() - rows[0].time > g_constants.SESSION_TIME)
        {
            g_constants.dbTables['sessions'].delete('time < '+Date.now()+' - '+g_constants.SESSION_TIME);
            
            if (validSessions[token])
                delete validSessions[token];
                
            return setTimeout(callback, 10, {active: false, message: errMessage});
        }
        
        exports.UpdateSession(rows[0].userid, unescape(token), () => {
            g_constants.dbTables['users'].selectAll("ROWID AS id, *", "ROWID='"+rows[0].userid+"'", "", (error, rows) => {
                if (err || !rows || !rows.length)
                    return setTimeout(callback, 10, {active: false, message: errMessage});

                validSessions[token] = {time: Date.now()};
                validSessions[token]['data'] = {active: true, token: token, user: rows[0].login, password: unescape(rows[0].password), email: rows[0].email, id: rows[0].id, info: rows[0].info};
                
                setTimeout(callback, 10, validSessions[token]['data']);
            });
        });
    });
}

let allUsersCount = {count: 0, time: Date.now()};
exports.GetAllUsersCount = function()
{
    if (allUsersCount.count && Date.now() - allUsersCount.time < 1000*60)
        return allUsersCount.count;
        
    if (!g_constants.dbTables['users'])
        return allUsersCount.count;
        
    g_constants.dbTables['users'].selectAll('count(login) AS ret', '', '', (err, rows) => {
        if (err || !rows.length)
            return;
            
        allUsersCount.time = Date.now();
        allUsersCount.count = rows[0].ret;
    });
    
    return allUsersCount.count;
}

let updateKeysTimer = Date.now();
exports.GetValidSessionsCount = function()
{
    const time = Date.now();
    if (time - updateKeysTimer > 120000)
    {
        var tmp = {};
        for (var key in validTokens)
        {
            if (!validTokens || !validTokens[key])
                continue;
                
            if (time - validTokens[key].time < 120000)
                tmp[key] = validTokens[key];
        }
        validTokens = tmp;
        updateKeysTimer = Date.now();
    }
    
    return Object.keys(validTokens).length || 0;
}

exports.parseCookies = function(request) {
    if (!request || !request.headers)
        return {};
        
    var list = {},
        rc = request.headers.cookie;

    rc && rc.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
};

exports.RedirectToLogin = function(req, res, returnPath)
{
    res.render("pages/redirect", {path: "/login?redirect="+escape(returnPath)});
}

exports.render = function(responce, page, info)
{
    const lang = (info && info.lang ? info.lang : 'en');

    let render_info = info || {};
    
    render_info['dict'] = dictionary.object;
    render_info['dict']['server_time'] = Date.now();
    render_info['dict'].setLanguage(lang);
    
    render_info['__'] = render_info['dict'].l;
    
    render_info['recaptcha'] = g_constants.recaptcha_pub_key;
    render_info['debug'] = g_constants.DEBUG_MODE;
    render_info['lang'] = lang;
    
    render_info['share'] = g_constants.share;

    responce.render(page, render_info);
}

exports.getJSON = function(query, callback)
{
    const parsed = url.parse(query, true);
    const options = {
        host: parsed.hostname,
        port: parsed.port || (parsed.protocol=='https:' ? 443 : 80),
        path: parsed.path,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    exports.getHTTP(options, callback);
};

exports.postJSON = function(query, body, callback)
{
    const parsed = url.parse(query, true);
    const options = {
        protocol: parsed.protocol,
        host: parsed.hostname,
        port: parsed.port || (parsed.protocol=='https:' ? 443 : 80),
        path: parsed.path,
        method: 'POST',
        body: body,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    exports.getHTTP(options, callback);
};

var lastSocketKey = 0;
var socketMap = {};
exports.postString = function(host, port, path, headers, strBody, callback) 
{
    const options = { 
        hostname: host, 
        port: port.nPort, 
        path: path, 
        method: 'POST', 
        headers: headers
    }; 
    
    if (!port.name)
    {
        var i=0;
    }
    var proto = (port.nPort == 443 || port.name.indexOf('https')==0) ? https : http;
        
    var req = proto.request(options, function(res) { 
        console.log('Status: ' + res.statusCode); 
        console.log('Headers: ' + JSON.stringify(res.headers)); 
        
        res.setEncoding('utf8'); 
        
		var res_data = '';
		res.on('data', function (chunk) {
			res_data += chunk;
		});
		res.on('end', function() {
			setTimeout(callback, 10, {'success': 'success', 'data': res_data});
		});	
    }); 
    
    req.on('socket', function (socket) {
        socket.setTimeout(30000);  
        socket.on('timeout', function() {
            req.abort();
        });
        
        /* generate a new, unique socket-key */
        const socketKey = ++lastSocketKey;
        /* add socket when it is connected */
        socketMap[socketKey] = socket;
        socket.on('close', function() {
            /* remove socket when it is closed */
            delete socketMap[socketKey];
        });
    });

    req.on('error', function(e) { 
        if (e.code === "ECONNRESET") {
            console.log("Timeout occurs");
        }
        console.log('problem with request: ' + (e.message || "")); 
        setTimeout(callback, 10, {'success': false, message: 'problem with request: ' + (e.message || "")});
    }); 
    
    // write data to request body 
    req.end(strBody);    
};

exports.postHTTP = function(query, headers, callback)
{
    const parsed = url.parse(query, true);
    const options = {
        host: parsed.host,
        port: parsed.port || parsed.protocol=='https:' ? 443 : 80,
        path: parsed.path,
        method: 'POST',
        headers: headers
    };
    exports.getHTTP(options, callback);
}

exports.getHTTP = function(options, onResult)
{
    console.log("rest::getJSON");

    const port = options.port || 80;
    const prot = (port == 443 || options.protocol == 'https:') ? https : http;
    
    if (!options.method)
        options.method = 'GET';
    if (!options.headers)
        options.headers = {'Content-Type': 'application/json'};
        
    var req = prot.request(options, res => {
        var output = '';
        console.log(options.host + ':' + res.statusCode);
        res.setEncoding('utf8');

        res.on('data', chunk => {
            output += chunk;
        });

        res.on('end', () => {
            if (options.headers['Content-Type'] == 'application/json')
            {
                try {
                    return onResult(res.statusCode, JSON.parse(output));
                }catch(e) {
                    console.log(e.message);
                    return onResult(res.statusCode, e);
                }
            }
            onResult(res.statusCode, output);
        });
    });

    req.on('error', err => {
        console.log(err.message)
        onResult('0', 'unknown error');
    });

    if (options.body)
        req.write(options.body);
        
    req.end();
};

exports.renderJSON = function(req, res, params)
{
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(params));
};

exports.ValidateEmail = function(text)
{
    if (!text || !text.length)
        return false;
            
    const mailformat = /^[-a-z0-9!#$%&'*+/=?^_`{|}~]+(?:\.[-a-z0-9!#$%&'*+/=?^_`{|}~]+)*@(?:[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?\.)*(?:aero|arpa|asia|biz|cat|com|coop|club|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|pro|tel|travel|[a-z][a-z])$/;
    return text.match(mailformat);
}

exports.validateRecaptcha = function(request)
{
    return new Promise((ok, cancel) => {
        if (g_constants.share.recaptchaEnabled == false) return cancel(new Error('Recapcha disabled'));
    
        if (!request.body || !request.body['g-recaptcha-response']) return cancel(new Error('Bad Request'));
    
        exports.postHTTP(
            "https://www.google.com/recaptcha/api/siteverify?secret="+g_constants.recaptcha_priv_key+"&response="+request.body['g-recaptcha-response'], 
            {}, 
            (code, data) => {
                try {
                    var ret = data ? JSON.parse(data) : {};
                    if (!data) return cancel(new Error('Recaptcha failed'));
                        
                    ok('');
                }
                catch(e) {
                    cancel(new Error('Recaptcha failed'));
                }
            }
        );
    });
}

// Where fileName is name of the file and response is Node.js Reponse. 
const responseFile = (path, response, type) => {
  // Check if file specified by the filePath exists 
  fs.exists(path, function(exists){
      if (exists) {     
        // Content-type is very interesting part that guarantee that
        // Web browser will handle response in an appropriate manner.
        response.writeHead(200, {
          "Content-Type": type || "application/javascript"
        });
        fs.createReadStream(path).pipe(response);
      } else {
        response.writeHead(400, {"Content-Type": "text/plain"});
        response.end("ERROR File does not exist");
      }
    });
  }

exports.LoadPrivateJS = function(req, res, path)
{
    try {
        exports.GetSessionStatus(req, status => {
            if (status.id == 1)
                return responseFile('./views/pages'+path, res);
            
            admin_utils.GetUserRole(status.id, info => {
                if (info.role == 'Support' && path.indexOf('staff.js') > 0)
                    return responseFile('./views/pages'+path, res);
                if (info.role == 'Chat-admin' && path.indexOf('chatadmin.js') > 0)
                    return responseFile('./views/pages'+path, res);

                responseFile('./views/pages/private_js/empty.js'+path, res);
            })
        });
    } 
    catch(e) {
        console.log(e.message);
    }
}

exports.CheckCoin = function(coin, callback)
{
    g_constants.dbTables['coins'].selectAll('*', 'name="'+escape(coin)+'"', '', (err, rows) => {
        if (err || !rows || !rows.length)
            return setTimeout(callback, 10, {result: false, message: err.message || 'Coin "'+coin+'" not found'});

        try { rows[0].info = JSON.parse(exports.Decrypt(rows[0].info));}
        catch(e) {callback({result: false, message: e.message});}

        if (rows[0].info.active != true)
            return setTimeout(callback, 10, {result: false, message: 'Coin "'+coin+'" is not active', info: rows[0].info});
 
        if (rows[0].info.orders == 'Disabled')
            return setTimeout(callback, 10, {result: false, message: 'Coin "'+coin+'" orders is temporarily disabled', info: rows[0].info});
        
        if (g_constants.share.tradeEnabled == false)
            return setTimeout(callback, 10, {result: false, message: 'Trading is temporarily disabled', info: rows[0].info});

        setTimeout(callback, 10, {result: true, info: rows[0].info});
    });
}

exports.GetCoinFromTicker = function(ticker, callback)
{
    return new Promise(async (ok, cancel) => {
        try {
            const rows = await g_constants.dbTables['coins'].Select('ROWID AS id, *', 'ticker="'+escape(ticker)+'"', '');
            if (!rows || !rows.length || !rows[0].name) throw new Error('Coin ticker ('+escape(ticker)+') not found!');
            return ok(rows[0]);
        }
        catch(e) {
            return cancel(e);
        }
    });
}
