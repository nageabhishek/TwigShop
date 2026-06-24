const jwt = require('jsonwebtoken')
const userModel=require('../models/user.model')
function authUser(req, res, next) {
  const token = req.cookies.token 

  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY)
    const user=decoded
    req.user = user
     next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

module.exports = {
    authUser
}
