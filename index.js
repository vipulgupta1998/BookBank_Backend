require("dotenv").config()
const connectToMongo =require("./db");
connectToMongo();
const express = require("express")
const app  = express();
const port = 4000;

const cors = require('cors');


app.use(cors());
app.use(express.json());


app.get("/",(req,res)=>{
  res.json({message:"connection established"});
})


app.use('/auth',require('./routes/auth'));
app.use('/book',require('./routes/book'));
app.use('/user',require('./routes/user'));


app.listen(port,()=>{
    console.log("server started on port 4000");
})
