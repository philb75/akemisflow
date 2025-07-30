# Enable Direct Database Access in Supabase

## 🔐 Current Issue
Supabase pooler connection uses SCRAM authentication that blocks direct connections. Need to enable direct database access.

## 🚀 Solution Steps

### **Step 1: Enable Direct Database Access**
1. Go to: https://supabase.com/dashboard/project/wflcaapznpczlxjaeyfd
2. Navigate to **Settings** → **Database**
3. Scroll to **Connection Parameters** section
4. Look for **"Enable direct connections"** or **"Database URL"** section
5. **Copy the direct connection string** (not the pooler URL)

### **Step 2: Alternative Connection Methods**

#### **Option A: Direct Connection (Recommended)**
If available, use the direct connection string format:
```
postgresql://postgres:[PASSWORD]@db.wflcaapznpczlxjaeyfd.supabase.co:5432/postgres
```
- **Host**: `db.wflcaapznpczlxjaeyfd.supabase.co`
- **Port**: `5432` (direct, not pooler 6543)
- **Database**: `postgres`

#### **Option B: API Access Setup**
1. Go to **Settings** → **API**
2. Enable **"Database API access"**
3. Add your IP to allowed origins
4. Use service role key for admin access

#### **Option C: Service Role Connection**
Use the service role key instead of database password:
- **Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmbGNhYXB6bnBjemx4amFleWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYxODk1NSwiZXhwIjoyMDY0MTk0OTU1fQ.Vv6milIIq0Ne9XdEG2yfwmAfn73t2AOuJ27CIamLRYo`

### **Step 3: IP Allowlist (If Required)**
Some Supabase projects require IP allowlisting:
1. Go to **Settings** → **Database** → **Network Restrictions**  
2. Add your current IP address
3. Or disable restrictions for development

## 🔍 Check Current Settings

Go to Supabase dashboard and look for:
- [ ] Direct database connections enabled
- [ ] IP restrictions (if any)
- [ ] Database API access
- [ ] Connection string format

## 🧪 Test Connection

Once configured, I can test with:
```bash
# Direct connection test
psql "postgresql://postgres:JqQKoxNn1HMm4cThe@db.wflcaapznpczlxjaeyfd.supabase.co:5432/postgres"
```

Or programmatically test the connection settings.

## 📋 Next Steps

1. **Check Supabase settings** for direct connection options
2. **Copy the direct connection string** (not pooler)
3. **Let me know the direct host/port** and I'll connect
4. **If no direct access**, we'll use the manual SQL Editor approach

---

**Goal**: Enable direct SQL execution so I can run the schema and data import scripts automatically instead of manual steps.