
'use strict';

const g_constants = require("../constants.js");
const mailgun = require('mailgun-js')(g_constants.emailConfig);
var MailComposer = require('nodemailer/lib/mail-composer');


function validate(email){
    mailgun.validate(email, function (err, body) {
      if(body && body.is_valid){
        return true
      }else{
        return false
      }
    });
}



exports.SendMgSignupConfirmation = function(email, url, urlCheck)
{
    const subject = 'OpenTrade signup confirmation letter';

    const urlHREF = "<a href='"+url+"'>"+url+"</a>";
    const confirmHREF = "<a href='"+urlCheck+"'>Click here to proceed with registration</a>";

    const body = 
        "<h3>Hello</h3>" +
        "<p>You received this message as you have given this e-mail address during registration at "+urlHREF + "</p>" +
        "<p>If you didn't register there and received this message by mistake, please ignore and delete it. </p>"+
        "<p>"+confirmHREF+"</p>" +
        "<p>This is an automated message. Please, do not reply to it.</p>" +
        "<p>Welcome to OpenTrade!</br></br>Best Regards,<br>OpenTrade Team";

    const msg = {
            from: 'OpenTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            sender: g_constants.NOREPLY_EMAIL,
            to: unescape(email),
            subject: subject,
            html: body,
        };
    if(validate(unescape(email))){
    // if(validate(unescape(email)) || !validate(unescape(email))){

        var mail = new MailComposer(msg);
     
        mail.compile().build((err, message) => {
         
            var dataToSend = {
                to: unescape(email),
                message: message.toString('ascii')
            };
         
            mailgun.messages().sendMime(dataToSend, (sendError, body) => {
                if (sendError) {
                    console.log("got an error1");
                    console.log(sendError);
                    return;
                }else{
                   console.log('mail gun mail send success'); 
                   console.log(body); 
                }
            });
        });
    }else{
        console.log('wrong email')
    }

};


exports.SendMgPasswordResetConfirmation = function(email, user, url, urlCheck)
{
    const subject = 'OpenTrade password reset confirmation';

    const confirmHREF = "<a href='"+urlCheck+"'>Click here to reset your password</a>";

    const body = 
        "<h3>Hello "+unescape(user)+"</h3>" +
        "<p>Someone requested that the password for your OpenTrade account be reset</p>" +
        "<p>"+confirmHREF+"</p>" +
        "<p>If you didn't request this, you can ignore this e-mail or let us know. Your password won't change until you create a new password</p>" +
        "<p>This is an automated message. Please, do not reply to it.</p>" +
        "</br></br>Best Regards,<br>OpenTrade Team";

    const msg = {
            from: 'OpenTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            to: unescape(email),
            subject: subject,
            html: body,
        }



    var mail = new MailComposer(msg);
 
    mail.compile().build((err, message) => {
     
        var dataToSend = {
            to: unescape(email),
            message: message.toString('ascii')
        };
     
        mailgun.messages().sendMime(dataToSend, (sendError, body) => {
            if (sendError) {
                console.log("got an error2");
                console.log(sendError);
                return;
            }else{
               console.log('mail gun mail send success'); 
               console.log(body); 
            }
        });
    });
    
}

exports.SendMgTicket = function(ticket)
{

    const msg = {
            from: 'OpenTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            sender: g_constants.NOREPLY_EMAIL,
            to: g_constants.SUPPORT_EMAIL,
            replyTo: unescape(ticket.email),
            subject: 'Ticket from OpenTrades #'+ticket.id+": "+unescape(ticket.subject),
            html: unescape(ticket.message),
        }

    var mail = new MailComposer(msg);
 
    mail.compile().build((err, message) => {
     
        var dataToSend = {
            to: unescape(email),
            message: message.toString('ascii')
        };
     
        mailgun.messages().sendMime(dataToSend, (sendError, body) => {
            if (sendError) {
                console.log("got an error3");
                console.log(sendError);
                return;
            }else{
               console.log('mail gun mail send success'); 
               console.log(body); 
            }
        });
    });
    
}

exports.SendMgWithdrawConfirmation = function(email, user, url, urlCheck)
{
    const subject = 'OpenTrade withdraw confirmation';

    const confirmHREF = "<a href='"+urlCheck+"'>Click here to confirm withdraw</a>";

    const body = 
        "<h3>Hello "+unescape(user)+"</h3>" +
        "<p>Someone requested withdraw from your OpenTrade balance</p>" +
        "<p>"+confirmHREF+"</p>" +
        "<p>If you didn't request this, you can ignore this e-mail or let us know.</p>" +
        "<p>This is an automated message. Please, do not reply to it.</p>" +
        "</br></br>Best Regards,<br>OpenTrade Team";


    const msg = {
            from: 'OpenTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            sender: g_constants.NOREPLY_EMAIL,
            to: unescape(email),
            subject: subject,
            html: body,
        }
    
    if(validate(unescape(email))){
    // if(validate(unescape(email)) || !validate(unescape(email))){
        var mail = new MailComposer(msg);
     
        mail.compile().build((err, message) => {
         
            var dataToSend = {
                to: unescape(email),
                message: message.toString('ascii')
            };
         
            mailgun.messages().sendMime(dataToSend, (sendError, body) => {
                if (sendError) {
                    console.log("got an error4");
                    console.log(sendError);
                    return;
                }else{
                   console.log('mail gun mail send success'); 
                   console.log(body); 
                }
            });
        });
    }else{
        console.log('wrong email address')
    }
    
}

exports.SendMgStartAppNotification = function()
{
    let isSent = false;
    const msg = {
            from: 'OpenTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            sender: g_constants.NOREPLY_EMAIL,
            to: g_constants.SUPPORT_EMAIL,
            replyTo: unescape(g_constants.NOREPLY_EMAIL),
            subject: 'OpenTrade process starting notification email',
            html: unescape("OpenTrade started"),
        }

   var mail = new MailComposer(msg);
 
    mail.compile().build((err, message) => {
     
        var dataToSend = {
            to:  g_constants.SUPPORT_EMAIL,
            message: message.toString('ascii')
        };
     
        mailgun.messages().sendMime(dataToSend, (sendError, body) => {
            if (sendError) {
                console.log("got an error5");
                console.log(sendError);
                return;
            }else{
               console.log('mail gun mail send success'); 
               console.log(body); 
            }
        });
    });
    
}
exports.SendMgAdminNotify = function(message)
{
    let isSent = false;
    const msg = {
            from: 'OpenTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            sender: g_constants.NOREPLY_EMAIL,
            to: g_constants.SUPPORT_EMAIL,
            replyTo: unescape(g_constants.NOREPLY_EMAIL),
            subject: 'OpenTrade Admin activity notification email',
            html: unescape(message),
        }

    var mail = new MailComposer(msg);
 
    mail.compile().build((err, message) => {
     
        var dataToSend = {
            to: unescape(email),
            message: message.toString('ascii')
        };
     
        mailgun.messages().sendMime(dataToSend, (sendError, body) => {
            if (sendError) {
                console.log("got an error6");
                console.log(sendError);
                return;
            }else{
               console.log('mail gun mail send success'); 
               console.log(body); 
            }
        });
    });
    
}



