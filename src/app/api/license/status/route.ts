import { NextRequest, NextResponse } from 'next/server';
import { getActiveLicense } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const license = getActiveLicense();

    if (!license) {
      return NextResponse.json({
        hasLicense: false,
        tier: 'free',
      });
    }

    return NextResponse.json({
      hasLicense: true,
      tier: license.tier,
      activatedAt: license.activated_at,
      expiresAt: license.expires_at,
      email: license.email,
    });
  } catch (error) {
    console.error('License status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
