const User = require('../models/User');
const Post = require('../models/Post');
const ConfirmationToken = require('../models/ConfirmationToken');
const Notification = require('../models/Notification');
const socketHandler = require('../handlers/socketHandler');
const ObjectId = require('mongoose').Types.ObjectId;
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const crypto = require('crypto');

const {
  validateEmail,
  validateFullName,
  validateUsername,
  validateBio,
  validateWebsite,
} = require('../utils/validation');
const { sendConfirmationEmail } = require('../utils/controllerUtils');
const { post } = require('../routes');

module.exports.retrieveUser = async (req, res, next) => {
  const { username } = req.params;
  const requestingUser = res.locals.user;
  try {
    const user = await User.findOne(
      { username },
      'username fullName avatar bio bookmarks fullName _id website followers following'
    );
    if (!user) {
      return res
        .status(404)
        .send({ error: 'Could not find a user with that username.' });
    }
    const posts =await Post.find({author:user._id}).populate('author',' _id username fullName').sort({date:-1})

    const isFollowing = await User.findOne({
      _id: requestingUser._id,
      following: user._id,
    });

    return res.send({
      user,
      followers:user.followers.length,
      following:user.following.length,
    
       isFollowing: !!isFollowing,
    
      posts:{data: posts},
    });
  } catch (err) {
    next(err);
  }
};



module.exports.retrievePosts = async (req, res, next) => {
  // Retrieve a user's posts with the post's comments & likes
  const { username, offset = 0 } = req.params;
  try {
    const posts = await Post.aggregate([
      { $sort: { date: -1 } },
      { $skip: Number(offset) },
      { $limit: 12 },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $match: { 'user.username': username } },
      {
        $lookup: {
          from: 'comments',
          localField: '_id',
          foreignField: 'post',
          as: 'comments',
        },
      },
      {
        $lookup: {
          from: 'postvotes',
          localField: '_id',
          foreignField: 'post',
          as: 'postVotes',
        },
      },
      { $unwind: '$postVotes' },
      {
        $project: {
          image: true,
          caption: true,
          date: true,
          'user.username': true,
          'user.avatar': true,
          comments: { $size: '$comments' },
          postVotes: { $size: '$postVotes.votes' },
        },
      },
    ]);


    if (posts.length === 0) {
      return res.status(404).send({ error: 'Could not find any posts.' });
    }
    return res.send(posts);
  } catch (err) {
    next(err);
  }
};

module.exports.bookmarkPost = async (req, res, next) => {
  const { postId } = req.params;
  const user = res.locals.user;

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res
        .status(404)
        .send({ error: 'Could not find a post with that id.' });
    }

    const userBookmarkUpdate = await User.updateOne(
      {
        _id: user._id,
        'bookmarks.post': { $ne: postId },
      },
      { $push: { bookmarks: { post: postId } } }
    );
    if (!userBookmarkUpdate.nModified) {
      if (!userBookmarkUpdate.ok) {
        return res.status(500).send({ error: 'Could not bookmark the post.' });
      }
      // The above query did not modify anything meaning that the user has already bookmarked the post
      // Remove the bookmark instead
      const userRemoveBookmarkUpdate = await User.updateOne(
        { _id: user._id },
        { $pull: { bookmarks: { post: postId } } }
      );
      if (!userRemoveBookmarkUpdate.nModified) {
        return res.status(500).send({ error: 'Could not bookmark the post.' });
      }
      return res.send({ success: true, operation: 'remove' });
    }
    return res.send({ success: true, operation: 'add' });
  } catch (err) {
    next(err);
  }
};



module.exports.followUser = async (req, res, next) => {
  const { userId } = req.params;
  const user = res.locals.user;

  try {
    const userToFollow = await User.findById(userId);
    console.log(userToFollow._id)
    if (!userToFollow) {
      return res
        .status(400)
        .send({ error: 'Could not find a user with that id.' });
    }


    const followerUpdate=await User.updateOne({_id:userToFollow._id,followers: { $ne :user._id } },
                                                   {$push:{followers:user._id}})

const followingUpdate=await User.updateOne({_id:user._id,following: { $ne: userToFollow._id } },
                                                           {$push:{following:userToFollow._id}})


    if (!followerUpdate.nModified || !followingUpdate.nModified) {
      if (!followerUpdate.ok || !followingUpdate.ok) {
        return res
          .status(500)
          .send({ error: 'Could not follow user please try again later.' });
      }

      const followerUnfollowUpdate =await User.updateOne({_id:userToFollow._id},
        {$pull:{followers:user._id}})

      const followingUnfollowUpdate = await User.updateOne(
        { _id: user._id },
        { $pull: { following: userToFollow._id } } 
      );

      if (!followerUnfollowUpdate.ok || !followingUnfollowUpdate.ok) {
        return res
          .status(500)
          .send({ error: 'Could not follow user please try again later.' });
      }
      return res.send({ success: true, operation: 'unfollow' });
    }

    const notification = new Notification({
      notificationType: 'follow',
      sender: user._id,
      receiver: userToFollow._id,
      date: Date.now(),
    });

    const sender = await User.findById(user._id, 'username avatar');
    
    const isFollowing = await User.findOne({
      _id: userToFollow._id,
      following: user._id,
    });

    await notification.save();
    socketHandler.sendNotification(req, {
      notificationType: 'follow',
      sender: {
        _id: sender._id,
        username: sender.username,
        avatar: sender.avatar,
      },
      receiver: userId,
      date: notification.date,
      isFollowing: !!isFollowing,
    });

    res.send({ success: true, operation: 'follow' });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves either who a specific user follows or who is following the user.
 * Also retrieves whether the requesting user is following the returned users
 * @function retrieveRelatedUsers
 * @param {object} user The user object passed on from other middlewares
 * @param {string} userId Id of the user to be used in the query
 * @param {number} offset The offset for how many documents to skip
 * @param {boolean} followers Whether to query who is following the user or who the user follows default is the latter
 * @returns {array} Array of users
 */

 const retrieveRelatedUsers = async (user, userId, offset, followers) => {
  const pipeline = [
    {
      $match: { user: ObjectId(userId) },
    },
    {
      $lookup: {
        from: 'users',
        let: followers
          ? { userId: '$followers.user' }
          : { userId: '$following.user' },
        pipeline: [
          {
            $match: {
              // Using the $in operator instead of the $eq
              // operator because we can't coerce the types
              $expr: { $in: ['$_id', '$$userId'] },
            },
          },
          {
            $skip: Number(offset),
          },
          {
            $limit: 10,
          },
        ],
        as: 'users',
      },
    },
    {
      $lookup: {
        from: 'followers',
        localField: 'users._id',
        foreignField: 'user',
        as: 'userFollowers',
      },
    },
    {
      $project: {
        'users._id': true,
        'users.username': true,
        'users.avatar': true,
        'users.fullName': true,
        userFollowers: true,
      },
    },
  ];

  const aggregation = followers
    ? await Followers.aggregate(pipeline)
    : await Following.aggregate(pipeline);

  // Make a set to store the IDs of the followed users
  const followedUsers = new Set();
  // Loop through every follower and add the id to the set if the user's id is in the array
  aggregation[0].userFollowers.forEach((followingUser) => {
    if (
      !!followingUser.followers.find(
        (follower) => String(follower.user) === String(user._id)
      )
    ) {
      followedUsers.add(String(followingUser.user));
    }
  });
  // Add the isFollowing key to the following object with a value
  // depending on the outcome of the loop above
  aggregation[0].users.forEach((followingUser) => {
    followingUser.isFollowing = followedUsers.has(String(followingUser._id));
  });

  return aggregation[0].users;
};



module.exports.retrieveFollowing = async (req, res, next) => {
  const { userId, offset = 0 } = req.params;
  const user = res.locals.user;
  try {
    //const users = await retrieveRelatedUsers(user, userId, offset);
    const users=await User.findById(userId,'following').populate('following','_id fullName username')
    const following=users.following;
    const isFollowing = !!await User.findOne({
      _id: users._id,
      following: userId,
    });
    
    return res.send(following);
  } catch (err) {
    next(err);
  }
};


module.exports.retrieveFollowers = async (req, res, next) => {
  const { userId, offset = 0 } = req.params;
  const user = res.locals.user;

  try {
   // const users = await retrieveRelatedUsers(user, userId, offset, true);
   const users=await User.findById(userId,'followers').populate('followers','_id fullName username')
   const followers=users.followers;
    return res.send(followers);
  } catch (err) {
    next(err);
  }
};



module.exports.searchUsers = async (req, res, next) => {
  const { username, offset = 0 } = req.params;
  if (!username) {
    return res
      .status(400)
      .send({ error: 'Please provide a user to search for.' });
  }

  try {
const name=username
  const users = await User.find({$or:[{fullName:{$regex:username,$options:'i'}},{username:{$regex:username,$options:'i'}}]})
   
    if (users.length === 0) {
      return res
        .status(404)
        .send({ error: 'Could not find any users matching the criteria.' });
    }
    return res.send(users);
  } catch (err) {
    next(err);
  }
};

module.exports.confirmUser = async (req, res, next) => {
  const { token } = req.body;
  const user = res.locals.user;

  try {
    const confirmationToken = await ConfirmationToken.findOne({
      token,
      user: user._id,
    });
    if (!confirmationToken) {
      return res
        .status(404)
        .send({ error: 'Invalid or expired confirmation link.' });
    }
    await ConfirmationToken.deleteOne({ token, user: user._id });
    await User.updateOne({ _id: user._id }, { confirmed: true });
   
    return res.send();
  } catch (err) {
    next(err);
  }
};

module.exports.changeAvatar = async (req, res, next) => {
  const user = res.locals.user;

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
    const response = await cloudinary.uploader.upload(req.file.path, {
      width: 200,
      height: 200,
      gravity: 'face',
      crop: 'thumb',
    });
    fs.unlinkSync(req.file.path);

    const avatarUpdate = await User.updateOne(
      { _id: user._id },
      { avatar: response.secure_url }
    );

    if (!avatarUpdate.nModified) {
      throw new Error('Could not update user avatar.');
    }

    return res.send({ avatar: response.secure_url });
  } catch (err) {
    next(err);
  }
};

module.exports.removeAvatar = async (req, res, next) => {
  const user = res.locals.user;

  try {
    const avatarUpdate = await User.updateOne(
      { _id: user._id },
      { $unset: { avatar: '' } }
    );
    if (!avatarUpdate.nModified) {
      next(err);
    }
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports.updateProfile = async (req, res, next) => {
  const user = res.locals.user;
  const { fullName, username, website, bio, email } = req.body;
  let confirmationToken = undefined;
  let updatedFields = {};
  try {
    const userDocument = await User.findOne({ _id: user._id });

    if (fullName) {
      const fullNameError = validateFullName(fullName);
      if (fullNameError) return res.status(400).send({ error: fullNameError });
      userDocument.fullName = fullName;
      updatedFields.fullName = fullName;
    }

    if (username) {
      const usernameError = validateUsername(username);
      if (usernameError) return res.status(400).send({ error: usernameError });
      // Make sure the username to update to is not the current one
      if (username !== user.username) {
        const existingUser = await User.findOne({ username });
        if (existingUser)
          return res
            .status(400)
            .send({ error: 'Please choose another username.' });
        userDocument.username = username;
        updatedFields.username = username;
      }
    }

    if (website) {
      const websiteError = validateWebsite(website);
      if (websiteError) return res.status(400).send({ error: websiteError });
      if (!website.includes('http://') && !website.includes('https://')) {
        userDocument.website = 'https://' + website;
        updatedFields.website = 'https://' + website;
      } else {
        userDocument.website = website;
        updatedFields.website = website;
      }
    }

    if (bio) {
      const bioError = validateBio(bio);
      if (bioError) return res.status(400).send({ error: bioError });
      userDocument.bio = bio;
      updatedFields.bio = bio;
    }

    if (email) {
      const emailError = validateEmail(email);
      if (emailError) return res.status(400).send({ error: emailError });
      // Make sure the email to update to is not the current one
      if (email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser)
          return res
            .status(400)
            .send({ error: 'Please choose another email.' });
        confirmationToken = new ConfirmationToken({
          user: user._id,
          token: crypto.randomBytes(20).toString('hex'),
        });
        await confirmationToken.save();
        userDocument.email = email;
        userDocument.confirmed = false;
        updatedFields = { ...updatedFields, email, confirmed: false };
      }
    }
    const updatedUser = await userDocument.save();
    const user2= await User.findById(user._id)
    res.send(user2);
    if (email && email !== user.email) {
      sendConfirmationEmail(
        updatedUser.username,
        updatedUser.email,
        confirmationToken.token
      );
    }
  } catch (err) {
    next(err);
  }
};

module.exports.retrieveSuggestedUsers = async (req, res, next) => {
  const { max } = req.params;
  const user = res.locals.user;
  try {
    const following=await User.findById(user._id)

    const users = await User.find({
     $and:[{_id:{$ne:user._id}},{_id:{$ne:following.following}}]
     }).select('_id fullName username email avatar posts')
     

    res.send(users);
  } catch (err) {
    next(err);
  }
};

