const express=require('express')
const router=express.Router()
const authController=require('../controllers/auth.controller')
const validator=require('../middlewares/validator.middleware')
const authMiddleware=require('../middlewares/auth.middleware')

router.post('/register',validator.registerValidationRules,authController.registerUser)
router.post('/login',validator.loginValidationRules,authController.loginUser)
router.post('/logout',authController.logoutUser)
router.get('/me',authMiddleware.authUser,authController.getUserDetailes)
router.get('/users/me/addresses',authMiddleware.authUser,authController.getUserAddress)
router.post('/users/me/addresses',authMiddleware.authUser,validator.addAddressValidationRules,authController.addUserAddress)
router.delete('/users/me/addresses/:addressId',authMiddleware.authUser,authController.deleteUserAddress)






module.exports=router