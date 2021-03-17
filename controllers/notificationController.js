const Notification = require('../models/Notification');
const ObjectId = require('mongoose').Types.ObjectId;
//const Following =require('../models/Following')

module.exports.retrieveNotifications = async (req, res, next) => {
  const user = res.locals.user;
  
  try {
  

       const notifications=await Notification.find({receiver:user._id})
       .select('sender receiver notificationType date notificationData')
       .populate('sender','username avatar')
       .populate('receiver','_id ')
       .sort({date:-1})
        //.populate('notificationData.postId', '_id image')    
         
   //  const isFollowing= await Following.find({user:user._id})
     
    return res.send(notifications);
  } catch (err) {
    next(err);
  }
};

module.exports.readNotifications = async (req, res, next) => {
  const user = res.locals.user;

  try {
    await Notification.updateMany({ receiver: user._id }, { read: true });
    return res.send();
  } catch (err) {
    next(err);
  }
};
