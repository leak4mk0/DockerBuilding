const express = require('express');
const meta = require('./package.json');

const app = express();
app.get('/', (req, res) => {
  res.end(`Name: ${meta.name}\nVersion: ${meta.version}\n`);
});
app.listen(8080);
