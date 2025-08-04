# AkemisFlow Automated Testing Workflow

## 🎯 **Core Principle**
**Every code change must be validated by automated tests before completion.**

## 🔄 **Standard Workflow**

### 1. **Pre-Change Baseline**
```bash
# Run baseline to ensure starting from working state
npm run test:quick
```

### 2. **Post-Change Validation**
```bash
# Choose appropriate test based on change type:

# API/Backend Changes
npm run test:airwallex    # Airwallex sync functionality
npm run test:crud         # Contractor CRUD operations

# UI/Frontend Changes  
npm run test:ui           # UI interactions and forms
npm run test:navigation   # Page navigation and routing

# Authentication Changes
npm run test:auth         # Login/logout/session management

# Major/Multi-System Changes
npm run test:full         # Complete test suite
```

### 3. **Iteration Protocol**
- ✅ **Tests Pass**: Mark task complete, proceed
- ❌ **Tests Fail**: Analyze → Fix → Re-test → Repeat until pass
- 🔄 **Never leave failing tests** - always iterate to success

## 📋 **Test Selection Guide**

| Change Type | Primary Test | Secondary Test | Full Validation |
|-------------|-------------|----------------|-----------------|
| **Contractor API** | `test:crud` | `test:airwallex` | `test:full` |
| **Airwallex Integration** | `test:airwallex` | `test:crud` | `test:full` |
| **Authentication** | `test:auth` | `test:navigation` | `test:full` |
| **UI Components** | `test:ui` | `test:navigation` | `test:full` |
| **Database Schema** | `test:crud` | `test:airwallex` | `test:full` |
| **Middleware/Routing** | `test:navigation` | `test:auth` | `test:full` |
| **New Features** | `test:full` | - | - |

## 🚨 **Critical Rules**

1. **No Incomplete Tasks**: Don't mark tasks complete with failing tests
2. **Immediate Iteration**: Fix issues as soon as discovered
3. **Document Issues**: Track any new problems found during testing  
4. **Baseline First**: Verify starting state before making changes
5. **Test Early & Often**: Don't wait until the end to test

## 📊 **Success Metrics**

- **100% Pass Rate**: All selected tests must pass
- **No JSON Errors**: API calls return proper JSON responses
- **Complete Workflows**: Full user journeys work end-to-end
- **Error-Free Logs**: No critical errors in server logs during tests

## 🛠️ **Quick Commands Reference**

```bash
# Quick validation (2-3 minutes)
npm run test:quick

# Specific functionality
npm run test:airwallex     # Sync functionality
npm run test:crud          # Data operations  
npm run test:auth          # Authentication
npm run test:ui            # User interface
npm run test:navigation    # Page routing

# Comprehensive validation (5-10 minutes)
npm run test:full

# Check server status
curl -I http://localhost:3000
tail -f server.log
```

## 🎯 **Integration with Development**

### **Claude Code Assistant Workflow**
1. **Receive task/change request**
2. **Run baseline test** to verify starting state
3. **Make necessary changes** to code
4. **Select appropriate test suite** based on change type
5. **Run tests and iterate** until 100% pass rate achieved
6. **Mark task complete** only after test validation
7. **Document any issues** discovered for future reference

### **Example: Airwallex Feature Change**
```bash
# 1. Baseline
npm run test:airwallex

# 2. Make changes to code
# ... code modifications ...

# 3. Validate changes
npm run test:airwallex

# 4. If fails, iterate
# ... fix issues ...
npm run test:airwallex

# 5. Confirm with broader test
npm run test:crud

# 6. Mark complete only when all tests pass
```

---

**Last Updated**: August 4, 2025  
**Status**: Active workflow for all AkemisFlow development