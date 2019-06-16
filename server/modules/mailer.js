'use strict';

const g_constants = require("../constants.js");

console.log('option '+ (g_constants.MAILER.service));
console.log('option '+ (g_constants.MAILER.user));
console.log('option '+ (g_constants.MAILER.pass));

var nodemailer = require('nodemailer');

async function sendEmail(options,callback)
{
    try
    {
    	console.log('nodemailer '+ (typeof nodemailer));
    
    
	var mailer = nodemailer.createTransport({
			  service: g_constants.MAILER.service,
			  auth: {
			    user: g_constants.MAILER.user,
			    pass: g_constants.MAILER.pass,
			  }
			});
    	console.log('mailer '+ (typeof mailer));
    
        let isSent = false;
        await mailer.sendMail(options, 
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

exports.SendPIN = function(email, user, pin, callback)
{
    const subject = g_constants.MAILER_NAME+' login confirmation';
    const body = 
        "<h3>Hello "+decodeURI(user)+"</h3>" +
        "<p>You have recently reveived instructions to enter a one-time authentication code in order to log into your "+g_constants.OPENTRADE+" account. Your code is:</p>" +
        "<p>"+pin+"</p>" +
        "<p>For security reasons, this code will expire in 5 minutes.</p>" +
        "<p>If you did not request this code? you should <a href='https://"+g_constants.DOMAIN+"/profile'>change</a> or <a href='https://"+g_constants.DOMAIN+"/password_reset'>reset</a> your "+g_constants.OPENTRADE+" password immidiately.</p>" +
        "</br></br>Best Regards,<br>"+g_constants.OPENTRADE+" Team";  
	sendEmail({
	  from: g_constants.OPENTRADE+' Mailer <'+g_constants.NOREPLY_EMAIL+'>',
	  to: decodeURI(email),
	  subject,
	  html: body
	},callback);
}

exports.SendSignupConfirmation = function(email, url, urlCheck, callback)
{
    const subject = g_constants.MAILER_NAME+' signup confirmation letter';
    const urlHREF = "<a href='"+url+"'>"+url+"</a>";
    const confirmHREF = "<a href='"+urlCheck+"'>Click here to proceed with registration</a>";
    const body = 
        "<h3>Hello</h3>" +
        "<p>You received this message as you have given this e-mail address during registration at "+urlHREF + "</p>" +
        "<p>If you didn't register there and received this message by mistake, please ignore and delete it. </p>"+
        "<p>"+confirmHREF+"</p>" +
        "<p>This is an automated message. Please, do not reply to it.</p>" +
        "<p>Welcome to "+g_constants.OPENTRADE+"!</br></br>Best Regards,<br>"+g_constants.OPENTRADE+" Team";
	sendEmail({
            from: g_constants.OPENTRADE+' Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            to: decodeURI(email),
            subject: subject,
            html: body,
	},callback);
};

exports.SendPasswordResetConfirmation = function(email, user, url, urlCheck, callback)
{
    const subject = g_constants.MAILER_NAME+' password reset confirmation';

    const confirmHREF = "<a href='"+urlCheck+"'>Click here to reset your password</a>";

    const body = 
        "<h3>Hello "+decodeURI(user)+"</h3>" +
        "<p>Someone requested that the password for your "+g_constants.OPENTRADE+" account be reset</p>" +
        "<p>"+confirmHREF+"</p>" +
        "<p>If you didn't request this, you can ignore this e-mail or let us know. Your password won't change until you create a new password</p>" +
        "<p>This is an automated message. Please, do not reply to it.</p>" +
        "</br></br>Best Regards,<br>"+g_constants.OPENTRADE+" Team";
	sendEmail({
            from: g_constants.OPENTRADE+' Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            to: decodeURI(email),
            subject: subject,
            html: body,
	},callback);
}

exports.SendTicket = function(ticket, callback)
{
	sendEmail({
            from: g_constants.OPENTRADE+' Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            to: g_constants.SUPPORT_EMAIL,
            replyTo: decodeURI(ticket.email),
            subject: g_constants.MAILER_NAME+' Ticket #'+ticket.id+": "+decodeURI(ticket.subject),
            html: decodeURI(ticket.message),
	},callback);
}

exports.SendWithdrawConfirmation = function(email, user, url, urlCheck, callback)
{
    const subject = g_constants.MAILER_NAME+' withdraw confirmation';
    const confirmHREF = "<a href='"+urlCheck+"'>Click here to confirm withdraw</a>";
    const body = 
        "<h3>Hello "+decodeURI(user)+"</h3>" +
        "<p>Someone requested withdraw from your "+g_constants.OPENTRADE+" balance</p>" +
        "<p>"+confirmHREF+"</p>" +
        "<p>If you didn't request this, you can ignore this e-mail or let us know.</p>" +
        "<p>This is an automated message. Please, do not reply to it.</p>" +
        "</br></br>Best Regards,<br>"+g_constants.OPENTRADE+" Team";
	sendEmail({
            from: g_constants.OPENTRADE+' Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            to: decodeURI(email),
            subject: subject,
            html: body,
	},callback);
}

exports.SendStartAppNotification = function(callback)
{
	sendEmail({
            from: g_constants.OPENTRADE+' Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            to: g_constants.SUPPORT_EMAIL,
            replyTo: decodeURI(g_constants.NOREPLY_EMAIL),
            subject: g_constants.MAILER_NAME+' process starting notification email',
            html: decodeURI(g_constants.START_MESSAGE),
	},callback); 
}
exports.SendAdminNotify = function(message, callback)
{
	sendEmail({
            from: g_constants.OPENTRADE+' Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            to: g_constants.SUPPORT_EMAIL,
            replyTo: decodeURI(g_constants.NOREPLY_EMAIL),
            subject: g_constants.MAILER_NAME+' Admin activity notification email',
            html: decodeURI(message),
	},callback);
}








