import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function localLeaderboardPlugin(): Plugin {
  let memoryLeaderboard: any[] = [];
  return {
    name: 'local-leaderboard-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/leaderboard', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method === 'GET') {
          res.statusCode = 200;
          res.end(JSON.stringify(memoryLeaderboard));
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const newEntry = JSON.parse(body);
              if (newEntry && newEntry.id) {
                const idx = memoryLeaderboard.findIndex((e) => e.id === newEntry.id);
                if (idx >= 0) {
                  memoryLeaderboard[idx] = newEntry;
                } else {
                  memoryLeaderboard.push(newEntry);
                }
                memoryLeaderboard.sort((a, b) => {
                  if (a.playtimeSeconds !== b.playtimeSeconds) {
                    return a.playtimeSeconds - b.playtimeSeconds;
                  }
                  if (a.totalKana !== b.totalKana) {
                    return (b.totalKana || 0) - (a.totalKana || 0);
                  }
                  return b.timestamp - a.timestamp;
                });
                memoryLeaderboard = memoryLeaderboard.slice(0, 100);
              }
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, allEntries: memoryLeaderboard }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), localLeaderboardPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

