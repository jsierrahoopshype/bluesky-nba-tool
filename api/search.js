export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { q, hours = 24, minReposts = 10 } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query required' });
  }

  try {
    const https = require('https');
    const searchUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&limit=100`;
    
    // Use https.get instead of fetch for Node.js compatibility
    const fetchData = () => {
      return new Promise((resolve, reject) => {
        https.get(searchUrl, (response) => {
          let data = '';
          response.on('data', (chunk) => { data += chunk; });
          response.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', reject);
      });
    };

    const data = await fetchData();
    
    if (!data.posts || data.posts.length === 0) {
      return res.json({ posts: [], message: 'No posts found' });
    }

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const filtered = data.posts
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
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
