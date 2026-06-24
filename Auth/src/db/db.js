const mongoose=require('mongoose')

async function connectDB() {
    try{
        await mongoose.connect(process.env.MONGO_URL)
        console.log('connected to Db')

    }
    catch(err){
        console.error(err)

    }
    
}

module.exports=connectDB
