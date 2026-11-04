import './only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env, publicKey } from './db';

// OAuth cookies are short-lived transport for PKCE. The callback transfers the
// resulting session into the existing server-only Alibai session cookies.
export async function oauthClient() {
  const jar = await cookies();
  return createServerClient(env('NEXT_PUBLIC_SUPABASE_URL'), publicKey(), {
    cookieOptions: { name: 'alibai-oauth', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: entries => entries.forEach(({name,value,options}) => jar.set(name,value,options)),
    },
  });
}
export async function clearOAuthCookies() {
  const jar = await cookies();
  for (const cookie of jar.getAll()) if (cookie.name.startsWith('alibai-oauth')) jar.delete(cookie.name);
}
export function appUrl(path: string) { return new URL(path, env('APP_ORIGIN')); }
