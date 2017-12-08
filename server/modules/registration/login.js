'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");

exports.onSubmit = function(req, res)
{
    const responce = res;
    const request = req;
    utils.validateRecaptcha(req, ret => {
        if (ret.error)
        {
            LoginError(request, responce, ret.message);
            return;
        }
        validateForm(req, ret => {
            if (ret.error)
            {
                LoginError(request, responce, ret.message);
                return;
            }
            Login(req, res);
        });
    });
}

function validateForm(request, callback)
{
    if (!request.body || !request.body['username'] || !request.body['password'])
    {
        callback({error: true, message: 'Bad Request'});
        return;
    }
    callback({error: false, message: ''});
}


function Login(req, res)
{
    LoginSuccess(req, res, {});
}

function LoginSuccess(request, responce, message)
{
    utils.renderJSON(request, responce, {result: true, message: message});
}

function LoginError(request, responce, message)
{
    utils.renderJSON(responce, {result: false, message: message});
}