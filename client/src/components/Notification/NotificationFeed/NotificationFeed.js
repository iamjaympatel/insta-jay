import React, { useEffect, Fragment } from 'react';
import { connect, useDispatch } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { Link } from 'react-router-dom';

import {
  selectNotifications,
  selectNotificationState,
} from '../../../redux/notification/notificationSelectors';
import { selectToken } from '../../../redux/user/userSelectors';

import {
  fetchNotificationsStart,
  readNotificationsStart,
  clearNotifications,
} from '../../../redux/notification/notificationActions';

import UserCard from '../../UserCard/UserCard';
import UsersListSkeleton from '../../UsersList/UsersListSkeleton/UsersListSkeleton';
import Icon from '../../Icon/Icon';
import FollowButton from '../../Button/FollowButton/FollowButton';
import Divider from '../../Divider/Divider';
import Linkify from 'linkifyjs/react';
import * as linkify from 'linkifyjs';
import mention from 'linkifyjs/plugins/mention';
import {useSelector} from 'react-redux'

import { linkifyOptions } from '../../../utils/linkifyUtils';

mention(linkify);

function NotificationFeed  ({})  {
  
  const newnotifications=useSelector((state)=>state.notifications)
  const {notifications}=newnotifications
 
  const user =useSelector((state)=>state.user)
  const {token}=user

   const profile=useSelector((state)=>state.profile.data)
   const {isFollowing}=profile
  const dispatch=useDispatch();
  useEffect(() => {
    (async function () {
      await dispatch(fetchNotificationsStart(token));
      await dispatch(readNotificationsStart(token));
    })();
   
    //const user=useSelector(state=>state.user)
    return () => {
      clearNotifications();
    };
  }, [
    fetchNotificationsStart,
    readNotificationsStart,
    clearNotifications,
    token,
  ]);

  return (
    <Fragment>
      {newnotifications.fetching ? (
        <UsersListSkeleton style={{ height: '7rem' }} />
      ) : notifications.length > 0 ? (
        notifications.map((notification, idx) => {
          const userCardProps = {
            username: notification.sender.username,
            avatar: notification.sender.avatar,
            subTextDark: true,
            token: token,
            date: notification.date,
            style: { minHeight: '7rem', padding: '1rem 1.5rem' },
          };
          let userCardChild = null;

          switch (notification.notificationType) {
            case 'follow': {
              userCardProps.subText = 'started following you.';
              userCardChild = (
                <FollowButton
                  username={notification.sender.username}
                  avatar={notification.sender.avatar}
                 following={notification.isFollowing}
                 // following={isFollowing}
                  userId={notification.sender._id}
                />
              );
              break;
            }
            case 'like': {
              userCardProps.subText = 'liked your photo.';
              userCardChild = (
                <Link to={`/post/${notification.notificationData.postId}`}>
                  <img
                    src={notification.notificationData.image}
                    style={{
                      display: 'flex',
                      filter: notification.notificationData.filter,
                    }}
                    // onClick={() =>
                    //   setShowNotifications && setShowNotifications(false)
                    // }
                    alt="liked post"
                  />
                </Link>
              );
              break;
            }
            default: {
              userCardProps.subText = (
                <Linkify options={linkifyOptions}>{`${
                  notification.notificationType === 'comment'
                    ? 'commented:'
                    : 'mentioned you in a comment:'
                } ${notification.notificationData.message}`}</Linkify>
              );
              userCardChild = (
                <Link to={`/post/${notification.notificationData.postId}`}>
                  <img
                    src={notification.notificationData.image}
                    style={{
                      display: 'flex',
                      filter: notification.notificationData.filter,
                    }}
                    // onClick={() =>
                    //   setShowNotifications && setShowNotifications(false)
                    // }
                    alt="post commented on"
                  />
                </Link>
              );
            }
          }

          return (
            <li key={idx}>
              <UserCard {...userCardProps}>
                {userCardChild && userCardChild}
              </UserCard>
              {notifications.length - 1 > idx && <Divider />}
            </li>
          );
        })
      ) : (
        <div className="popup-card__empty">
          <Icon className="icon--larger" icon="heart-circle-outline" />
          <h2 className="heading-2 font-medium">Activity On Your Posts</h2>
          <h4 className="heading-4 font-medium">
            When someone likes or comments on your posts, you'll see them here.
          </h4>
        </div>
      )}
    </Fragment>
  );
};

const mapStateToProps = createStructuredSelector({
  //notifications: selectNotifications,
 // notificationState: selectNotificationState,
 // token: selectToken,
});

const mapDispatchToProps = (dispatch) => ({
  // fetchNotificationsStart: (authToken) =>
  //   dispatch(fetchNotificationsStart(authToken)),
  // readNotificationsStart: (authToken) =>
  //   dispatch(readNotificationsStart(authToken)),
  // clearNotifications: () => dispatch(clearNotifications()),
});

export default  NotificationFeed;
