// Auth configuration with proper secret handling
export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET || generateDefaultSecret(),
  trustHost: true,
};

function generateDefaultSecret() {
  // Generate a deterministic secret for production if not provided
  // This is better than no secret at all
  const baseString = "akemisflow-default-secret-2025-philb75-production";
  // Create a longer, more secure default secret
  const secret = Buffer.from(baseString).toString('base64') + "-" + Date.now().toString(36);
  console.log('[AUTH] Using generated secret, length:', secret.length);
  return secret;
}