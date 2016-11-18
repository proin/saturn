'use strict';

module.exports = (config)=> (req, res, next)=> {
    let checkout = {};

    checkout.signin = (user, pw)=> {
        try {
            if (config.user == user && config.password == pw) {
                req.session.user = user;
            }
        } catch (e) {
        }
        return req.session;
    };

    checkout.signout = ()=> {
        delete req.session.user;
    };

    checkout.check = ()=> {
        try {
            if (config.user && config.password)
                if (!req.session || !req.session.user) {
                    if (config.readonly)
                        return 'READONLY';
                    res.send({status: false, err: 'ACCESS DENIED'});
                    return 'DENIED';
                }
            return 'GRANTALL';
        } catch (e) {
            res.send({status: false, err: 'ACCESS DENIED'});
        }
        return 'DENIED';
    };

    req.user = checkout;

    next();
};