'use strict';

const utils = require("../utils.js");
const g_constants = require("../constants.js");

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
        Login(req, res);
    });
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