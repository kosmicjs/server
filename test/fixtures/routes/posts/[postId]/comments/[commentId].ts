import type {Middleware} from 'koa';

export const get: Middleware = async (ctx) => {
  const {postId, commentId} = ctx.params ?? {};
  ctx.body = {
    postId,
    commentId,
    text: `Comment ${commentId} on post ${postId}`,
  };
};
