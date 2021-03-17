const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentReplySchema = new Schema({
  parentComment: {
    type: Schema.ObjectId,
    ref: 'Comment',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  message: String,
  
  author: {
    type: Schema.ObjectId,
    ref: 'User',
  },
  
  commentReplyVotes:[{
    author: {
      type: Schema.ObjectId,
      ref: 'User'
    }}]
});



const commentReplyModel = mongoose.model('CommentReply', CommentReplySchema);
module.exports = commentReplyModel;
