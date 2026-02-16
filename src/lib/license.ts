import { getActiveLicense, License } from './db';

export type LicenseTier = 'free' | 'pro';

export interface LicenseInfo {
  tier: LicenseTier;
  hasLicense: boolean;
  activatedAt?: number;
  expiresAt?: number | null;
  email?: string | null;
}

/**
 * Check if the user has Pro tier access
 */
export function hasProAccess(): boolean {
  const license = getActiveLicense();
  return license !== undefined && license.status === 'active';
}

/**
 * Get current license information
 */
export function getLicenseInfo(): LicenseInfo {
  const license = getActiveLicense();

  if (!license) {
    return {
      tier: 'free',
      hasLicense: false,
    };
  }

  return {
    tier: license.tier,
    hasLicense: true,
    activatedAt: license.activated_at || undefined,
    expiresAt: license.expires_at,
    email: license.email,
  };
}

/**
 * Features gated behind Pro tier
 */
export const ProFeatures = {
  ADVANCED_ANALYTICS: 'advanced_analytics',
  AUTOMATION: 'automation',
  MULTI_USER: 'multi_user',
  PRIORITY_SUPPORT: 'priority_support',
  EARLY_ACCESS: 'early_access',
} as const;

/**
 * Check if a specific Pro feature is available
 */
export function hasFeature(feature: string): boolean {
  return hasProAccess();
}
