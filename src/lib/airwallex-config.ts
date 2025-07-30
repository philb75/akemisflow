// Airwallex configuration with optional credentials for build
export const airwallexConfig = {
  apiKey: process.env.AIRWALLEX_API_KEY || '',
  apiSecret: process.env.AIRWALLEX_API_SECRET || '',
  baseUrl: process.env.AIRWALLEX_BASE_URL || 'https://api.airwallex.com',
  isConfigured: !!(process.env.AIRWALLEX_API_KEY && process.env.AIRWALLEX_API_SECRET)
};

// Helper to check if Airwallex is properly configured
export function isAirwallexConfigured(): boolean {
  return airwallexConfig.isConfigured;
}