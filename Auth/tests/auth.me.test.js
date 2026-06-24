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

describe('GET /api/auth/me', () => {
  test('returns 401 when no auth cookie is present', async () => {
    const res = await request(app)
      .get('/api/auth/me')

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ message: 'Authentication token missing' })
  })

  test('returns user info when a valid login cookie is sent', async () => {
    const password = 'StrongPass123!'
    const hash = await bcrypt.hash(password, 10)

    await userModel.create({
      username: 'meuser',
      email: 'meuser@example.com',
      password: hash,
      fullname: { firstname: 'Me', lastname: 'User' }
    })

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'meuser', password })

    expect(loginRes.status).toBe(200)
    const cookie = loginRes.headers['set-cookie']
    expect(cookie).toBeDefined()

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('user')
    expect(res.body.user).toMatchObject({ username: 'meuser', email: 'meuser@example.com' })
  })

  test('GET /api/auth/users/me/addresses returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .get('/api/auth/users/me/addresses')

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ message: 'Authentication token missing' })
  })

  test('GET /api/auth/users/me/addresses returns saved addresses and marks default', async () => {
    const password = 'AddressPass123!'
    const hash = await bcrypt.hash(password, 10)

    const user = await userModel.create({
      username: 'addressuser',
      email: 'addressuser@example.com',
      password: hash,
      fullname: { firstname: 'Address', lastname: 'User' },
      addresses: [
        { street: '123 Main St', city: 'City', state: 'State', country: 'Country', pincode: '123456', isDefault: true },
        { street: '456 Second St', city: 'Other', state: 'State', country: 'Country', pincode: '654321', isDefault: false }
      ]
    })

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'addressuser', password })

    expect(loginRes.status).toBe(200)
    const cookie = loginRes.headers['set-cookie']
    expect(cookie).toBeDefined()

    const res = await request(app)
      .get('/api/auth/users/me/addresses')
      .set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('addresses')
    expect(Array.isArray(res.body.addresses)).toBe(true)
    expect(res.body.addresses).toHaveLength(2)
    expect(res.body.addresses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ street: '123 Main St', isDefault: true }),
        expect.objectContaining({ street: '456 Second St', isDefault: false })
      ])
    )
    expect(res.body.addresses.some(a => a.isDefault === true)).toBe(true)
  })

  test('POST /api/auth/users/me/addresses adds an address and returns 201', async () => {
    const password = 'AddPass123!'
    const hash = await bcrypt.hash(password, 10)

    await userModel.create({
      username: 'postaddressuser',
      email: 'postaddressuser@example.com',
      password: hash,
      fullname: { firstname: 'Post', lastname: 'Address' }
    })

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'postaddressuser', password })

    expect(loginRes.status).toBe(200)
    const cookie = loginRes.headers['set-cookie']
    expect(cookie).toBeDefined()

    const addRes = await request(app)
      .post('/api/auth/users/me/addresses')
      .set('Cookie', cookie)
      .send({
        street: '789 New Ave',
        city: 'NewCity',
        state: 'NewState',
        country: 'Country',
        pincode: '987654',
        phone: '1234567890',
        isDefault: true
      })

    expect(addRes.status).toBe(201)
    expect(addRes.body).toHaveProperty('address')
    expect(addRes.body.address).toMatchObject({
      street: '789 New Ave',
      city: 'NewCity',
      state: 'NewState',
      country: 'Country',
      pincode: '987654',
      isDefault: true
    })
    expect(addRes.body.address.phone).toBe('1234567890')
  })

  test('POST /api/auth/users/me/addresses returns 400 for invalid pincode or phone', async () => {
    const password = 'InvalidAddr123!'
    const hash = await bcrypt.hash(password, 10)

    await userModel.create({
      username: 'invalidaddressuser',
      email: 'invalidaddressuser@example.com',
      password: hash,
      fullname: { firstname: 'Invalid', lastname: 'Address' }
    })

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'invalidaddressuser', password })

    expect(loginRes.status).toBe(200)
    const cookie = loginRes.headers['set-cookie']
    expect(cookie).toBeDefined()

    const invalidRes = await request(app)
      .post('/api/auth/users/me/addresses')
      .set('Cookie', cookie)
      .send({
        street: 'No Good St',
        city: 'BadCity',
        state: 'BadState',
        country: 'Country',
        pincode: 'abc',
        phone: 'phone123'
      })

    expect(invalidRes.status).toBe(400)
    expect(Array.isArray(invalidRes.body.errors)).toBe(true)
    expect(invalidRes.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'pincode', msg: 'pincode must be valid' }),
        expect.objectContaining({ path: 'phone', msg: 'phone must be valid' })
      ])
    )
  })

  test('DELETE /api/auth/users/me/addresses/:addressId returns 401 when unauthenticated', async () => {
    const fakeId = '507f1f77bcf86cd799439011'
    const res = await request(app)
      .delete(`/api/auth/users/me/addresses/${fakeId}`)

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ message: 'Authentication token missing' })
  })

  test('DELETE /api/auth/users/me/addresses/:addressId removes address and returns 200', async () => {
    const password = 'DeleteAddr123!'
    const hash = await bcrypt.hash(password, 10)

    const user = await userModel.create({
      username: 'deleteaddressuser',
      email: 'deleteaddressuser@example.com',
      password: hash,
      fullname: { firstname: 'Delete', lastname: 'Address' },
      addresses: [
        { street: '123 Delete St', city: 'DeleteCity', state: 'State', country: 'Country', pincode: '111111', isDefault: true },
        { street: '456 Keep St', city: 'KeepCity', state: 'State', country: 'Country', pincode: '222222', isDefault: false }
      ]
    })

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'deleteaddressuser', password })

    expect(loginRes.status).toBe(200)
    const cookie = loginRes.headers['set-cookie']
    expect(cookie).toBeDefined()

    const addressIdToDelete = user.addresses[0]._id.toString()

    const delRes = await request(app)
      .delete(`/api/auth/users/me/addresses/${addressIdToDelete}`)
      .set('Cookie', cookie)

    expect(delRes.status).toBe(200)
    expect(delRes.body).toHaveProperty('addresses')
    expect(delRes.body.addresses).toHaveLength(1)
    expect(delRes.body.addresses[0]).toMatchObject({
      street: '456 Keep St',
      city: 'KeepCity'
    })
  })

  test('DELETE /api/auth/users/me/addresses/:addressId returns 404 for non-existent address', async () => {
    const password = 'NotFoundAddr123!'
    const hash = await bcrypt.hash(password, 10)

    await userModel.create({
      username: 'notfoundaddressuser',
      email: 'notfoundaddressuser@example.com',
      password: hash,
      fullname: { firstname: 'NotFound', lastname: 'Address' },
      addresses: [
        { street: '789 Some St', city: 'SomeCity', state: 'State', country: 'Country', pincode: '333333' }
      ]
    })

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'notfoundaddressuser', password })

    expect(loginRes.status).toBe(200)
    const cookie = loginRes.headers['set-cookie']
    expect(cookie).toBeDefined()

    const fakeId = '507f1f77bcf86cd799439011'
    const delRes = await request(app)
      .delete(`/api/auth/users/me/addresses/${fakeId}`)
      .set('Cookie', cookie)

    expect(delRes.status).toBe(404)
    expect(delRes.body).toMatchObject({ message: 'Address not found' })
  })
})

