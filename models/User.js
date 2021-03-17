const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;

const RequestError = require('../errorTypes/RequestError');

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: (value) => {
      if (!validator.isEmail(value)) {
        throw new Error('Invalid email address.');
      }
    },
  },
  fullName: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    minlength: 3,
  },
  password: {
    type: String,
    minlength: 8,
  },
  avatar: String,
  bio: {
    type: String,
    maxlength: 130,
  },
  website: {
    type: String,
    maxlength: 65,
  },
  bookmarks: [
    {
      post: {
        type: Schema.ObjectId,
        ref: 'Post',
      },
    },
  ],
  githubId: Number,
  private: {
    type: Boolean,
    default: false,
  },
  confirmed: {
    type: Boolean,
    default: false,
  },
  followers:[
    {
    type:Schema.ObjectId,
    ref:'User'
  }],
  following:[{
    type:Schema.ObjectId,
    ref:'User'

  }],
posts:[{
  type:Schema.ObjectId,
  ref:'Post'
}]
});



const User = mongoose.model('User', UserSchema);
module.exports = User;
