const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
 
  post: {
    type: Schema.ObjectId,
    ref: 'Post'
  },
    message: String,
  author: {
    type: Schema.ObjectId,
    ref: 'User'
  }, 
  date: {
    type: Date,
    default: Date.now
  },
  
  //commentvlike
  commentVotes: [
    
    {    author: {
          type: Schema.ObjectId,
          ref: 'User'
       }, }
        ],
    
  //commentreply
  commentReplies:[{     
      type: Schema.ObjectId,
      ref: 'CommentReply',
    }],

    
});



const commentModel = mongoose.model('Comment', CommentSchema);
module.exports = commentModel;
