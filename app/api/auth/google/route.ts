import { NextResponse } from 'next/server';
import { appUrl, oauthClient } from '@/lib/server/oauth';
export const runtime = 'nodejs';
export async function GET() {
  try {
    const client = await oauthClient();
    const {data,error} = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: appUrl('/auth/callback').href, skipBrowserRedirect: true },
    });
    if (error || !data.url) throw new Error('OAuth start failed');
    return NextResponse.redirect(data.url, {status:303, headers:{'Cache-Control':'no-store'}});
  } catch {
    return NextResponse.redirect(appUrl('/rules?auth_error=signin_failed'), {status:303, headers:{'Cache-Control':'no-store'}});
  }
}
