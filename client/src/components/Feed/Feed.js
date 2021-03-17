import React, { Fragment } from 'react';
import { connect,useSelector } from 'react-redux';
import { createStructuredSelector } from 'reselect';

import {
  selectFeedPosts,
  selectFeedFetching,
} from '../../redux/feed/feedSelectors';

import PostDialog from '../PostDialog/PostDialog';
import FeedBottom from './FeedBottom/FeedBottom';

function Feed  ({  feedFetching })  {
  
  const feed  =useSelector((state) => state.feed)
           const feedPosts=feed.posts
         //  const fetching=feed.fetching

  return (
    <section className="feed">
      {feedPosts &&
        feedPosts.map((post, idx) => (
          <PostDialog simple postData={post} postId={post._id} key={idx} />
        ))}
      {feedFetching && (
        <Fragment>
          <PostDialog simple loading />
          <PostDialog simple loading />
          <PostDialog simple loading />
        </Fragment>
      )}
      {!feedFetching && feedPosts.length > 0 && <FeedBottom />}
    </section>
  );
};

const mapStateToProps = createStructuredSelector({
  feedPosts: selectFeedPosts,
  feedFetching: selectFeedFetching,
});

export default connect(mapStateToProps)(Feed);
