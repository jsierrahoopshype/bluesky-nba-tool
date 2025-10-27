module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    ok: true,
    hasIdentifier: !!process.env.BSKY_IDENTIFIER,
    hasPassword: !!process.env.BSKY_APP_PASSWORD
  });
};
