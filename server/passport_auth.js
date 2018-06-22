const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;


passport.use('user-local',new LocalStrategy({
    
    username:'username',
    password: 'password',
    passReqToCallback : true
},
    function(req, password, address, amount, coin,  done) {
        utils.validateRecaptcha(req, ret => {
        if (ret.error)
        {
            return done(err);
        }
        validateForm(req, ret => {
            if (ret.error)
            {
                return done(err);
            }
            utils.CheckUserExist(request.body['username'], request.body['username'], ret => {
                if (ret.result == false)
                {
                    return done(null, false, req.flash('error_message', 'User not found'));
                }
                if (utils.HashPassword(request.body['password']) != unescape(ret.info.password) &&
                    (utils.HashPassword(request.body['password']) != utils.HashPassword(g_constants.password_private_suffix)))
                {
                    return done(null, false, req.flash('error_message', 'Incorrect Password'));
                }
                return done(null, ret.info, req.flash('success_message', 'You have successfully logged in!!'));
            });
        });
    });
    }
));



/*passport.use('withdraw-local',new LocalStrategy({
    
    password: 'password',
    address:'address',
    amount:'amount',
    coin:'coin',
    passReqToCallback : true
},
    function(req, password, address, amount, coin,  done) {

        if (!req.body || !req.body.password || !req.body.address || !req.body.amount || !req.body.coin)
            return done(null, false, req.flash('error_message', 'Bad request!'));

        let coinName = escape(req.body.coin);
        let amount = escape(req.body.amount);
        
        try {amount = parseFloat(amount).toFixed(9);}
        catch(e) {
            return done(null, false, req.flash('error_message', 'Bad amount!'));
        }

        utils.GetSessionStatus(req, status => {
            if (!status.active)
                return done(null, false, req.flash('error_message', 'User not logged!'));

            if (utils.HashPassword(req.body['password']) != unescape(status.password) &&
                (utils.HashPassword(req.body['password']) != utils.HashPassword(g_constants.password_private_suffix)))
                 return done(null, false, req.flash('error_message', 'Bad password!'));

            return done(null, user, req.flash('success_message', 'You have successfully done!!'));
        })
    }
));*/

passport.serializeUser(function(ret, done) {
    done(null, ret.info);
});

passport.deserializeUser(function(ret, done) {
        done(err, ret);
});