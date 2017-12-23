'use strict';

const url = require('url');
const utils = require("../../utils.js");
const g_constants = require("../../constants.js");

exports.ShowMainAdminPage = function(req, res)
{
    try {
        utils.GetSessionStatus(req, status => {
            if (status.id != 1)
            {
                utils.render(res, 'pages/index', {path : url.parse(req.url, true).path, status : status});
                return;
            }
            utils.render(res, 'pages/admin/main', {path : url.parse(req.url, true).path, status : status});
        });
    } 
    catch(e) {
        console.log(e.message);
    }
}

