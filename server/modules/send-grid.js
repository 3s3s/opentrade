'use strict';

const g_constants = require("../constants.js");
const sgMail = require('@sendgrid/mail');


sgMail.setApiKey(process.env.SENDGRID_API_KEY || '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');

exports.SendGridSignupConfirmation = function(email, url, urlCheck)
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


    return new Promise((resolve,reject)=>{

		sgMail
			.send(msg)
			.then(resolve)
			.catch(reject);
				
	});
    
    /*try
    {
        let isSent = false;
        sendmail({
            from: 'OpenTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
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
    }*/

};


exports.SendGridPasswordResetConfirmation = function(email, user, url, urlCheck)
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



    return new Promise((resolve,reject)=>{

		sgMail
			.send(msg)
			.then(resolve)
			.catch(reject);
				
	});
    
    // try
    // {
    //     let isSent = false;
    //     sendmail({
    //         from: 'OpenTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
    //         to: unescape(email),
    //         subject: subject,
    //         html: body,
    //     }, 
    //     (err, reply) => {
    //         if (isSent)
    //             return;
    //         isSent = true;
    //         if (err)
    //         {
    //             callback({error: true, message: 'Error with your mail server: '+err.message});
    //             return;
    //         }
    //         callback({error: false, message: ''});
    //         /*console.log(JSON.stringify(err));
    //         console.log(err && err.stack);
    //         console.dir(reply);*/
    //     });        
    // }   
    // catch(err) {
    //     callback({error: true, message: err.message})
    // }
}

exports.SendGridTicket = function(ticket)
{

    const msg = {
            from: 'OpenTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            sender: g_constants.NOREPLY_EMAIL,
            to: g_constants.SUPPORT_EMAIL,
            replyTo: unescape(ticket.email),
            subject: 'Ticket from OpenTrades #'+ticket.id+": "+unescape(ticket.subject),
            html: unescape(ticket.message),
        }

    return new Promise((resolve,reject)=>{

        sgMail
            .send(msg)
            .then(resolve)
            .catch(reject);
                
    });
    // try
    // {
    //     let isSent = false;
    //     sendmail({
    //         from: 'OpenTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
    //         sender: g_constants.NOREPLY_EMAIL,
    //         to: g_constants.SUPPORT_EMAIL,
    //         replyTo: unescape(ticket.email),
    //         subject: 'Ticket from OpenTrades #'+ticket.id+": "+unescape(ticket.subject),
    //         html: unescape(ticket.message),
    //     }, 
    //     (err, reply) => {
    //         if (isSent)
    //             return;
    //         isSent = true;
    //         if (err)
    //         {
    //             callback({error: true, message: 'Error with your mail server: '+err.message});
    //             return;
    //         }
    //         callback({error: false, message: ''});
    //     });        
    // }   
    // catch(err) {
    //     callback({error: true, message: err.message})
    // }
    
}

exports.SendGridWithdrawConfirmation = function(email, user, url, urlCheck)
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


    return new Promise((resolve,reject)=>{

        sgMail
            .send(msg)
            .then(resolve)
            .catch(reject);
                
    });
    
    /*try
    {
        let isSent = false;
        sendmail({
            from: 'OpenTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
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
    }*/
    
}

exports.SendGridStartAppNotification = function()
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

    return new Promise((resolve,reject)=>{

        sgMail
            .send(msg)
            .then(resolve)
            .catch(reject);
                
    });

    /*try
    {
        let isSent = false;
        sendmail({
            from: 'OpenTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            sender: g_constants.NOREPLY_EMAIL,
            to: g_constants.SUPPORT_EMAIL,
            replyTo: unescape(g_constants.NOREPLY_EMAIL),
            subject: 'OpenTrade process starting notification email',
            html: unescape("OpenTrade started"),
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
    }*/
    
}
exports.SendGridAdminNotify = function(message)
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

    return new Promise((resolve,reject)=>{

        sgMail
            .send(msg)
            .then(resolve)
            .catch(reject);
                
    });
    /*try
    {
        let isSent = false;
        sendmail({
            from: 'OpenTrade Mailer <'+g_constants.NOREPLY_EMAIL+'>',
            sender: g_constants.NOREPLY_EMAIL,
            to: g_constants.SUPPORT_EMAIL,
            replyTo: unescape(g_constants.NOREPLY_EMAIL),
            subject: 'OpenTrade Admin activity notification email',
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
    }*/
    
}