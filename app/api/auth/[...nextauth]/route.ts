import NextAuth from 'next-auth';
import { buildAuthConfig } from '@/lib/auth';

const handler = NextAuth(buildAuthConfig());

export { handler as GET, handler as POST };
