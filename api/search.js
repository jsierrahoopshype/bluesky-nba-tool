const https = require('https');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { q, hours = 24, minReposts = 10 } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query required' });
  }

  // Try using bsky.social instead of public.api
  const searchUrl = `https://bsky.social/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&limit=100`;
  
  https.get(searchUrl, (apiResponse) => {
    let data = '';
    
    apiResponse.on('data', (chunk) => {
      data += chunk;
    });
    
    apiResponse.on('end', () => {
      try {
        const result = JSON.parse(data);
        
        // Log the response for debugging
        console.log('Bluesky response status:', apiResponse.statusCode);
        console.log('Response data:', JSON.stringify(result).substring(0, 200));
        
        if (!result.posts || result.posts.length === 0) {
          return res.json({ posts: [], message: 'No posts found' });
        }

        const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
        
        const filtered = result.posts
          .filter(post => {
            const postTime = new Date(post.record.createdAt);
            return postTime >= cutoffTime && (post.repostCount || 0) >= parseInt(minReposts);
          })
          .sort((a, b) => ((b.repostCount || 0) + (b.likeCount || 0)) - ((a.repostCount || 0) + (a.likeCount || 0)))
          .map(post => ({
            text: post.record.text,
            author: post.author.displayName || post.author.handle,
            handle: post.author.handle,
            reposts: post.repostCount || 0,
            likes: post.likeCount || 0,
            url: `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`,
            createdAt: new Date(post.record.createdAt).toLocaleString()
          }));

        return res.json({ posts: filtered });
        
      } catch (error) {
        console.error('Parse error:', error);
        return res.status(500).json({ error: error.message });
      }
    });
    
  }).on('error', (error) => {
    console.error('Request error:', error);
    return res.status(500).json({ error: error.message });
  });
};
