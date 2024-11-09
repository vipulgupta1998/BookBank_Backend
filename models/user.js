const mongoose = require('mongoose');
const {Schema, model} = mongoose;

const UserSchema = new Schema({
    name: { type: String, required: true},
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    requestHistory:[
         {
            completed: {type : Boolean ,default:false},
            bookId: {type: Schema.Types.ObjectId, ref: 'Book'},
            requestedBy:{type: Schema.Types.ObjectId, ref: 'User'},
            message:{type:String},
            createdAt: { type: Date, default: Date.now }
         }
    ]
})

const UserModel = model('User', UserSchema);
module.exports = UserModel; 