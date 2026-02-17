import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { licenseKey } = await request.json();

    if (!licenseKey || typeof licenseKey !== 'string') {
      return NextResponse.json(
        { valid: false, message: 'License key is required' },
        { status: 400 }
      );
    }

    // Validate license key with Skunk Global API
    const response = await fetch('https://skunkglobal.com/api/license/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseKey,
        product: 'superclaw-dashboard-pro'
      })
    });

    if (!response.ok) {
      return NextResponse.json(
        { valid: false, message: 'Failed to validate license with server' },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (data.valid) {
      // Store license key in local file or database
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      const homeDir = os.homedir();
      const configDir = process.env.SUPERCLAW_DATA_DIR || path.join(homeDir, '.superclaw');
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const licensePath = path.join(configDir, 'license.json');
      fs.writeFileSync(licensePath, JSON.stringify({
        key: licenseKey,
        activatedAt: Date.now(),
        product: 'superclaw-dashboard-pro',
        tier: data.tier || 'pro',
        expiresAt: data.expiresAt || null
      }, null, 2));

      return NextResponse.json({
        valid: true,
        message: 'License activated successfully',
        tier: data.tier || 'pro'
      });
    } else {
      return NextResponse.json({
        valid: false,
        message: data.message || 'Invalid license key'
      });
    }

  } catch (error) {
    console.error('License validation error:', error);
    return NextResponse.json(
      { valid: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
