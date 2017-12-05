'use strict';

const url = require('url');
const utils = require("./utils");
const login = require("./modules/login");

exports.handle = function(app)
{
    app.get('/', onMain);
    app.get('/index.html', onMain);
    
    app.get('/login', onLogin);
    app.post('/login', onLoginPost);
    app.get('/signup', onSignup);
    app.get('/password_reset', onPasswordReset);
    app.get('/support', onSupport);
};

function CommonRender(req, res, page)
{
    try {
        utils.GetSessionStatus(req, status => {
            utils.render(res, page, {path : url.parse(req.url, true).path, status : status});
        });
    } 
    catch(e) {
        console.log(e.message);
    }
}

function onMain(req, res)
{
    CommonRender(req, res, 'pages/index');
}

function onLogin(req, res)
{
    CommonRender(req, res, 'pages/login');
}
function onLoginPost(req, res)
{
    login.onSubmit(req, res);
}

function onSignup(req, res)
{
    CommonRender(req, res, 'pages/signup');
}

function onPasswordReset(req, res)
{
    CommonRender(req, res, 'pages/password_reset');
}

function onSupport(req, res)
{
    CommonRender(req, res, 'pages/support');
}
