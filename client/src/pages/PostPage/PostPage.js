import React, { Fragment } from 'react';
import { useParams } from 'react-router-dom';

import PostDialogR from '../../components/PostDialog/PostDialogR';
import MobileHeader from '../../components/Header/MobileHeader/MobileHeader';

const PostPage = () => {
  const { postId } = useParams();

  return (
    <Fragment>
      <MobileHeader backArrow>
        <h3 className="heading-3">Post</h3>
        {/* Empty element to keep grid happy */}
        <div></div>
      </MobileHeader>
      <main className="post-page grid">
        <PostDialogR className="border-grey-2" postId={postId} />
      </main>
    </Fragment>
  );
};

export default PostPage;
