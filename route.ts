import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        // هذا إعداد افتراضي لإصلاح الخطأ، يمكنك تعديله لاحقاً لربطه بقاعدة البيانات
        return { id: "1", name: "Admin", email: "admin@university.edu", role: "admin" }
      }
    })
  ],
})

export { handler as GET, handler as POST }