import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Simple in-memory user store for demo
// In production, use a database (PostgreSQL, MongoDB, etc.)
const users = [
  {
    id: "1",
    name: "Venu",
    email: "venu@example.com",
    password: "password123", // In production, hash this with bcrypt
  },
];

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const user = users.find(
          (u) => u.email === credentials.email && u.password === credentials.password
        );
        
        if (!user) return null;
        
        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});