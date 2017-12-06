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
            SignupError(request, responce, ret.message);
            return;
        }
        Signup(req, res);
    });
}

function Signup(req, res)
{
    SignupSuccess(req, res, {});
}

function SignupSuccess(request, responce, message)
{
    utils.renderJSON(request, responce, {result: true, message: message});
}

function SignupError(request, responce, message)
{
    utils.renderJSON(responce, {result: false, message: message});
}