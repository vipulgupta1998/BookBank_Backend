const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const User = require("../models/user")
const Token = require("../models/token")
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const bcryptSalt = require("bcryptjs");

/*************************** Register User *******************************/

router.post('/register', async(req, res) => {
  let success = false;
  try {
    let user = await User.findOne({email: req.body.email});
    if (user) {return res.status(400).json({success,
        error: "sorry but the user with the same email already exists",
    });
    }
    const salt = await bcrypt.genSalt(10);
    const secPass = await bcrypt.hash(req.body.password,salt);
    user = await User.create({
        email : req.body.email,
        name : req.body.name,
        password : secPass
    })
    const data = {
        user : {
            id : user.id
        }
    }
    success = true;
    const authtoken = jwt.sign(data,JWT_SECRET);
    res.json({success,authtoken});
  } catch (error) {
    console.error(error.message);
    res.status(500).send("some error occured");
  }
})


/*************************** Login User *******************************/

router.post('/login',async(req,res)=>{
    let success = false;
    try {
        const {email,password} = req.body;
        let user = await User.findOne({email : email});
        if(!user){
         return res.status(400).json({success,message : "user doesnot exists"})
       }
       const passwordCompare = await bcrypt.compare(password, user.password);
       if (!passwordCompare) {
         return res.status(400).json({ success, message: "Password is wrong" });
       }
       const data = {
         user : {
            id : user.id
         }
       }
       const authtoken = jwt.sign(data,JWT_SECRET);
       success = true;
       res.json({success,authtoken});  
       } catch (error) {
         console.error(error.message);
         res.status(500).send("some error occured");
       }
})



/*************************** Request Password Change *******************************/

router.post('/RequestPasswordChange',async(req,res)=>{
    const {email} = req.body;
    try {
        let success = false;
        const user = await User.findOne({email : email});
        if(!user){
            return res.status(400).json({success,message : "user doesnot exists"})
        }
        let token = await Token.findOne({userId:user.id});
        if(token){
            await token.deleteOne();
        }
        let resetToken = crypto.randomBytes(32).toString("hex");
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(resetToken,salt);

        await new Token({
            userId : user._id,
            token: hash,
            createdAt: Date.now(),
          }).save();
        
        const clientURL = "http://localhost:3000";
        const link = `${clientURL}/#/ResetPassword/passwordReset?token=${resetToken}&id=${user._id}`;

        const Password = process.env.GOOGLEPASSWORD;
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: Password,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Password reset request',
            html: `
    <p>Hello,</p>
    <p>Your Book Bank password reset link is : <a href="${link}">Reset Password</a> .</p>
    <p>Thank you,<br>Book Bank Team</p>
  `,
        };
        const result = await transporter.sendMail(mailOptions);
        console.log(result);
        return res.status(200).json({
            success: true,
            message: 'message sent sucessfully',
            data: {
                link : link
            },
        });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            data: {},
        });
    }
});


/*************************** Reset Password *******************************/

router.post('/ResetPassword',async(req,res)=>{
    const {userId,password,token} = req.body;
    let success = false;
    try{
        let user = await User.findById(userId);
        if(!user){
            return res.status(400).json({success,message : "user doesnot exists"})
        }

        let passwordResetToken = await Token.findOne({userId});
        if(!passwordResetToken){
            throw new Error("Invalid or expired password reset token");
        }

        const isValid = await bcrypt.compare(token, passwordResetToken.token);
        if (!isValid) {
          throw new Error("Invalid or expired password reset token");
        }

        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(req.body.password,salt);
        
        user.password = secPass;
        await user.save();
        const data = {
            user : {
               id : user.id
            }
          }
          const authtoken = jwt.sign(data,JWT_SECRET);
          success = true;
          res.json({success,authtoken});  
    }
    catch{
        console.error(error.message);
        res.status(500).send("some error occured");
    }
})


module.exports = router;