const { Redis } = require('ioredis')

let redis

// Never connect to a real Redis instance when running tests
if (process.env.NODE_ENV === 'test') {
    redis = {
        set: async () => {},
        get: async () => null,
        del: async () => {},
        quit: async () => {}
    }
} else if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
    redis = new Redis({
        port: process.env.REDIS_PORT,
        host: process.env.REDIS_HOST,
        password: process.env.REDIS_PASSWORD
    })

    redis.on('connect', () => {
        console.log('connected to redis')
    })

    redis.on('error', (err) => {
        console.error('Redis connection error:', err)
    })
} 


module.exports = redis