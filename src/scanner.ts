import fs from 'node:fs';
import path from 'node:path';
import glob from 'fast-glob';
import type { CheckContext } from './types.js';

export interface ScanOptions {
  cwd?: string;
  pagesDir?: string;
}

export async function scanProject(options: ScanOptions = {}): Promise<CheckContext> {
  const cwd = options.cwd ?? process.cwd();
  let projectType = detectProjectType(cwd);
  const pagesDir = options.pagesDir ? path.resolve(cwd, options.pagesDir) : undefined;

  if (projectType === 'unknown' && pagesDir && fs.existsSync(pagesDir)) {
    const htmlFiles = glob.sync('*.html', { cwd: pagesDir, onlyFiles: true });
    if (htmlFiles.length > 0) {
      projectType = 'html';
    } else if (
      fs.existsSync(path.join(pagesDir, 'layout.tsx')) ||
      fs.existsSync(path.join(pagesDir, 'layout.ts')) ||
      fs.existsSync(path.join(pagesDir, 'layout.jsx')) ||
      fs.existsSync(path.join(pagesDir, 'layout.js'))
    ) {
      projectType = 'nextjs-app';
    } else if (
      fs.existsSync(path.join(pagesDir, '_app.tsx')) ||
      fs.existsSync(path.join(pagesDir, '_app.ts')) ||
      fs.existsSync(path.join(pagesDir, '_app.jsx')) ||
      fs.existsSync(path.join(pagesDir, '_app.js'))
    ) {
      projectType = 'nextjs-pages';
    }
  }

  const pages = await scanPages(cwd, projectType, pagesDir);

  return {
    projectType,
    pages,
  };
}

function detectProjectType(cwd: string): CheckContext['projectType'] {
  if (fs.existsSync(path.join(cwd, 'next.config.js')) || fs.existsSync(path.join(cwd, 'next.config.ts')) || fs.existsSync(path.join(cwd, 'next.config.mjs'))) {
    const hasAppLayout =
      fs.existsSync(path.join(cwd, 'app', 'layout.tsx')) ||
      fs.existsSync(path.join(cwd, 'app', 'layout.ts')) ||
      fs.existsSync(path.join(cwd, 'app', 'layout.jsx')) ||
      fs.existsSync(path.join(cwd, 'app', 'layout.js'));
    if (fs.existsSync(path.join(cwd, 'app')) && hasAppLayout) {
      return 'nextjs-app';
    }
    if (fs.existsSync(path.join(cwd, 'pages')) || fs.existsSync(path.join(cwd, 'src', 'pages'))) {
      return 'nextjs-pages';
    }
    return 'nextjs-app';
  }

  if (fs.existsSync(path.join(cwd, 'vite.config.ts')) || fs.existsSync(path.join(cwd, 'vite.config.js')) || fs.existsSync(path.join(cwd, 'vite.config.mjs'))) {
    return 'vite';
  }

  const htmlFiles = glob.sync('*.html', { cwd, onlyFiles: true });
  if (htmlFiles.length > 0) {
    return 'html';
  }

  return 'unknown';
}

async function scanPages(
  cwd: string,
  projectType: CheckContext['projectType'],
  pagesDir?: string
): Promise<CheckContext['pages']> {
  const pages: CheckContext['pages'] = [];

  if (projectType === 'nextjs-app') {
    const appDir = pagesDir ?? (fs.existsSync(path.join(cwd, 'src', 'app')) ? path.join(cwd, 'src', 'app') : path.join(cwd, 'app'));
    if (fs.existsSync(appDir)) {
      const files = glob.sync('**/*.{tsx,ts,jsx,js,mdx}', { cwd: appDir, onlyFiles: true });
      for (const file of files) {
        const route = appFileToRoute(file);
        if (route !== null) {
          const filePath = path.join(appDir, file);
          const content = await readFileSafe(filePath);
          pages.push({ route, filePath, content });
        }
      }
    }
  } else if (projectType === 'nextjs-pages') {
    const pagesRoot = pagesDir ?? (fs.existsSync(path.join(cwd, 'src', 'pages')) ? path.join(cwd, 'src', 'pages') : path.join(cwd, 'pages'));
    if (fs.existsSync(pagesRoot)) {
      const files = glob.sync('**/*.{tsx,ts,jsx,js,mdx}', { cwd: pagesRoot, onlyFiles: true });
      for (const file of files) {
        const route = pagesFileToRoute(file);
        if (route !== null) {
          const filePath = path.join(pagesRoot, file);
          const content = await readFileSafe(filePath);
          pages.push({ route, filePath, content });
        }
      }
    }
  } else if (projectType === 'vite') {
    const htmlFiles = glob.sync('**/*.html', { cwd, onlyFiles: true });
    for (const file of htmlFiles) {
      const filePath = path.join(cwd, file);
      const content = await readFileSafe(filePath);
      const route = '/' + file.replace(/\.html$/, '').replace(/index$/, '');
      pages.push({ route: route === '/' ? '/' : route.replace(/\/$/, ''), filePath, content });
    }
  } else if (projectType === 'html') {
    const scanDir = pagesDir ?? cwd;
    const htmlFiles = glob.sync('*.html', { cwd: scanDir, onlyFiles: true });
    for (const file of htmlFiles) {
      const filePath = path.join(scanDir, file);
      const content = await readFileSafe(filePath);
      const route = '/' + file.replace(/\.html$/, '');
      pages.push({ route: route === '/index' ? '/' : route, filePath, content });
    }
  }

  return pages;
}

function appFileToRoute(file: string): string | null {
  const base = file.replace(/\.(tsx|ts|jsx|js|mdx)$/, '');
  const parts = base.split(/[\\/]/);

  const pageIndex = parts.indexOf('page');
  if (pageIndex === -1) return null;

  const routeParts = parts.slice(0, pageIndex);
  const cleaned = routeParts
    .filter((p) => !p.startsWith('(') && !p.endsWith(')'))
    .filter((p) => p !== '@')
    .map((p) => {
      if (p.startsWith('[') && p.endsWith(']')) {
        return ':' + p.slice(1, -1).replace(/^\.\.\./, '*').replace(/^\./, '');
      }
      return p;
    });

  if (cleaned.length === 0 || (cleaned.length === 1 && cleaned[0] === '')) return '/';
  return '/' + cleaned.join('/');
}

function pagesFileToRoute(file: string): string | null {
  const base = file.replace(/\.(tsx|ts|jsx|js|mdx)$/, '');
  const parts = base.split(/[\\/]/);

  if (parts.includes('_app') || parts.includes('_document') || parts.includes('_error') || parts.includes('api')) {
    return null;
  }

  const cleaned = parts.map((p) => {
    if (p.startsWith('[') && p.endsWith(']')) {
      return ':' + p.slice(1, -1).replace(/^\.\.\./, '*').replace(/^\./, '');
    }
    return p;
  });

  if (cleaned[cleaned.length - 1] === 'index') {
    cleaned.pop();
  }

  if (cleaned.length === 0 || (cleaned.length === 1 && cleaned[0] === '')) return '/';
  return '/' + cleaned.join('/');
}

async function readFileSafe(filePath: string): Promise<string> {
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
}
