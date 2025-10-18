const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// API endpoint to run the Puppeteer script
app.post('/api/check-email', (req, res) => {
  const { username } = req.body;
  
  console.log('\n========================================');
  console.log('New request received');
  console.log('Username:', username);
  console.log('========================================\n');
  
  if (!username || username.trim() === '') {
    console.error('ERROR: Username is empty');
    return res.status(400).json({ 
      status: 'error', 
      message: 'Username is required' 
    });
  }

  // Set headers for SSE (Server-Sent Events) to stream logs
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Spawn the Puppeteer script
  const scriptPath = path.join(__dirname, 'index.js');
  const args = [scriptPath, '--username', username.trim()];
  
  console.log('Spawning process:', 'node', args.join(' '));
  
  // Add --show flag to see browser (comment out for headless)
  args.push('--show');
  
  const child = spawn('node', args, {
    env: { ...process.env },
    shell: true
  });

  console.log('Process spawned with PID:', child.pid);

  // Stream stderr (diagnostic messages) to client
  child.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      console.log('[STDERR]:', message);
      res.write(`data: ${JSON.stringify({ type: 'log', message })}\n\n`);
    }
  });

  // Stream stdout (final result) to client
  child.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      console.log('[STDOUT]:', message);
      try {
        const result = JSON.parse(message);
        res.write(`data: ${JSON.stringify({ type: 'result', data: result })}\n\n`);
      } catch (e) {
        res.write(`data: ${JSON.stringify({ type: 'log', message })}\n\n`);
      }
    }
  });

  // Handle process completion
  child.on('close', (code) => {
    console.log('Process closed with code:', code);
    res.write(`data: ${JSON.stringify({ type: 'done', code })}\n\n`);
    res.end();
  });

  // Handle errors
  child.on('error', (error) => {
    console.error('Process error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Open your browser and navigate to http://localhost:${PORT}`);
});
