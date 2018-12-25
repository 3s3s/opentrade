'use strict';
const g_constants = require("./constants.js");
const g_crypto = require('crypto');

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

exports.renderJSON = function(req, res, params)
{
    
    let end = JSON.stringify({}); 
    try { end = JSON.stringify(params) } catch(e) {}
    
    try {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(end);
    }
    catch(e) {};
};

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
            /*if (nIndex+1 >= array.length) {
                //if all processed then stop and return from 'ForEachSync'
                //console.log('success: ForEachSync_Run_cbEndOne return all ok');
                cbEndAll(false);
                return;
            }*/
            if (!cbEndOne)
            {
                if (nIndex+1 < array.length)
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
