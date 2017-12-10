'use strict';

const g_constants = require("../../constants.js");
const sendmail = require('sendmail')();


exports.SendSignupConfirmation = function(email, url, urlCheck, callback)
{
    const subject = 'OpenTrade signup confirmation letter';

    const urlHREF = "<a href='"+url+"'>"+url+"</a>";
    const confirmHREF = "<a href='"+urlCheck+"'>Click here to proceed with registration</a>";

    const body = 
        "<h3>Hello</h3>" +
        "<p>You received this message as you have given this e-mail address during registration at "+urlHREF + "</p>" +
        "<p>If you didn't register there and received this message by mistake, please ignore and delete it. </p>"+
        "<p>"+confirmHREF+"</p>" +
//        "<p>Registration code is valid for 1 hour</p>" +
        "<p>This is an automated message. Please, do not reply to it.</p>" +
        "<p>Welcome to OpenTrade!</br></br>Best Regards,<br>OpenTrade Team";
    
    try
    {
        let isSent = false;
        sendmail({
            from: g_constants.NOREPLY_EMAIL,
            to: email,
            subject: subject,
            html: body,
        }, 
        (err, reply) => {
            if (isSent)
                return;
            isSent = true;
            if (err)
            {
                callback({error: true, message: 'Error with your mail server: '+err.message});
                return;
            }
            callback({error: false, message: ''});
            /*console.log(JSON.stringify(err));
            console.log(err && err.stack);
            console.dir(reply);*/
        });        
    }   
    catch(err) {
        callback({error: true, message: err.message})
    }

};

exports.SendPasswordResetConfirmation = function(email, url, urlCheck, callback)
{
    const subject = 'OpenTrade password reset confirmation';

    const urlHREF = "<a href='"+url+"'>"+url+"</a>";
    const confirmHREF = "<a href='"+urlCheck+"'>Click here to reset your password</a>";

    const body = 
        "<h3>Hello</h3>" +
        "<p>Someone requested that the password for your OpenTrade account be reset</p>" +
        "<p>"+confirmHREF+"</p>" +
        "<p>If you didn't request this, you can ignore this e-mail or let us know. Your password won't change until you create a new password</p>" +
        "<p>This is an automated message. Please, do not reply to it.</p>" +
        "</br></br>Best Regards,<br>OpenTrade Team";
    
    try
    {
        let isSent = false;
        sendmail({
            from: g_constants.NOREPLY_EMAIL,
            to: email,
            subject: subject,
            html: body,
        }, 
        (err, reply) => {
            if (isSent)
                return;
            isSent = true;
            if (err)
            {
                callback({error: true, message: 'sendmail error'});
                return;
            }
            callback({error: false, message: ''});
            /*console.log(JSON.stringify(err));
            console.log(err && err.stack);
            console.dir(reply);*/
        });        
    }   
    catch(err) {
        callback({error: true, message: err.message})
    }
    
}