import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { Client } from "pg"
import { authConfig } from "./auth-config"

// Direct database connection - bypassing Prisma
async function getDbConnection() {
  const client = new Client({
    user: 'postgres.wflcaapznpczlxjaeyfd',
    password: 'Philb921056$',
    host: 'aws-0-eu-west-3.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  return client;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
        console.log("Auth attempt for:", credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing credentials");
          return null;
        }

        let client;
        try {
          // Connect directly to database
          client = await getDbConnection();
          console.log("Database connected successfully");
          
          // Find user by email
          const result = await client.query(
            'SELECT id, name, email, password, role FROM users WHERE email = $1',
            [credentials.email as string]
          );

          if (result.rows.length === 0) {
            console.log("User not found:", credentials.email);
            return null;
          }

          const user = result.rows[0];
          
          if (!user.password) {
            console.log("User has no password:", credentials.email);
            return null;
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isPasswordValid) {
            console.log("Invalid password for:", credentials.email);
            return null;
          }

          // Update last login
          await client.query(
            'UPDATE users SET updated_at = $1 WHERE id = $2',
            [new Date(), user.id]
          );

          console.log("Authentication successful for:", user.email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };

        } catch (error) {
          console.error("Database authentication error:", error);
          console.error("Error details:", {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            email: credentials.email
          });
          return null;
        } finally {
          if (client) {
            await client.end();
          }
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
        };
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
      }
      return session;
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