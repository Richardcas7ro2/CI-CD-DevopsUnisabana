const express = require('express');
const os = require('os');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/info', (req, res) => {
  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    architecture: os.arch(),
    nodeVersion: process.version,
    uptime: os.uptime()
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
