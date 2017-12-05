'use strict';

const utils = require("../utils.js");
const g_constants = require("../constants.js");

exports.onSubmit = function(req, res)
{
    const responce = res;
    validateRecaptcha(req, (ret) => {
        if (ret.error)
        {
            LoginError(responce, ret.message);
            return;
        }
    });
}

function validateRecaptcha(request, callback)
{
    console.log(JSON.stringify(request));
    if (!request['g-recaptcha-response'])
    {
        callback({error: true, message: 'Bad Request'});
        return;
    }
    
    utils.postHTTP(
        "https://www.google.com/recaptcha/api/siteverify", 
        {secret: g_constants.recaptcha_priv_key, response: request['g-recaptcha-response']}, 
        (code, data) => {
            var ret = data || {};
            if (!ret.success)
                ret['success'] = false;
                
            ret.error = ret.success;
            ret.message = ret.error ? 'Recaptcha failed' : '';
            
            callback(ret);
        }
    );
}

function LoginError(responce, message)
{
    utils.render(responce, 'pages/login', {result: false, message: message});
}