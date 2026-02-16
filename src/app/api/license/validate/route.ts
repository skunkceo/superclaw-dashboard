import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { validateLicenseKey, saveLicense } from '@/lib/license';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { licenseKey } = await request.json();

    if (!licenseKey || typeof licenseKey !== 'string') {
      return NextResponse.json({ error: 'License key is required' }, { status: 400 });
    }

    // Validate the license key
    const result = await validateLicenseKey(licenseKey, user.email);

    if (result.valid) {
      // Save license locally
      saveLicense({
        key: licenseKey,
        email: user.email,
        status: 'active',
        activatedAt: Date.now(),
        features: result.features || ['pro'],
      });

      return NextResponse.json({
        success: true,
        message: result.message,
        features: result.features,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('License validation error:', error);
    return NextResponse.json({
      error: 'Failed to validate license',
      details: error.message,
    }, { status: 500 });
  }
}
