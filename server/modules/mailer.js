'use strict';

const g_constants = require("../constants.js");
var nodemailer = require('nodemailer');

// Create the transporter with the required configuration for Zoho
// Change the user and password!
var mailerTransport = nodemailer.createTransport({
    host: g_constants.MAILER_SMTP_HOST,
    port: g_constants.MAILER_SMTP_PORT,
    secure: g_constants.MAILER_SMTP_SECURE, // use SSL
    auth: {
        user: g_constants.MAILER_SMTP_USER,
        pass: g_constants.MAILER_SMTP_PASS
    }
});


exports.SendSignupConfirmation = function(email, url, urlCheck, callback)
{
    console.log('Sending confirmation mail...');
    const subject = g_constants.MAILER_NAME+' signup confirmation letter';

    const urlHREF = "<a href='"+url+"'>"+url+"</a>";
    const confirmHREF = "<a href='"+urlCheck+"'>Click here to proceed with registration</a>";

    const body = 
        "<h3>Hello</h3>" +
        "<p>You received this message as you have given this e-mail address during registration at "+urlHREF + "</p>" +
        "<p>If you didn't register there and received this message by mistake, please ignore and delete it. </p>"+
        "<p>"+confirmHREF+"</p>" +
//        "<p>Registration code is valid for 1 hour</p>" +
        "<p>This is an automated message. Please, do not reply to it. If you do need help, please email info@exchange.zsmart.org</p>" +
        "<p>Welcome to ZTrade! </br></br>Best Regards,<br>The DeltaX Team";
    
    try
    {
        let isSent = false;
        mailerTransport.sendMail({
            from: 'ZTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            sender: g_constants.NOREPLY_EMAIL,
            to: unescape(email),
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

exports.SendPasswordResetConfirmation = function(email, user, url, urlCheck, callback)
{
    const subject = g_constants.MAILER_NAME+' password reset confirmation';

    const confirmHREF = "<a href='"+urlCheck+"'>Click here to reset your password</a>";

    const body = 
        "<h3>Hello "+unescape(user)+"</h3>" +
        "<p>Someone requested that the password for your ZTrade account be reset</p>" +
        "<p>"+confirmHREF+"</p>" +
        "<p>If you didn't request this, you can ignore this e-mail or let us know. Your password won't change until you create a new password</p>" +
        "<p>This is an automated message. Please, do not reply to it. If you do need help, please email info@exchange.zsmart.org</p>" +
        "</br></br>Best Regards,<br>DeltaX Team";
    
    try
    {
        let isSent = false;
        mailerTransport.sendMail({
            from: 'ZTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            to: unescape(email),
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
}

exports.SendTicket = function(ticket, callback)
{
    try
    {
        let isSent = false;
        mailerTransport.sendMail({
            from: 'ZTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            sender: g_constants.NOREPLY_EMAIL,
            to: g_constants.SUPPORT_EMAIL,
            replyTo: unescape(ticket.email),
            subject: g_constants.MAILER_NAME+' Ticket #'+ticket.id+": "+unescape(ticket.subject),
            html: unescape(ticket.message),
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
        });        
    }   
    catch(err) {
        callback({error: true, message: err.message})
    }
    
}

exports.SendWithdrawConfirmation = function(email, user, url, urlCheck, callback)
{
    const subject = g_constants.MAILER_NAME+' withdraw confirmation';

    const confirmHREF = "<a href='"+urlCheck+"'>Click here to confirm withdraw</a>";

    const body = 
        "<h3>Hello "+unescape(user)+"</h3>" +
        "<p>Someone requested withdraw from your ZTrade balance</p>" +
        "<p>"+confirmHREF+"</p>" +
        "<p>If you didn't request this, you can ignore this e-mail or let us know.</p>" +
        "<p>This is an automated message. Please, do not reply to it. If you do need help, please email info@exchange.zsmart.org</p>" +
        "</br></br>Best Regards,<br>DeltaX Team";
    
    try
    {
        let isSent = false;
        mailerTransport.sendMail({
            from: 'ZTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            sender: g_constants.NOREPLY_EMAIL,
            to: unescape(email),
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
        });        
    }   
    catch(err) {
        callback({error: true, message: err.message})
    }
    
}

exports.SendStartAppNotification = function(callback)
{
    try
    {
        let isSent = false;
        mailerTransport.sendMail({
            from: 'ZTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            sender: g_constants.NOREPLY_EMAIL,
            to: g_constants.SUPPORT_EMAIL,
            replyTo: unescape(g_constants.NOREPLY_EMAIL),
            subject: g_constants.MAILER_NAME+' process starting notification email',
            html: unescape(g_constants.START_MESSAGE),
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
        });        
    }   
    catch(err) {
        callback({error: true, message: err.message})
    }
    
}
exports.SendAdminNotify = function(message, callback)
{
    try
    {
        let isSent = false;
        mailerTransport.sendMail({
            from: 'ZTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            sender: g_constants.NOREPLY_EMAIL,
            to: g_constants.SUPPORT_EMAIL,
            replyTo: unescape(g_constants.NOREPLY_EMAIL),
            subject: g_constants.MAILER_NAME+' Admin activity notification email',
            html: unescape(message),
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
        });        
    }   
    catch(err) {
        callback({error: true, message: err.message})
    }
    
}
