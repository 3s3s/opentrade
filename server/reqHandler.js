'use strict';

const url = require('url');
const utils = require("./utils");

exports.handle = function(app)
{
    app.get('/', onMain);
    app.get('/index.html', onMain);
    
    app.get('/login', onLogin);
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

function onSupport(req, res)
{
    CommonRender(req, res, 'pages/support');
}
