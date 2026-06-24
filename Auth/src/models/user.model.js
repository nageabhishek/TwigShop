const { default: mongoose } = require('mongoose')
const mogoosse=require('mongoose')


const addressSchema=new mongoose.Schema({

    street:String,
    city:String,
    state:String,
    country:String,
    pincode:String,
    phone:String,
    isDefault:{type:Boolean,default:false}

})

const userSchema=new mongoose.Schema({
    username:{
        type:String,
        unique:true,
        required:true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password:{
        type:String,
        select:false
    },
    fullname:{
        firstname:{
            type:String,
            required:true
        },
         lastname:{
            type:String,
            required:true
        }
    },
    role:{
        type:String,
        enum:['user','seller'],
        default:'user'

    },

    addresses:[
        addressSchema

    ]
 
},{
    timestamps:true
})

const userModel=mongoose.model('user',userSchema)


module.exports=userModel
