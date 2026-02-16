import { NextRequest, NextResponse } from 'next/server';
import { getLicenseByKey, activateLicense } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licenseKey, email } = body;

    if (!licenseKey) {
      return NextResponse.json({ error: 'License key required' }, { status: 400 });
    }

    const license = getLicenseByKey(licenseKey);

    if (!license) {
      return NextResponse.json({ error: 'Invalid license key' }, { status: 404 });
    }

    if (license.status !== 'active') {
      return NextResponse.json({ error: 'License is inactive or expired' }, { status: 403 });
    }

    // If not activated yet, activate it now
    if (!license.activated_at) {
      activateLicense(licenseKey, email);
    }

    return NextResponse.json({
      valid: true,
      tier: license.tier,
      activatedAt: license.activated_at || Date.now(),
      expiresAt: license.expires_at,
    });
  } catch (error) {
    console.error('License validation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
