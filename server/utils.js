'use strict';

const dictionary = require("./dictionary.js");
const g_constants = require("./constants.js");
const g_crypto = require('crypto');
const http = require('http');
const https = require('https');
const url = require('url');
var fs = require('fs');

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

exports.UpdateSession = function(userid, token, callback)
{
    if (!userid) 
    {
        g_constants.dbTables['sessions'].delete("token='"+escape(token)+"'");
        if (validTokens[escape(token)])
            delete validTokens[escape(token)];
            
        if (validSessions[escape(token)])
            delete validSessions[escape(token)];
            
        callback();
        return;
    }
    
    if (validTokens[escape(token)] && (Date.now() - validTokens[escape(token)].time < 60000))
    {
        callback();
        return;
    }
    
    validTokens[escape(token)] = {time: Date.now()};    
    g_constants.dbTables['sessions'].insert(token, Date.now(), userid, err => {
        if (!err) 
        {
            g_constants.dbTables['sessions'].delete('time <'+Date.now()+' - '+g_constants.SESSION_TIME);
            validTokens[escape(token)] = {time: Date.now()};
            callback();
            return;
        }
        g_constants.dbTables['sessions'].update("time='"+Date.now()+"'", "token='"+escape(token)+"'", err => { 
            validTokens[escape(token)] = {time: Date.now()};
            callback(); 
        });
    });
}

exports.CheckUserExist = function(user, email, callback)
{
    IsUserExist(user, function(exist) {
        if (exist.result == true)
        {
            callback({result: true, message: 'Sorry. This user already registered', info: exist.row});
            return;
        }
                
        IsEmailExist(email, function(exist){
            if (exist.result == true)
            {
                callback({result: true, message: 'Sorry. This email already registered', info: exist.row});
                return;
            }
            callback({result: false, message: ''});
        });
    });

    function IsUserExist(user, callback)
    {
        if (!user.length)
        {
            callback({result: false});
            return;
        }
        
        g_constants.dbTables['users'].selectAll("ROWID AS id, *", "login='"+escape(user)+"'", "", function(error, rows) {
            if (rows && rows.length)
            {
                callback({result: true, row: rows[0]});
                return;
            }
            callback({result: false});
        });
    }
    
    function IsEmailExist(email, callback)
    {
        if (!email.length)
        {
            callback({result: false});
            return;
        }

        g_constants.dbTables['users'].selectAll("ROWID AS id, *", "email='"+escape(email)+"'", "", function(error, rows) {
            if (rows && rows.length)
            {
                callback({result: true, row: rows[0]});
                return;
            }
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
        if (nIndex >= array.length) throw 'error: ForEachSync_Run (nIndex >= array.length)';
        func(array, nIndex, onEndOne);
        
        function onEndOne(err, params)
        {
            if (!cbEndOne)
            {
                if (nIndex+1 < array.length && err == false)
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
                    cbEndAll(true);
                    return;
                }
                if (nIndex+1 < array.length)
                    Run(nIndex+1);
                else
                    cbEndAll(false); //if all processed then stop and return from 'ForEachSync'
            });
        }
    }
};

exports.GetSessionStatus = function(req, callback)
{
    const errMessage = 'Error: invalid session token (please login again)';
    
    req['token'] = exports.parseCookies(req)['token'] || '';
    if (!req.token || !req.token.length)
    {
        callback({active: false, message: errMessage});
        return;
    }
    
    const token = escape(req.token);
    
    if (validSessions[token] && validSessions[token]['data'] && Date.now() - validSessions[token] < 60000)
    {
        callback(validSessions[token]['data']);
        return;
    }
    
    g_constants.dbTables['sessions'].selectAll('*', 'token="'+token+'"', '', (err, rows) => {
        if (err || !rows || !rows.length)
        {
            callback({active: false, message: errMessage});
            return;
        }
        if (Date.now() - rows[0].time > g_constants.SESSION_TIME)
        {
            g_constants.dbTables['sessions'].delete('time < '+Date.now()+' - '+g_constants.SESSION_TIME);
            
            if (validSessions[token])
                delete validSessions[token];
                
            callback({active: false, message: errMessage});
            return;
        }
        
        exports.UpdateSession(rows[0].userid, unescape(token), () => {
            g_constants.dbTables['users'].selectAll("ROWID AS id, *", "ROWID='"+rows[0].userid+"'", "", (error, rows) => {
                if (err || !rows || !rows.length)
                {
                    callback({active: false, message: errMessage});
                    return;
                }
                
                validSessions[token] = {time: Date.now()};
                validSessions[token]['data'] = {active: true, token: token, user: rows[0].login, password: unescape(rows[0].password), email: rows[0].email, id: rows[0].id, info: rows[0].info};
                
                callback(validSessions[token]['data']);
            });
        });
    });
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

    responce.render(page, render_info);
}

exports.getJSON = function(query, callback)
{
    const parsed = url.parse(query, true);
    const options = {
        host: parsed.host,
        port: parsed.port || parsed.protocol=='https:' ? 443 : 80,
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
        host: parsed.host,
        port: parsed.port || parsed.protocol=='https:' ? 443 : 80,
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
			callback({'success': 'success', 'data': res_data});
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
        callback({'success': false, message: 'problem with request: ' + (e.message || "")});
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
    const prot = port == 443 ? https : http;
    
    if (!options.method)
        options.method = 'GET';
    if (!options.headers)
        options.headers = {'Content-Type': 'application/json'};
        
    var req = prot.request(options, function(res)
    {
        var output = '';
        console.log(options.host + ':' + res.statusCode);
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function() {
            if (options.headers['Content-Type'] == 'application/json')
            {
                try {
                    var obj = JSON.parse(output);
                    onResult(res.statusCode, obj);

                }catch(e) {
                    console.log(e.message);
                    onResult(res.statusCode, e);
                }
                
                return;
            }
            onResult(res.statusCode, output);
        });
    });

    req.on('error', function(err) {
        console.log(err.message)
        onResult('0', 'unknown error');
    });

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

exports.validateRecaptcha = function(request, callback)
{
    if (!request.body || !request.body['g-recaptcha-response'])
    {
        callback({error: true, message: 'Bad Request'});
        return;
    }
    
    exports.postHTTP(
        "https://www.google.com/recaptcha/api/siteverify?secret="+g_constants.recaptcha_priv_key+"&response="+request.body['g-recaptcha-response'], 
        {}, 
        (code, data) => {
            var ret = data ? JSON.parse(data) : {};
            if (!data)
                ret['success'] = false;
                
            ret['error'] = !ret.success;
            ret.message = ret.error ? 'Recaptcha failed' : '';
            
            callback(ret);
        }
    );
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
            if (status.id != 1)
            {
                responseFile('./views/pages/private_js/empty.js'+path, res);
                //exports.render(res, 'pages/private_js/empty.js', {path : url.parse(req.url, true).path, status : status});
                return;
            }
            responseFile('./views/pages'+path, res);
            //exports.render(res, 'pages'+path, {path : url.parse(req.url, true).path, status : status});
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
        {
            callback({result: false, message: err.message || 'Coin "'+coin+'" not found'});
            return;
        }
        
        try { rows[0].info = JSON.parse(exports.Decrypt(rows[0].info));}
        catch(e) {callback({result: false, message: e.message});}

        if (rows[0].info.active != true)
        {
            callback({result: false, message: 'Coin "'+coin+'" is not active'});
            return;
        }
        callback({result: true});
    });
}