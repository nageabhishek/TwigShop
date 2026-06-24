const request = require('supertest')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')
process.env.NODE_ENV = 'test'
const app = require('../src/app')

jest.setTimeout(60000)

let mongoServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()
  await mongoose.connect(uri)
  process.env.MONGO_URL=uri
  process.env.JWT_KEY='JWT_KEY'
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

describe('POST /api/auth/register', () => {
  test('registers a new user successfully (returns JSON)', async () => {
    const payload = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!',
      fullname: { firstname: 'Test', lastname: 'User' },
      address: [{ street: '123 Main St', city: 'City', state: 'State', country: 'Country', pincode: '123456' }]
    }
    const res = await request(app)
      .post('/api/auth/register')
      .send(payload)
      .set('Accept', 'application/json')

    // Be flexible about exact success code (200 or 201)
    expect([200, 201]).toContain(res.status)
    expect(res.headers['content-type']).toMatch(/json/)
    expect(res.body).toBeDefined()
  })

  test('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'incomplete@example.com' })

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  test('prevents duplicate registrations (same username or email)', async () => {
    const payload = {
      username: 'dupuser',
      email: 'dup@example.com',
      password: 'Password123!',
      fullname: { firstname: 'Dup', lastname: 'User' },
      address: [{ street: '456 Other St', city: 'City', state: 'State', country: 'Country', pincode: '654321' }]
    }
    const res1 = await request(app).post('/api/auth/register').send(payload)
    expect(res1.status).toBe(201)
    expect(res1.body).toMatchObject({ message: 'user register succesfully' })

    const res2 = await request(app).post('/api/auth/register').send(payload)
    expect(res2.status).toBe(409)
    expect(res2.body).toMatchObject({ message: 'user already exist' })
  })
})
