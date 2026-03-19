require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const routes  = require('./routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Serve dashboard HTML + assets from /public ────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Catch-all: return index.html for any other path ──────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  TraceAI server running — port ${PORT}`);
  console.log(`📊  Dashboard : http://localhost:${PORT}`);
  console.log(`🔌  API health: http://localhost:${PORT}/api/health`);
});
