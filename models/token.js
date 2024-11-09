const mongoose = require('mongoose');
const {Schema, model} = mongoose;

const TokenSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User",
      },
      token: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600,// this is the expiry time in seconds
      },
})

const TokenModel = model('Token', TokenSchema);
module.exports = TokenModel;