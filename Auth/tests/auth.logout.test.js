const request = require('supertest')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { MongoMemoryServer } = require('mongodb-memory-server')
const app = require('../src/app')
const userModel = require('../src/models/user.model')
const redis = require('../src/db/redis')

jest.setTimeout(60000)

let mongoServer

beforeAll(async () => {
  process.env.NODE_ENV = 'test'
  process.env.JWT_KEY = 'test_jwt_key'
  mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()
  process.env.MONGO_URL = uri
  await mongoose.connect(uri)
})

afterEach(async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
})

afterAll(async () => {
  await mongoose.disconnect()
  if (mongoServer) await mongoServer.stop()
  if (redis && typeof redis.quit === 'function') {
    await redis.quit()
  }
})

describe('POST /api/auth/logout', () => {
  test('returns 200 and clears the token cookie after login', async () => {
    const password = 'Logout123!'
    const hash = await bcrypt.hash(password, 10)

    await userModel.create({
      username: 'logoutuser',
      email: 'logoutuser@example.com',
      password: hash,
      fullname: { firstname: 'Logout', lastname: 'User' }
    })

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'logoutuser', password })

    expect(loginRes.status).toBe(200)
    const cookie = loginRes.headers['set-cookie']
    expect(cookie).toBeDefined()

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie)

    expect(logoutRes.status).toBe(200)
    expect(logoutRes.body).toMatchObject({ message: 'Logout successful' })
    expect(logoutRes.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('token=')
      ])
    )
  })

  test('is idempotent: second logout still returns 200', async () => {
    const res1 = await request(app).post('/api/auth/logout')
    expect(res1.status).toBe(200)
    expect(res1.body).toMatchObject({ message: 'Logout successful' })

    const res2 = await request(app).post('/api/auth/logout')
    expect(res2.status).toBe(200)
    expect(res2.body).toMatchObject({ message: 'Logout successful' })
  })
})
