import { NextResponse } from 'next/server';
import packageJson from '../../../../package.json';

const NPM_REGISTRY = 'https://registry.npmjs.org/@skunkceo/superclaw-dashboard';

export async function GET() {
  const currentVersion = packageJson.version;
  
  try {
    // Check npm for latest version
    const response = await fetch(NPM_REGISTRY, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (response.ok) {
      const data = await response.json();
      const latestVersion = data['dist-tags']?.latest || currentVersion;
      const updateAvailable = latestVersion !== currentVersion && 
        compareVersions(latestVersion, currentVersion) > 0;
      
      return NextResponse.json({
        current: currentVersion,
        latest: latestVersion,
        updateAvailable,
        changelog: updateAvailable ? `https://github.com/skunkceo/superclaw-dashboard/releases/tag/v${latestVersion}` : null
      });
    }
  } catch (error) {
    console.error('Failed to check for updates:', error);
  }
  
  // Fallback if npm check fails
  return NextResponse.json({
    current: currentVersion,
    latest: currentVersion,
    updateAvailable: false,
    changelog: null
  });
}

// Simple semver comparison
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
