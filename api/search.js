// api/search.js
const https = require('https');

function postJSON(hostname, path, body) {
  const payload = Buffer.from(JSON.stringify(body));
  const options = {
    hostname,
    path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length
    }
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            return reject(new Error(json?.message || `HTTP ${res.statusCode}`));
          }
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJSON(hostname, path, headers = {}) {
  const options = {
    hostname,
    path,
    method: 'GET',
    headers
  };
  return new Promise((resolve, reject) => {
    https
      .get(options, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode >= 400) {
              return reject(new Error(json?.message || `HTTP ${res.statusCode}`));
            }
            resolve(json);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { q, hours = 24, minReposts = 10, limit = 100 } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Search query required (q)' });
  }
  const identifier = process.env.BSKY_IDENTIFIER;
  const password = process.env.BSKY_APP_PASSWORD;
  if (!identifier || !password) {
    return res.status(500).json({ error: 'Server missing Bluesky credentials' });
  }

  try {
    // 1) Create a session to get accessJwt
    const session = await postJSON(
      'bsky.social',
      '/xrpc/com.atproto.server.createSession',
      { identifier, password }
    );
    const accessJwt = session?.accessJwt;
    if (!accessJwt) throw new Error('No access token from Bluesky');

    // 2) Authenticated search
    const encodedQ = encodeURIComponent(q);
    const lim = Math.min(parseInt(limit, 10) || 100, 100);
    const searchPath = `/xrpc/app.bsky.feed.searchPosts?q=${encodedQ}&limit=${lim}`;

    const data = await getJSON('bsky.social', searchPath, {
      Authorization: `Bearer ${accessJwt}`
    });

    const posts = Array.isArray(data?.posts) ? data.posts : [];
    const cutoffTime = new Date(Date.now() - (parseInt(hours, 10) || 24) * 3600000);
    const threshold = parseInt(minReposts, 10) || 0;

    const filtered = posts
      .filter((p) => {
        const t = new Date(p?.record?.createdAt || 0);
        const reposts = p?.repostCount || 0;
        return t >= cutoffTime && reposts >= threshold;
      })
      .sort((a, b) => {
        const ea = (a?.repostCount || 0) + (a?.likeCount || 0);
        const eb = (b?.repostCount || 0) + (b?.likeCount || 0);
        return eb - ea;
      })
      .map((p) => {
        const uri = p?.uri || '';
        const rkey = uri.split('/').pop();
        return {
          text: p?.record?.text || '',
          author: p?.author?.displayName || p?.author?.handle || '',
          handle: p?.author?.handle || '',
          reposts: p?.repostCount || 0,
          likes: p?.likeCount || 0,
          url: p?.author?.handle && rkey
            ? `https://bsky.app/profile/${p.author.handle}/post/${rkey}`
            : null,
          createdAt: p?.record?.createdAt || ''
        };
      });

    res.json({ posts: filtered });
  } catch (err) {
    console.error('Bluesky search error:', err);
    res.status(500).json({ error: err.message || 'Search failed' });
  }
};
