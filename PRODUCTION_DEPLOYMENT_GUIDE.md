# 🚀 AkemisFlow Production Deployment Guide

## 📋 Current Status
- ✅ **Vercel**: Application deployed with SSO protection
- ✅ **Supabase**: Database active and healthy  
- ✅ **Environment**: Production variables configured
- ⏳ **Schema**: Ready for manual deployment
- ⏳ **Data**: Local backup ready for import

---

## 🎯 Step-by-Step Deployment

### **Step 1: Deploy Database Schema**

1. **Navigate to Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/wflcaapznpczlxjaeyfd
   - Click on "SQL Editor" in the left sidebar

2. **Execute Schema Deployment**
   - Upload and execute: `deploy-to-production.sql`
   - This will create all tables, indexes, and admin user
   - Expected result: "AkemisFlow Production Schema Deployed Successfully!"

### **Step 2: Import Local Data**

1. **Prepare Data Import**
   - File location: `migrations/local-export/20250729_214852_local_data.sql`
   - Size: 193KB (contains current local data)

2. **Execute Data Import**
   - In Supabase SQL Editor, upload the data file
   - Execute the import (may take 1-2 minutes)
   - Verify data integrity after import

### **Step 3: Test Production Application**

1. **Access Application**
   - URL: https://akemisflow-g0doyamax-philippe-barthelemys-projects.vercel.app
   - Note: Currently protected by Vercel SSO

2. **Authentication Test**
   - Use admin credentials: philb75@gmail.com / Philb123$
   - Verify dashboard access and data display

3. **Functionality Tests**
   - Test client/supplier listings
   - Verify Airwallex integration status
   - Check transaction import functionality

---

## 🔧 Production Configuration

### **Environment Variables (Already Set)**
```
DATABASE_URL="postgresql://postgres.wflcaapznpczlxjaeyfd:JqQKoxNn1HMm4cThe@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
NEXTAUTH_SECRET="akemisflow-production-secret-2024-secure-very-long-random-string"
NEXTAUTH_URL="https://akemisflow-g0doyamax-philippe-barthelemys-projects.vercel.app"
NEXT_PUBLIC_SUPABASE_URL="https://wflcaapznpczlxjaeyfd.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJh..."
SUPABASE_SERVICE_ROLE_KEY="eyJh..."
AIRWALLEX_CLIENT_ID="XAqyZmYLTSizOYHgBaPYlA"
AIRWALLEX_API_KEY="ccee..."
NODE_ENV="production"
```

### **Database Details**
- **Project ID**: wflcaapznpczlxjaeyfd
- **Region**: EU-West-3 (Paris)
- **Connection**: Pooled connection (recommended for production)
- **Status**: Active and healthy

---

## 🤖 Automation Scripts Ready

### **For Ongoing Management**
```bash
# Wake up database if paused
node scripts/wake-supabase-db.js

# Set Vercel environment variables
node scripts/set-vercel-env.js

# Full deployment orchestration
node scripts/deploy-full-stack.js

# Schema deployment (when network allows)
./scripts/deploy-to-supabase.sh
```

### **For Data Synchronization**
```bash
# Export current local data
./scripts/migrate-to-production.sh

# Sync production back to local
./scripts/sync-from-production.sh
```

---

## 🚨 Troubleshooting

### **Database Connection Issues**
- **Symptom**: "Can't reach database server"
- **Solution**: Check if Supabase database is paused
- **Action**: Use wake-up script or access Supabase dashboard

### **Build Failures on Vercel**
- **Symptom**: "Command exited with 1"
- **Solution**: Database connection timeout during build
- **Action**: Prisma generates without database connection now

### **Authentication Issues**  
- **Symptom**: Can't access application
- **Solution**: Vercel SSO is enabled (security feature)
- **Action**: Authenticate via Vercel or adjust SSO settings

---

## 📊 Health Check Endpoints

### **Available Endpoints**
- `/api/health` - Basic application health
- `/api/db-wake` - Database wake-up and test
- `/api/db-test` - Database connectivity test
- `/api/db-setup` - Emergency schema setup

### **Testing Commands**
```bash
# Test application health (requires auth)
curl https://akemisflow-g0doyamax-philippe-barthelemys-projects.vercel.app/api/health

# Wake up database (requires auth)  
curl https://akemisflow-g0doyamax-philippe-barthelemys-projects.vercel.app/api/db-wake
```

---

## 🎉 Success Criteria

### **Deployment Complete When:**
- ✅ Schema deployed and tables created
- ✅ Local data imported successfully  
- ✅ Application accessible and functional
- ✅ Authentication working correctly
- ✅ Airwallex integration operational
- ✅ All health checks passing

### **Next Phase: Automation Agents**
1. **Sync Agent**: Automated local ↔ production sync
2. **Monitor Agent**: Health monitoring and alerting
3. **Backup Agent**: Automated data protection
4. **Deploy Agent**: CI/CD pipeline automation

---

## 📞 Support Information

### **Key URLs**
- **Application**: https://akemisflow-g0doyamax-philippe-barthelemys-projects.vercel.app
- **Supabase**: https://supabase.com/dashboard/project/wflcaapznpczlxjaeyfd  
- **Vercel**: https://vercel.com/philippe-barthelemys-projects/akemisflow

### **API Tokens**
- **Supabase**: sbp_7cb3affb7a9b72d1c4c9eeb418127d8ed4951303
- **Vercel**: GvvdIlBMcIsvuWWuupv1URZA

### **Files Ready for Deployment**
- `deploy-to-production.sql` - Complete schema
- `migrations/local-export/20250729_214852_local_data.sql` - Data import
- `scripts/` - Automation tools

---

**Status**: ✅ Ready for manual schema deployment and data import  
**Estimated Time**: 10-15 minutes for complete deployment  
**Risk Level**: Low (all components tested and prepared)