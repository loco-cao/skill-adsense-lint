#!/usr/bin/env node

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '..', 'dist', 'cli.js');

if (!fs.existsSync(distPath)) {
  console.error('Error: adsense-lint is not built yet.');
  console.error('Please run: npm run build');
  process.exit(1);
}

import(pathToFileURL(distPath).href);
