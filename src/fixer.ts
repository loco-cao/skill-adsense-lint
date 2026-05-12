import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CheckContext, CheckResult, CheckIssue } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

export interface FixOptions {
  dryRun?: boolean;
}

export async function applyFixes(
  context: CheckContext,
  results: CheckResult[],
  options: FixOptions = {}
): Promise<{ applied: number; skipped: number; details: string[] }> {
  const fixableIssues: Array<{ issue: CheckIssue; resultName: string }> = [];

  for (const result of results) {
    for (const issue of result.issues) {
      if (issue.fixable && issue.template) {
        fixableIssues.push({ issue, resultName: result.name });
      }
    }
  }

  let applied = 0;
  let skipped = 0;
  const details: string[] = [];

  for (const { issue } of fixableIssues) {
    try {
      const ok = await applyFix(context, issue, options);
      if (ok) {
        applied++;
        details.push(`Applied: ${issue.message}`);
      } else {
        skipped++;
        details.push(`Skipped: ${issue.message}`);
      }
    } catch (err) {
      skipped++;
      details.push(`Error: ${issue.message} — ${(err as Error).message}`);
    }
  }

  return { applied, skipped, details };
}

async function applyFix(
  context: CheckContext,
  issue: CheckIssue,
  options: FixOptions
): Promise<boolean> {
  if (!issue.template) return false;

  const templatePath = path.join(TEMPLATES_DIR, issue.template);
  if (!fs.existsSync(templatePath)) {
    return false;
  }

  const templateContent = await fs.promises.readFile(templatePath, 'utf-8');

  if (issue.message.includes('Missing /about')) {
    const dest = resolvePagePath(context, 'about');
    if (fs.existsSync(dest)) return false;
    await writeFileSafe(dest, wrapTemplate(templateContent, 'About', context.projectType), options.dryRun);
    return true;
  }

  if (issue.message.includes('Missing /privacy')) {
    const dest = resolvePagePath(context, 'privacy');
    if (fs.existsSync(dest)) return false;
    await writeFileSafe(dest, wrapTemplate(templateContent, 'Privacy Policy', context.projectType), options.dryRun);
    return true;
  }

  if (issue.message.includes('Missing /contact')) {
    const dest = resolvePagePath(context, 'contact');
    if (fs.existsSync(dest)) return false;
    await writeFileSafe(dest, wrapTemplate(templateContent, 'Contact Us', context.projectType), options.dryRun);
    return true;
  }

  if (issue.message.includes('Missing /terms')) {
    const dest = resolvePagePath(context, 'terms');
    if (fs.existsSync(dest)) return false;
    await writeFileSafe(dest, wrapTemplate(templateContent, 'Terms of Service', context.projectType), options.dryRun);
    return true;
  }

  if (issue.message.includes('cookie consent')) {
    if (context.projectType === 'nextjs-app' || context.projectType === 'nextjs-pages') {
      const root = getProjectRoot(context);
      const usesSrc =
        fs.existsSync(path.join(root, 'src', 'app')) ||
        fs.existsSync(path.join(root, 'src', 'pages'));
      const componentsDir = usesSrc ? path.join(root, 'src', 'components') : path.join(root, 'components');
      const dest = path.join(componentsDir, 'CookieBanner.tsx');
      if (fs.existsSync(dest)) return false;
      await writeFileSafe(dest, templateContent, options.dryRun);

      const layoutFile = findLayoutFile(context);
      if (layoutFile && !options.dryRun) {
        const content = await fs.promises.readFile(layoutFile, 'utf-8');
        if (!content.includes('CookieBanner')) {
          const importLine = `import CookieBanner from '../components/CookieBanner';\n`;
          const newContent = importLine + content.replace(/(<body[^>]*>)/, `$1\n<CookieBanner />`);
          await fs.promises.writeFile(layoutFile, newContent, 'utf-8');
        }
      }
      return true;
    }

    const dest = path.join(getProjectRoot(context), 'cookie-banner.html');
    if (fs.existsSync(dest)) return false;
    await writeFileSafe(
      dest,
      `<div style="position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #ddd;padding:16px;z-index:9999;">\n  We use cookies to improve your experience and serve personalized ads.\n  <button onclick="localStorage.setItem('cookie-consent','accepted');this.parentElement.remove()">Accept</button>\n</div>\n`,
      options.dryRun
    );
    return true;
  }

  return false;
}

function getProjectRoot(context: CheckContext): string {
  if (context.projectType === 'nextjs-app' || context.projectType === 'nextjs-pages') {
    if (context.pages.length > 0) {
      let dir = path.dirname(context.pages[0].filePath);
      while (dir !== path.parse(dir).root) {
        if (
          fs.existsSync(path.join(dir, 'next.config.js')) ||
          fs.existsSync(path.join(dir, 'next.config.ts')) ||
          fs.existsSync(path.join(dir, 'next.config.mjs'))
        ) {
          return dir;
        }
        dir = path.dirname(dir);
      }
    }
    return process.cwd();
  }
  if (context.pages.length > 0) {
    return path.dirname(context.pages[0].filePath);
  }
  return process.cwd();
}

function resolvePagePath(context: CheckContext, pageName: string): string {
  const root = getProjectRoot(context);

  if (context.projectType === 'nextjs-app') {
    const appDir = fs.existsSync(path.join(root, 'src', 'app')) ? path.join(root, 'src', 'app') : path.join(root, 'app');
    return path.join(appDir, pageName, 'page.tsx');
  }

  if (context.projectType === 'nextjs-pages') {
    const pagesDir = fs.existsSync(path.join(root, 'src', 'pages')) ? path.join(root, 'src', 'pages') : path.join(root, 'pages');
    return path.join(pagesDir, `${pageName}.tsx`);
  }

  return path.join(root, `${pageName}.html`);
}

function wrapTemplate(content: string, title: string, projectType: CheckContext['projectType']): string {
  if (projectType === 'nextjs-app' || projectType === 'nextjs-pages') {
    return `export const metadata = {\n  title: '${title}',\n  description: '${title} page',\n};\n\nexport default function Page() {\n  return (\n    <main className="p-8 max-w-2xl mx-auto">\n      <article className="prose">\n${content.split('\n').map((l) => '        ' + l).join('\n')}\n      </article>\n    </main>\n  );\n}\n`;
  }

  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${title}</title>\n  <meta name="description" content="${title} page">\n</head>\n<body>\n  <main>\n${content.split('\n').map((l) => '    ' + l).join('\n')}\n  </main>\n</body>\n</html>\n`;
}

function findLayoutFile(context: CheckContext): string | null {
  const root = getProjectRoot(context);
  if (context.projectType === 'nextjs-app') {
    const candidates = [
      path.join(root, 'src', 'app', 'layout.tsx'),
      path.join(root, 'src', 'app', 'layout.ts'),
      path.join(root, 'src', 'app', 'layout.jsx'),
      path.join(root, 'src', 'app', 'layout.js'),
      path.join(root, 'app', 'layout.tsx'),
      path.join(root, 'app', 'layout.ts'),
      path.join(root, 'app', 'layout.jsx'),
      path.join(root, 'app', 'layout.js'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }
  if (context.projectType === 'nextjs-pages') {
    const candidates = [
      path.join(root, 'src', 'pages', '_app.tsx'),
      path.join(root, 'src', 'pages', '_app.ts'),
      path.join(root, 'src', 'pages', '_app.jsx'),
      path.join(root, 'src', 'pages', '_app.js'),
      path.join(root, 'pages', '_app.tsx'),
      path.join(root, 'pages', '_app.ts'),
      path.join(root, 'pages', '_app.jsx'),
      path.join(root, 'pages', '_app.js'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }
  return null;
}

async function writeFileSafe(filePath: string, content: string, dryRun?: boolean): Promise<void> {
  if (dryRun) {
    console.log(`[dry-run] Would write ${filePath}`);
    return;
  }
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, content, 'utf-8');
}
