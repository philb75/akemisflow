// Airwallex configuration with optional credentials for build
export const airwallexConfig = {
  clientId: process.env.AIRWALLEX_CLIENT_ID || '',
  apiKey: process.env.AIRWALLEX_API_KEY || '',
  baseUrl: process.env.AIRWALLEX_BASE_URL || 'https://api.airwallex.com',
  isConfigured: !!(process.env.AIRWALLEX_CLIENT_ID && process.env.AIRWALLEX_API_KEY)
};

// Helper to check if Airwallex is properly configured
export function isAirwallexConfigured(): boolean {
  return airwallexConfig.isConfigured;
}