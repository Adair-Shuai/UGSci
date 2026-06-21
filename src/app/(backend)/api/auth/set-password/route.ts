// UGS-MODIFY: Set password endpoint for OTP-verified users
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { type NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { account } from '@/database/schemas/betterAuth';
import { serverDB } from '@/database/server';

/**
 * POST /api/auth/set-password
 * Set initial password for the currently authenticated user.
 * Body: { password: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Get the current session
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { password } = body;

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    const userId = session.user.id;

    // Check if user already has a credential account
    const [existingAccount] = await serverDB
      .select()
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
      .limit(1);

    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingAccount) {
      await serverDB
        .update(account)
        .set({ password: hashedPassword })
        .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));
    } else {
      const newId = `acct_${crypto.randomUUID()}`;
      await serverDB.insert(account).values({
        id: newId,
        accountId: userId,
        userId,
        providerId: 'credential',
        password: hashedPassword,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[set-password] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
