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
        sendmail({
            from: g_constants.NOREPLY_EMAIL,
            to: email,
            subject: subject,
            html: body,
        }, 
        (err, reply) => {
            console.log(err && err.stack);
            console.dir(reply);
        });        
    }   
    catch(err) {
        callback({error: true, message: err.message})
    }

};