'use strict';

const dictionary = require("./dictionary.js");
const g_constants = require("./constants.js");
const http = require('http');
const https = require('https');
const url = require('url');

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

exports.GetSessionStatus = function(req, callback, key)
{
    callback('');
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
