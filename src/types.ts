export interface CheckContext {
  projectType: 'nextjs-app' | 'nextjs-pages' | 'vite' | 'html' | 'unknown';
  pages: Array<{
    route: string;
    filePath: string;
    content: string;
  }>;
}

export interface CheckIssue {
  message: string;
  route?: string;
  filePath?: string;
  fixable: boolean;
  template?: string;
}

export interface CheckResult {
  name: string;
  weight: number;
  passed: boolean;
  score: number;
  issues: CheckIssue[];
}

export interface Check {
  name: string;
  weight: number;
  check(context: CheckContext): Promise<CheckResult>;
}
