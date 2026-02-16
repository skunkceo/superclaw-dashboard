import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getLicense } from '@/lib/license';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const license = getLicense();

  if (!license) {
    return NextResponse.json({
      active: false,
      tier: 'free',
      features: [],
    });
  }

  // Check if expired
  const isExpired = license.expiresAt && license.expiresAt < Date.now();

  return NextResponse.json({
    active: license.status === 'active' && !isExpired,
    tier: license.status === 'active' && !isExpired ? 'pro' : 'free',
    features: license.features,
    activatedAt: license.activatedAt,
    expiresAt: license.expiresAt,
    email: license.email,
  });
}
