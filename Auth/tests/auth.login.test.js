const request = require('supertest')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { MongoMemoryServer } = require('mongodb-memory-server')
process.env.NODE_ENV = 'test'
const app = require('../src/app')
const userModel = require('../src/models/user.model')

jest.setTimeout(60000)

let mongoServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()
  process.env.MONGO_URL = uri
  process.env.JWT_KEY = 'test_jwt_key'
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
})

describe('POST /api/auth/login', () => {
  // Note: Login requires either `username` or `email` AND `password`.

  test('succeeds with username and password', async () => {
    const password = 'Secret123!'
    const hash = await bcrypt.hash(password, 10)
    await userModel.create({
      username: 'loginuser',
      email: 'loginuser@example.com',
      password: hash,
      fullname: { firstname: 'Login', lastname: 'User' }
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginuser', password })

    expect([200, 201]).toContain(res.status)
    expect(res.headers['content-type']).toMatch(/json/)
  })

  test('succeeds with email and password', async () => {
    const password = 'Secret456!'
    const hash = await bcrypt.hash(password, 10)
    await userModel.create({
      username: 'emailuser',
      email: 'emailuser@example.com',
      password: hash,
      fullname: { firstname: 'Email', lastname: 'User' }
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'emailuser@example.com', password })

    expect([200, 201]).toContain(res.status)
    expect(res.headers['content-type']).toMatch(/json/)
  })

  test('returns 400 when neither username nor email provided', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'whatever' })

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  test('returns 400 when password missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'someuser' })

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })
})
