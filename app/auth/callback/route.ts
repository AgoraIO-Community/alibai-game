import { NextResponse } from 'next/server';
import { setTokens } from '@/lib/server/auth';
import { appUrl, clearOAuthCookies, oauthClient } from '@/lib/server/oauth';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  let destination = '/rules?auth_error=signin_failed';
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    if (!code || code.length > 2048 || url.searchParams.has('error')) throw new Error('Invalid OAuth callback');
    const client = await oauthClient();
    const {data,error} = await client.auth.exchangeCodeForSession(code);
    if (error || !data.session || !data.user || data.user.is_anonymous) throw new Error('OAuth exchange failed');
    await setTokens(data.session);
    destination = '/rules';
  } catch {
    // Never reflect provider errors or tokens into the page/URL/logs.
  } finally { await clearOAuthCookies(); }
  return NextResponse.redirect(appUrl(destination), {status:303, headers:{'Cache-Control':'no-store'}});
}
