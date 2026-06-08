/**
 * Community Controller
 * Manages discussion boards for Elite tier members
 */

const pool = require('../config/database');

/**
 * Get all posts for a module
 * @route GET /api/community/posts/:moduleId
 * @access Private (Elite only)
 */
exports.getPostsByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { sort = 'recent', limit = 20, offset = 0 } = req.query;

    let orderBy = 'created_at DESC';
    if (sort === 'popular') {
      orderBy = 'upvote_count DESC, created_at DESC';
    } else if (sort === 'trending') {
      orderBy = 'is_featured DESC, is_pinned DESC, upvote_count DESC';
    }

    const result = await pool.query(
      `SELECT
        cp.id, cp.user_id, cp.title, cp.content, cp.upvote_count, cp.reply_count,
        cp.is_pinned, cp.is_featured, cp.created_at, cp.updated_at,
        u.first_name, u.last_name, COALESCE(u.subscription_tier, s.tier, 'free') as tier,
        COALESCE(user_votes.voted, false) as user_voted
       FROM community_posts cp
       INNER JOIN users u ON cp.user_id = u.id
       LEFT JOIN subscriptions s ON u.id = s.user_id
       LEFT JOIN (
         SELECT post_id, true as voted
         FROM community_votes
         WHERE post_id IS NOT NULL AND user_id = $1
       ) user_votes ON cp.id = user_votes.post_id
       WHERE cp.module_id = $2
       ORDER BY ${orderBy}
       LIMIT $3 OFFSET $4`,
      [req.user.id, moduleId, limit, offset]
    );

    res.status(200).json({
      success: true,
      posts: result.rows
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching posts',
      error: error.message
    });
  }
};

/**
 * Create a new post
 * @route POST /api/community/posts
 * @access Private (Elite only)
 */
exports.createPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { moduleId, title, content } = req.body;

    // Validate input
    if (!moduleId || !title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Module ID, title, and content are required'
      });
    }

    // Check user is Elite (use tier from auth middleware which checks both subscriptions and users tables)
    const userTier = req.user.subscription_tier || 'free';

    if (userTier.toLowerCase() !== 'elite') {
      return res.status(403).json({
        success: false,
        message: 'Only Elite members can create posts'
      });
    }

    const result = await pool.query(
      `INSERT INTO community_posts (user_id, module_id, title, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, moduleId, title, content]
    );

    const post = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        moduleId: post.module_id,
        upvoteCount: post.upvote_count,
        replyCount: post.reply_count,
        createdAt: post.created_at
      }
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating post',
      error: error.message
    });
  }
};

/**
 * Get replies for a post
 * @route GET /api/community/posts/:postId/replies
 * @access Private
 */
exports.getReplies = async (req, res) => {
  try {
    const { postId } = req.params;

    const result = await pool.query(
      `SELECT
        cr.id, cr.user_id, cr.content, cr.upvote_count, cr.created_at, cr.updated_at,
        u.first_name, u.last_name, COALESCE(u.subscription_tier, s.tier, 'free') as tier,
        COALESCE(user_votes.voted, false) as user_voted
       FROM community_replies cr
       INNER JOIN users u ON cr.user_id = u.id
       LEFT JOIN subscriptions s ON u.id = s.user_id
       LEFT JOIN (
         SELECT reply_id, true as voted
         FROM community_votes
         WHERE reply_id IS NOT NULL AND user_id = $1
       ) user_votes ON cr.id = user_votes.reply_id
       WHERE cr.post_id = $2
       ORDER BY cr.upvote_count DESC, cr.created_at ASC`,
      [req.user.id, postId]
    );

    res.status(200).json({
      success: true,
      replies: result.rows
    });
  } catch (error) {
    console.error('Get replies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching replies',
      error: error.message
    });
  }
};

/**
 * Create a reply to a post
 * @route POST /api/community/posts/:postId/replies
 * @access Private
 */
exports.createReply = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    const { content } = req.body;

    // Validate input
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Reply content is required'
      });
    }

    // Create reply
    const replyResult = await pool.query(
      `INSERT INTO community_replies (post_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [postId, userId, content]
    );

    // Increment reply count on post
    await pool.query(
      'UPDATE community_posts SET reply_count = reply_count + 1 WHERE id = $1',
      [postId]
    );

    const reply = replyResult.rows[0];

    res.status(201).json({
      success: true,
      message: 'Reply created successfully',
      reply: {
        id: reply.id,
        content: reply.content,
        createdAt: reply.created_at
      }
    });
  } catch (error) {
    console.error('Create reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating reply',
      error: error.message
    });
  }
};

/**
 * Upvote a post
 * @route POST /api/community/posts/:postId/upvote
 * @access Private
 */
exports.upvotePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    // Check if user already voted
    const existingVote = await pool.query(
      `SELECT id FROM community_votes
       WHERE user_id = $1 AND post_id = $2`,
      [userId, postId]
    );

    if (existingVote.rows.length > 0) {
      // Remove vote
      await pool.query(
        `DELETE FROM community_votes
         WHERE user_id = $1 AND post_id = $2`,
        [userId, postId]
      );

      await pool.query(
        'UPDATE community_posts SET upvote_count = upvote_count - 1 WHERE id = $1',
        [postId]
      );

      return res.status(200).json({
        success: true,
        message: 'Vote removed',
        action: 'removed'
      });
    }

    // Add vote
    await pool.query(
      `INSERT INTO community_votes (user_id, post_id, vote_type)
       VALUES ($1, $2, 'upvote')`,
      [userId, postId]
    );

    await pool.query(
      'UPDATE community_posts SET upvote_count = upvote_count + 1 WHERE id = $1',
      [postId]
    );

    res.status(200).json({
      success: true,
      message: 'Post upvoted',
      action: 'added'
    });
  } catch (error) {
    console.error('Upvote post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error upvoting post',
      error: error.message
    });
  }
};

/**
 * Upvote a reply
 * @route POST /api/community/replies/:replyId/upvote
 * @access Private
 */
exports.upvoteReply = async (req, res) => {
  try {
    const userId = req.user.id;
    const { replyId } = req.params;

    // Check if user already voted
    const existingVote = await pool.query(
      `SELECT id FROM community_votes
       WHERE user_id = $1 AND reply_id = $2`,
      [userId, replyId]
    );

    if (existingVote.rows.length > 0) {
      // Remove vote
      await pool.query(
        `DELETE FROM community_votes
         WHERE user_id = $1 AND reply_id = $2`,
        [userId, replyId]
      );

      await pool.query(
        'UPDATE community_replies SET upvote_count = upvote_count - 1 WHERE id = $1',
        [replyId]
      );

      return res.status(200).json({
        success: true,
        message: 'Vote removed',
        action: 'removed'
      });
    }

    // Add vote
    await pool.query(
      `INSERT INTO community_votes (user_id, reply_id, vote_type)
       VALUES ($1, $2, 'upvote')`,
      [userId, replyId]
    );

    await pool.query(
      'UPDATE community_replies SET upvote_count = upvote_count + 1 WHERE id = $1',
      [replyId]
    );

    res.status(200).json({
      success: true,
      message: 'Reply upvoted',
      action: 'added'
    });
  } catch (error) {
    console.error('Upvote reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Error upvoting reply',
      error: error.message
    });
  }
};

/**
 * Delete a post (owner or admin only)
 * @route DELETE /api/community/posts/:postId
 * @access Private
 */
exports.deletePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    // Check if user is owner
    const postResult = await pool.query(
      'SELECT user_id FROM community_posts WHERE id = $1',
      [postId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (postResult.rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own posts'
      });
    }

    // Delete post (cascades to replies and votes)
    await pool.query(
      'DELETE FROM community_posts WHERE id = $1',
      [postId]
    );

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting post',
      error: error.message
    });
  }
};

/**
 * Delete a reply (owner or admin only)
 * @route DELETE /api/community/replies/:replyId
 * @access Private
 */
exports.deleteReply = async (req, res) => {
  try {
    const userId = req.user.id;
    const { replyId } = req.params;

    // Check if user is owner
    const replyResult = await pool.query(
      'SELECT user_id, post_id FROM community_replies WHERE id = $1',
      [replyId]
    );

    if (replyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found'
      });
    }

    if (replyResult.rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own replies'
      });
    }

    const postId = replyResult.rows[0].post_id;

    // Delete reply (cascades to votes)
    await pool.query(
      'DELETE FROM community_replies WHERE id = $1',
      [replyId]
    );

    // Decrement reply count on post
    await pool.query(
      'UPDATE community_posts SET reply_count = reply_count - 1 WHERE id = $1',
      [postId]
    );

    res.status(200).json({
      success: true,
      message: 'Reply deleted successfully'
    });
  } catch (error) {
    console.error('Delete reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting reply',
      error: error.message
    });
  }
};
