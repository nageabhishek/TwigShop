require('dotenv').config()
const dns=require('dns')
dns.setServers(["1.1.1.1","4.4.4.4"])
const app=require('./src/app')
const connectDB=require('./src/db/db')


connectDB()
app.listen(3000,()=>{
    console.log('connected to server')
})
