const cloudinary = require('cloudinary').v2;
const linkify = require('linkifyjs');
require('linkifyjs/plugins/hashtag')(linkify);
const Post = require('../models/Post');
const User=require('../models/User')


//const Followers = require('../models/Followers');
const Notification = require('../models/Notification');
const socketHandler = require('../handlers/socketHandler');
const fs = require('fs');
const ObjectId = require('mongoose').Types.ObjectId;
//const AWS=require('aws-sdk')
const {
  retrieveComments,
  formatCloudinaryUrl,
  populatePostsPipeline,
} = require('../utils/controllerUtils');
const filters = require('../utils/filters');



module.exports.createPost = async (req, res, next) => {
  const user = res.locals.user;
  const { caption, filter: filterName } = req.body;
  let post = undefined;
  const filterObject = filters.find((filter) => filter.name === filterName);
  const hashtags = [];
  if(caption){
  linkify.find(caption).forEach((result) => {
    if (result.type === 'hashtag') {
      hashtags.push(result.value.substring(1));
    }
  });
  }
  
  if (!req.file) {
    return res
      .status(400)
      .send({ error: 'Please provide the image to upload.' });
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  try {
    const response = await cloudinary.uploader.upload(req.file.path);
  const thumbnailUrl= formatCloudinaryUrl(
      response.secure_url,
      {
        width: 400,
        height: 400,
      },
      true
    )

    fs.unlinkSync(req.file.path);
    const post = new Post({
      image: response.secure_url,
      thumbnail: thumbnailUrl,
      filter: filterObject ? filterObject.filter : '',
      caption,
      author: user._id,
      hashtags,
    });
    
    await post.save();

    
    await User.findOneAndUpdate({_id:user._id},{
$push:{posts:post._id}
    })
    res.status(201).send({
    //...post.toObject(),
      post,
      postVotes: [],
      comments: [],
      author: { avatar: user.avatar, username: user.username },
    });
  } catch (err) {
    next(err);
  }

  try {
  
    const postObject = {
     // ...post.toObject(),
     post,
      author: { username: user.username, avatar: user.avatar },
      commentData: { commentCount: 0, comments: [] },
      postVotes: [],
    };

    // socketHandler.sendPost(req, postObject, user._id);
   user.followers.forEach((user) => {
      socketHandler.sendPost(
        req,
        // Since the post is new there is no need to look up any fields
        postObject,
        user.followers
      );
    });
  } catch (err) {
    console.log(err);
  }
};


module.exports.deletePost = async (req, res, next) => {
  const { postId } = req.params;
  const user = res.locals.user;

  try {
    const post = await Post.findOne({ _id: postId, author: user._id });
    if (!post) {
      return res.status(404).send({
        error: 'Could not find a post with that id associated with the user.',
      });
    }
    // This uses pre hooks to delete everything associated with this post i.e comments
    const postDelete = await Post.deleteOne({
      _id: postId,
    });
    
    await User.findOneAndUpdate({_id:user._id},{
      $pull:{posts:post._id}
          })
   
    res.status(204).send();
  } catch (err) {
    next(err);
  }

  try {

    const fuser=User.findById(user._id).populate('followers')

    socketHandler.deletePost(req, postId, user._id);
    fuser.followers.forEach((follower) =>
      socketHandler.deletePost(req, postId, follower.user)
    );
  } catch (err) {
    console.log(err);
  }
};


module.exports.retrievePost = async (req, res, next) => {
  const { postId } = req.params;
  try {
    const post =await Post.findById(postId)
    .populate('author',' _id username fullName')
    .populate({path:'commentData.comments',populate:{path:'author',select:'_id username fullName'}})

    if (post.length === 0) {
      return res
        .status(404)
        .send({ error: 'Could not find a post with that id.' });
    }

    return res.send(post);
  } catch (err) {
    next(err);
  }
};


module.exports.votePost = async (req, res, next) => {
  const { postId } = req.params;
  const user = res.locals.user;

  try {

    const postLikeUpdate = await Post.updateOne({
       _id: postId,'postVotes.author':{ $ne:user._id}},
      {
        $push: {postVotes: { author: user._id } },
      }
    );
    if (!postLikeUpdate.nModified) {
      if (!postLikeUpdate.ok) {
        return res.status(500).send({ error: 'Could not like on the post.' });
      }

      const postDislikeUpdate = await Post.updateOne(
        { _id: postId },
        { $pull: { postVotes: { author: user._id } } }
      );

      if (!postDislikeUpdate.nModified) {
        return res.status(500).send({ error: 'Could not dislike on the post.' });
      }
    } else {
      // Sending a like notification
      const post = await Post.findById(postId);
      if (String(post.author) !== String(user._id)) {
        // Create thumbnail link
        const image = formatCloudinaryUrl(
          post.image,
          {
            height: 50,
            width: 50,
          },
          true
        );
        const notification = new Notification({
          sender: user._id,
          receiver: post.author,
          notificationType: 'like',
          date: Date.now(),
          notificationData: {
            postId,
            image,
            filter: post.filter,
          },
        });

        await notification.save();
        socketHandler.sendNotification(req, {
          ...notification.toObject(),
          sender: {
            _id: user._id,
            username: user.username,
            avatar: user.avatar,
          },
        });
      }
    }
    return res.send({ success: true });
  } catch (err) {
    next(err);
  }
};


module.exports.retrievePostFeed = async (req, res, next) => {

  const user = res.locals.user;
  const { offset } = req.params;

  try {
  
   const following=await User.findById(user._id).populate('following','_id')
    const followings=following.following
    const user_id=user._id
   const posts=  await Post.find({$or:[{author:followings},{author:user_id}]})
   //const posts=  await Post.find({author:{$in:[followings ,user_id]}})
   .populate('author','_id username fullName')
   .populate({path:'commentData.comments',select:'_id author commentVotes date message post',populate:{path:'author',select:'_id username fullName'}})
   .sort({date:-1})
  
   if (!user) {
      return res.status(404).send({ error: 'Could not find any posts.' });
    }

    return res.send(posts);
  } catch (err) {
    next(err);
  }
};



module.exports.retrieveSuggestedPosts = async (req, res, next) => {
  const { offset = 0 } = req.params;
  try {
    const posts =await Post.find({})
    .populate({path:'commentData.comments',populate:{path:'author',select:'_id username fullName'}})
    .sort({ date: -1 }).limit(20)
    
    return res.send(posts);
  } catch (err) {
    next(err);
  }
};


module.exports.retrieveHashtagPosts = async (req, res, next) => {
  const { hashtag, offset } = req.params;

  try {
    const posts=await Post.find({hashtags:hashtag})
    .populate({path:'commentData.comments',populate:{path:'author',select:'_id username fullName'}})
    .sort({date:-1})
    
    return res.send({posts:posts});
  } catch (err) {
    next(err);
  }
};
