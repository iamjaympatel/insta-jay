const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
  image: String,
  filter: String,
  thumbnail: String,
  caption: String,
  hashtags: [
    {
      type: String,
      lowercase: true,
    },
  ],
  date: {
    type: Date,
    default: Date.now,
  },
  author: {
    type: Schema.ObjectId,
    ref: 'User',
  },


  //like 
  postVotes: [
    { 
       author: { type: Schema.ObjectId, ref: 'User' } 
  }],

  //comment
  commentData:{
    comments:[
   {
    type: Schema.ObjectId,
    ref: 'Comment'
  }],
  commentCount:{
    type:Number,
    default:0
    }}  
});




const postModel = mongoose.model('Post', PostSchema);
module.exports = postModel;
