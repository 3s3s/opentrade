'use strict';

const utils = require("../utils.js");
const g_constants = require("../constants.js");

const mailer = require("./mailer.js");

exports.onSubmit = async function(req, res)
{
    try {
        await utils.validateRecaptcha(req);
        validateForm(req, ret => {
            if (ret.error)
                return SupportError(req, res, ret.message);

            CreateTicket(req, res, req.body['email'], req.body['subject'], req.body['message']);
        });
    }
    catch(e) {
        SupportError(req, res, e.message);
    }

    function validateForm(req, callback)
    {
        if (!req.body || !req.body['email'] || !req.body['subject'] || !req.body['message'])
        {
            callback({error: true, message: 'Bad Request'});
            return;
        }
        
        if (!utils.ValidateEmail(req.body['email']))
        {
            callback({error: true, message: 'Ivalid email'});
            return;
        }
        callback({error: false, message: ''});
    }

}
function CreateTicket(request, responce, email, subject, message)
{
    const hash = utils.Hash(Date.now()+subject+email+message+Math.random());
    g_constants.dbTables['support'].insert(hash, Date.now(), subject, email, message, 'open', function(err) {
        if (err)
        {
            SupportError(request, responce, 'Error at creating ticket. Please try again.');
            return;
        }
        g_constants.dbTables['support'].selectAll("ROWID AS id, *", "hash='"+escape(hash)+"'", "", (err, rows) => {
            if (err || !rows || !rows.length)
            {
                SupportError(request, responce, 'Error at creating ticket. Please try again.');
                return;
            }
            mailer.SendTicket(rows[0], ret => {
                if (ret.error)
                {
                    SupportError(request, responce, ret.message);
                    return;
                }
                SupportSuccess(request, responce, {});
            });
        });
    });
}

function SupportSuccess(request, responce, message)
{
    utils.renderJSON(request, responce, {result: true, message: message});
}

function SupportError(request, responce, message)
{
    utils.renderJSON(request, responce, {result: false, message: message});
}