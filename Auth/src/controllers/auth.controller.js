const userModel=require('../models/user.model')
const jwt=require('jsonwebtoken')
const bcrypt=require('bcryptjs')
const redis=require('../db/redis')
const { get } = require('mongoose')


async function registerUser(req,res) {
    const {username,email,role,password,address,fullname:{firstname,lastname}}=req.body

    // validate user

        const isUser=await userModel.findOne({
             $or:[
                 { username },
                 { email }
             ]
        })

        if(isUser){
        return res.status(409).json({
            message:"user already exist"
        })
    }

    // create user
    const hashPass= await bcrypt.hash(password,10)

    const user=await userModel.create({
        username,
        email,
        password:hashPass,
        role,
        address,
        fullname:{firstname,lastname}
    })
// create token

const token=jwt.sign({
    id:user._id,
    email:user.email,
    username:user.username,
    role:user.role
},process.env.JWT_KEY,{expiresIn:'1d'})

// save cookie
res.cookie('token',token,{
    httpOnly:true,
    secure:process.env.NODE_ENV === 'production',
    maxAge:24*60*60*1000
})

res.status(201).json({
    message:'user register succesfully',
    user:user
})
    
}
async function loginUser(req,res) {
    const { username, email, password } = req.body || {}

    if ((!username || username === '') && (!email || email === '')) {
        return res.status(400).json({ message: 'username or email is required' })
    }

    if (!password) {
        return res.status(400).json({ message: 'password is required' })
    }

    const user = await userModel.findOne({
        $or: [
            { username },
            { email }
        ]
    }).select('+password')

    if (!user) {
        return res.status(409).json({ message: 'Invalid username or password' })
    }

    const validPass = await bcrypt.compare(password, user.password)
    if (!validPass) {
        return res.status(409).json({ message: 'Invalid username or password' })
    }

    const token = jwt.sign({
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
    }, process.env.JWT_KEY, { expiresIn: '1d' })

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    })

    return res.status(200).json({
        message: 'login successful',
        user: { id: user._id, username: user.username, email: user.email, role: user.role }
    })


    
}

async function getUserDetailes(req,res){
    res.status(200).json({
        message:'user detailes fetch succesfully',
        user:req.user
    })
}

async function logoutUser(req, res) {
  const token = req.cookies.token

  if (token) {
    try {
      await redis.set(`blacklist:${token}`, 'true', 'Ex', 24 * 60 * 60 * 1000)
    } catch (err) {
      console.error('Unable to blacklist token on logout:', err)
    }
  }

  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  })

  return res.status(200).json({ message: 'Logout successful' })
}
async function getUserAddress(req,res){
    try {
        const userId = req.user?.id || req.user?._id
        const user = await userModel.findById(userId).select('addresses')

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        return res.status(200).json({
            message: 'user addresses fetched successfully',
            addresses: user.addresses || []
        })
    } catch (error) {
        return res.status(500).json({ message: 'Unable to fetch addresses' })
    }
}
async function addUserAddress(req,res) {
    try {
        const userId = req.user?.id || req.user?._id
        const { street, city, state, country, pincode, isDefault = false, phone } = req.body

        const user = await userModel.findById(userId)
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        if (isDefault) {
            user.addresses.forEach(address => {
                address.isDefault = false
            })
        }

        const newAddress = {
            street,
            city,
            state,
            country,
            pincode,
            isDefault,
            phone
        }

        user.addresses.push(newAddress)
        await user.save()

        return res.status(201).json({
            message: 'address added successfully',
            address: user.addresses[user.addresses.length - 1]
        })
    } catch (error) {
        return res.status(500).json({ message: 'Unable to add address' })
    }
}

async function deleteUserAddress(req,res) {
    try {
        const userId = req.user?.id || req.user?._id
        const { addressId } = req.params

        const user = await userModel.findById(userId)
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId)
        if (addressIndex === -1) {
            return res.status(404).json({ message: 'Address not found' })
        }

        user.addresses.splice(addressIndex, 1)
        await user.save()

        return res.status(200).json({
            message: 'address deleted successfully',
            addresses: user.addresses
        })
    } catch (error) {
        return res.status(500).json({ message: 'Unable to delete address' })
    }
}

module.exports={
    registerUser,
    loginUser,
    getUserDetailes,
    logoutUser,
    getUserAddress,
    addUserAddress,
    deleteUserAddress
}