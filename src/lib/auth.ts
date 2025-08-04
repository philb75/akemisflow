import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma as db } from "@/lib/db"
import environmentDetector from "@/lib/environment"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: environmentDetector.canUsePrisma() && db ? PrismaAdapter(db) as any : undefined,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Only use Prisma if available
        if (!environmentDetector.canUsePrisma() || !db) {
          // For Supabase environments, we would need to implement Supabase auth
          // For now, return null to fall back to other auth methods
          return null
        }

        const user = await db.user.findUnique({
          where: {
            email: credentials.email as string
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        // Update last login
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          role: user.role,
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      // Update last login for OAuth users (only if Prisma is available)
      if (account?.provider !== "credentials" && environmentDetector.canUsePrisma() && db) {
        await db.user.update({
          where: { id: user.id! },
          data: { lastLoginAt: new Date() }
        })
      }
    },
  },
})

declare module "next-auth" {
  interface User {
    role: string
  }
  interface Session {
    user: User & {
      id: string
      role: string
    }
  }
  interface JWT {
    role: string
  }
}