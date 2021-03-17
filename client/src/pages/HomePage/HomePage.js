import React, { useEffect, Fragment } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { createStructuredSelector } from 'reselect';

import { selectCurrentUser, selectToken } from '../../redux/user/userSelectors';
import {
  selectFeedPosts,
  selectHasMore,
  selectFeedFetching,
} from '../../redux/feed/feedSelectors';
import { fetchFeedPostsStart, clearPosts } from '../../redux/feed/feedActions';

import useScrollPositionThrottled from '../../hooks/useScrollPositionThrottled';

import Feed from '../../components/Feed/Feed';
import UserCard from '../../components/UserCard/UserCard';
import SmallFooter from '../../components/Footer/SmallFooter/SmallFooter';
import MobileHeader from '../../components/Header/MobileHeader/MobileHeader';
import Icon from '../../components/Icon/Icon';
import NewPostButton from '../../components/NewPost/NewPostButton/NewPostButton';
import SuggestedUsers from '../../components/Suggestion/SuggestedUsers/SuggestedUsers';

function HomePage  ({})  {


            const feed  =useSelector((state) => state.feed)
           const feedPosts=feed.posts
           const fetching=feed.fetching
           const hasMore=feed.hasMore
            const user =useSelector((state)=>state.user)
            const {token,currentUser}=user

  const dispatch=useDispatch();
  useEffect(() => {
    document.title = `Instaclone`;
    dispatch(fetchFeedPostsStart(token));
    return () => {
      dispatch(clearPosts());
    };
  }, [clearPosts, fetchFeedPostsStart, token]);

  useScrollPositionThrottled(
    ({ atBottom }) => {
      if (atBottom && hasMore && !fetching) {
        dispatch(fetchFeedPostsStart(token, feedPosts.length));
      }
    },
    null,
    [hasMore, fetching]
  );

  return (
    <Fragment>
      <MobileHeader>
        <NewPostButton />
        <h3 style={{ fontSize: '2.5rem' }} className="heading-logo">
          Instaclone
        </h3>
        <Icon icon="paper-plane-outline" />
      </MobileHeader>
      <main data-test="page-home" className="home-page grid">
        {!fetching && feedPosts.length === 0 ? (
          <SuggestedUsers card />
        ) : (
          <Fragment>
            <Feed />
            <aside className="sidebar">
              <div className="sidebar__content">
                <UserCard
                  avatar={currentUser.avatar}
                  username={currentUser.username}
                  subText={currentUser.fullName}
                  style={{ padding: '0' }}
                  avatarMedium
                />
                <SuggestedUsers max={5} style={{ width: '100%' }} />
                <SmallFooter />
              </div>
            </aside>
          </Fragment>
        )}
      </main>
    </Fragment>
  );
};

const mapStateToProps = createStructuredSelector({
  currentUser: selectCurrentUser,
  token: selectToken,
  feedPosts: selectFeedPosts,
  hasMore: selectHasMore,
  fetching: selectFeedFetching,
});

const mapDispatchToProps = (dispatch) => ({
  // fetchFeedPostsStart: (authToken, offset) =>
  //   dispatch(fetchFeedPostsStart(authToken, offset)),
 // clearPosts: () => dispatch(clearPosts()),
});

export default HomePage;
