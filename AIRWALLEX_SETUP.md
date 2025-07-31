# Airwallex Integration Setup

## Overview
The AkemisFlow application integrates with Airwallex API to sync supplier/beneficiary data. This integration requires proper API credentials to be configured in the environment.

## Required Environment Variables

Add these environment variables to your deployment environment (Vercel, Docker, etc.):

```env
# Airwallex API Credentials (Required for sync functionality)
AIRWALLEX_CLIENT_ID="your-client-id"
AIRWALLEX_API_KEY="your-api-key"
AIRWALLEX_BASE_URL="https://api.airwallex.com"
```

## Setup Instructions

### For Vercel Production

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your AkemisFlow project
3. Navigate to Settings → Environment Variables
4. Add the following variables:
   - `AIRWALLEX_CLIENT_ID`
   - `AIRWALLEX_API_KEY`
   - `AIRWALLEX_BASE_URL` (optional, defaults to https://api.airwallex.com)
5. Select "Production" environment
6. Save and redeploy your application

### For Local Development

Add to your `.env.local` file:
```env
AIRWALLEX_CLIENT_ID="XAqyZmYLTSizOYHgBaPYlA"
AIRWALLEX_API_KEY="ccee18a2d6a11d284d182a5674c893d6f3c6fb3ee25d845af32fdb6bcf6a77cc1693aa8945ae6f14de09881575131845"
AIRWALLEX_BASE_URL="https://api.airwallex.com"
```

### For Docker Development

Add to your `.env.local.docker` file or pass as environment variables in docker-compose.yml.

## Features Enabled

With Airwallex configured, you can:

1. **Sync Suppliers**: Import beneficiary data from Airwallex as suppliers
2. **Sync Clients**: Import payer account data from Airwallex as clients
3. **Track Sync Status**: Monitor which entities are synced with Airwallex
4. **Manage Bank Details**: Automatically populate bank account information

## Testing the Integration

1. Navigate to `/entities/suppliers`
2. Click "Sync with Airwallex" button
3. Check the sync results in the alert dialog
4. Verify suppliers are imported with Airwallex data

## Troubleshooting

### "Airwallex API not configured" Error
- Ensure all required environment variables are set
- Redeploy after adding environment variables in Vercel
- Check the browser console for specific missing variables

### Authentication Failures
- Verify your API credentials are correct
- Check if the API key has the necessary permissions
- Ensure the base URL matches your Airwallex environment

### No Data Imported
- Check if you have beneficiaries in your Airwallex account
- Verify API permissions include beneficiary read access
- Review server logs for specific error messages

## Security Notes

- Never commit API credentials to version control
- Use environment variables for all sensitive data
- Rotate API keys regularly
- Limit API key permissions to only what's needed

## API Rate Limits

Airwallex API has rate limits. The sync functionality handles:
- Pagination for large datasets
- Error handling for rate limit responses
- Graceful degradation when limits are reached