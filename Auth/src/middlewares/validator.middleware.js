const {body,oneOf,validationResult}=require('express-validator')


function validate(req, res, next) {
  const errors = validationResult(req)
  if (errors.isEmpty()) return next()
  return res.status(400).json({ errors: errors.array() })
}

const registerValidationRules=[
   body('username')
    .trim()
    .notEmpty()
    .withMessage('username is required')
    .isLength({ min: 3 })
    .withMessage('username must be at least 3 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('email is required')
    .isEmail()
    .withMessage('email must be valid'),

  body('password')
    .notEmpty()
    .withMessage('password is required')
    .isLength({ min: 6 })
    .withMessage('password must be at least 6 characters'),

  body('fullname')
  .notEmpty()
  .withMessage('fullname is required'),
  body('fullname.firstname')
    .notEmpty()
    .withMessage('fullname.firstname is required'),
  body('fullname.lastname')
    .notEmpty()
    .withMessage('fullname.lastname is required'),
    validate


]

const loginValidationRules= [
  // Password is always required
  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  // EITHER username OR email must be provided
  oneOf([
    [
      body('username')
        .notEmpty().withMessage('Username is required if email is not provided')
        .trim()
    ],
    [
      body('email')
        .notEmpty().withMessage('Email is required if username is not provided')
        .isEmail().withMessage('Invalid email format')
        .trim()
    ]
  ]),
  validate
]

const addAddressValidationRules = [
  body('street')
    .trim()
    .notEmpty().withMessage('street is required'),
  body('city')
    .trim()
    .notEmpty().withMessage('city is required'),
  body('state')
    .trim()
    .notEmpty().withMessage('state is required'),
  body('country')
    .trim()
    .notEmpty().withMessage('country is required'),
  body('pincode')
    .trim()
    .notEmpty().withMessage('pincode is required')
    .matches(/^[0-9]{4,10}$/).withMessage('pincode must be valid'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{7,15}$/).withMessage('phone must be valid'),
  validate
]

module.exports={
registerValidationRules,
loginValidationRules,
addAddressValidationRules
}
