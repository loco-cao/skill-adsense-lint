import type { Check } from '../types.js';
import { requiredPagesCheck } from './required-pages.js';
import { cookieConsentCheck } from './cookie-consent.js';
import { pageStructureCheck } from './page-structure.js';
import { contentQualityCheck } from './content-quality.js';
import { adsPlacementCheck } from './ads-placement.js';
import { authenticityCheck } from './authenticity.js';

export const checks: Check[] = [
  requiredPagesCheck,
  cookieConsentCheck,
  pageStructureCheck,
  contentQualityCheck,
  adsPlacementCheck,
  authenticityCheck,
];
