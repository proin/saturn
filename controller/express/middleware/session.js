'use strict';

module.exports = (config)=> {
    let session = require("express-session");

    if (config.redis) {
        const connectRedis = require("connect-redis");
        const Redis = require("ioredis");
        let RedisStore = connectRedis(session);
        let redisClient = new Redis(config.redis);
        config.session.store = new RedisStore({client: redisClient});
        global.session = session(config.session);
    } else {
        global.session = session(config.session);
    }

    return global.session;
};