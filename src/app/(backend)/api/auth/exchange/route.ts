import { importJWK, SignJWT } from 'jose';
import { type NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { authEnv } from '@/envs/auth';

/**
 * POST /api/auth/exchange
 *
 * Exchange the current better-auth session (from httpOnly cookie) for an
 * OIDC-style RS256 JWT that the desktop main process can use as the
 * `Oidc-Auth` header for gateway and API authentication.
 *
 * Returns: { access_token, expires_in, token_type }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Validate the better-auth session from request cookies
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2. Read JWKS private key for signing
    const jwksString = authEnv.JWKS_KEY;
    if (!jwksString) {
      console.error('[auth/exchange] JWKS_KEY is not configured');
      return NextResponse.json(
        { error: 'Server not configured for token exchange' },
        { status: 500 },
      );
    }

    let jwks: { keys: Array<Record<string, unknown>> };
    try {
      jwks = JSON.parse(jwksString) as { keys: Array<Record<string, unknown>> };
    } catch {
      return NextResponse.json({ error: 'Invalid JWKS configuration' }, { status: 500 });
    }

    if (!jwks.keys || !Array.isArray(jwks.keys) || jwks.keys.length === 0) {
      return NextResponse.json({ error: 'JWKS has no keys' }, { status: 500 });
    }

    const privateKeyEntry = jwks.keys.find(
      (key: Record<string, unknown>) => key.alg === 'RS256' && key.kty === 'RSA',
    );

    if (!privateKeyEntry) {
      return NextResponse.json({ error: 'No RS256 key found in JWKS' }, { status: 500 });
    }

    // 3. Import the private key and sign a JWT
    const signingKey = await importJWK(privateKeyEntry, 'RS256');

    const expiresIn = 3600; // 1 hour
    const issuedAt = Math.floor(Date.now() / 1000);

    const token = await new SignJWT({
      client_id: 'lobehub-desktop',
      scope: 'profile email offline_access',
      sub: session.user.id,
    })
      .setProtectedHeader({
        alg: 'RS256',
        kid: privateKeyEntry.kid as string | undefined,
      })
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + expiresIn)
      .setJti(crypto.randomUUID())
      .sign(signingKey);

    return NextResponse.json({
      access_token: token,
      expires_in: expiresIn,
      token_type: 'Bearer',
    });
  } catch (error) {
    console.error('[auth/exchange] Token exchange error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
