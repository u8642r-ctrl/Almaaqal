import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import pool, { initDatabase } from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // تهيئة قاعدة البيانات تلقائياً عند أول محاولة تسجيل دخول
        await initDatabase();

        try {
          const result = await pool.query(
            "SELECT id, email, name, role, password FROM users WHERE email = $1",
            [credentials.email]
          );

          const user = result.rows[0];
          if (!user) return null;

          // مقارنة كلمة المرور (في بيئة الإنتاج استخدم bcrypt)
          if (user.password !== credentials.password) return null;

          return {
            id: String(user.id),
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
