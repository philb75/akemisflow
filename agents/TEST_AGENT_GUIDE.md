# AkemisFlow Test Agent Guide

## 🧪 Overview

The AkemisFlow Test Agent is a specialized Puppeteer-based testing system designed to automatically validate the application after code modifications. It provides comprehensive testing capabilities across multiple functional areas with detailed reporting and screenshot capture.

## 🏗️ Architecture

### Core Components

1. **Test Agent** (`test-agent.js`) - Main orchestrator
2. **Test Modules** (`test-modules/`) - Specialized test implementations
3. **Test Runner** (`test-runner.js`) - Convenient scenario execution
4. **Results System** - JSON reports with screenshots

### Test Modules

- **airwallex-sync** - Tests Airwallex synchronization functionality
- **contractor-crud** - Tests contractor Create/Read/Update/Delete operations
- **auth-flow** - Tests user authentication and session management
- **navigation** - Tests application navigation and routing
- **ui-interactions** - Tests UI component interactions and behaviors

## 🚀 Quick Start

### Prerequisites

```bash
# Ensure application is running on http://localhost:3000
npm run dev

# In a separate terminal, run tests
```

### Basic Usage

```bash
# Run a single test
npm run test:agent run airwallex-sync

# Run test scenarios
npm run test:quick      # Navigation + UI tests
npm run test:auth       # Authentication flow
npm run test:airwallex  # Airwallex sync
npm run test:crud       # Contractor CRUD
npm run test:full       # All tests

# Using test runner directly
node test-runner.js scenario quick
node test-runner.js test airwallex-sync --headless true
```

## 📋 Test Types

### 1. Airwallex Sync Test (`airwallex-sync`)

**Purpose**: Validates Airwallex synchronization functionality

**Test Steps**:
1. Navigate to application
2. Authenticate user
3. Navigate to contractors page
4. Trigger sync operation
5. Verify sync results
6. Check for errors

**Expected Outcomes**:
- Sync button is clickable
- Loading indicators appear during sync
- Contractor data is updated
- No error messages displayed

### 2. Contractor CRUD Test (`contractor-crud`)

**Purpose**: Tests contractor management operations

**Test Steps**:
1. Navigate to contractors page
2. Create new contractor
3. Read/verify contractor data
4. Update contractor information
5. Delete contractor

**Expected Outcomes**:
- Forms are functional
- Data persistence works
- UI updates reflect changes
- Delete confirmation works

### 3. Authentication Flow Test (`auth-flow`)

**Purpose**: Validates user authentication system

**Test Steps**:
1. Access protected pages
2. Test sign-in page elements
3. Attempt authentication
4. Verify authenticated state
5. Test sign-out functionality

**Expected Outcomes**:
- Protected pages redirect to auth
- Authentication methods work
- User session is maintained
- Sign-out clears session

### 4. Navigation Test (`navigation`)

**Purpose**: Tests application routing and navigation

**Test Steps**:
1. Test main navigation menu
2. Test breadcrumbs
3. Test browser back navigation
4. Test direct URL navigation
5. Test responsive navigation

**Expected Outcomes**:
- Navigation links work
- URLs update correctly
- Breadcrumbs are functional
- Mobile navigation works

### 5. UI Interactions Test (`ui-interactions`)

**Purpose**: Tests UI component functionality

**Test Steps**:
1. Test button interactions
2. Test form inputs
3. Test modals and dialogs
4. Test dropdowns and selects
5. Test tables and data displays
6. Test tooltips and alerts

**Expected Outcomes**:
- Buttons respond to clicks
- Forms accept input
- Modals open and close
- Interactive elements work

## 📊 Results and Reporting

### Test Results Structure

```json
{
  "testType": "airwallex-sync",
  "status": "passed|failed",
  "startTime": "2025-08-04T...",
  "endTime": "2025-08-04T...",
  "duration": 15420,
  "screenshots": [
    {
      "name": "contractors-page",
      "filename": "airwallex-contractors-page-2025-08-04T....png",
      "filepath": "./test-screenshots/...",
      "timestamp": "2025-08-04T..."
    }
  ],
  "errors": [
    {
      "message": "Error description",
      "stack": "Stack trace...",
      "timestamp": "2025-08-04T..."
    }
  ],
  "serverLogExcerpts": [
    {
      "content": "Server log content...",
      "timestamp": "2025-08-04T..."
    }
  ],
  "performanceMetrics": {
    "contractorCount": 15,
    "errorCount": 0,
    "loadTime": 2340
  },
  "stepResults": [
    {
      "name": "Navigate to Contractors",
      "success": true,
      "duration": 1234,
      "details": "Successfully loaded contractors page"
    }
  ],
  "summary": "Test completed successfully"
}
```

### Report Locations

- **JSON Reports**: `./test-results/test-report-{type}-{timestamp}.json`
- **Screenshots**: `./test-screenshots/{test-type}-{step}-{timestamp}.png`
- **Server Logs**: Monitored from `./logs/app-2025-08-04.log`

## ⚙️ Configuration

### Test Agent Configuration

```javascript
this.config = {
  appUrl: 'http://localhost:3000',
  screenshotsDir: './test-screenshots',
  logsDir: './logs',
  serverLogFile: './logs/app-2025-08-04.log',
  testTimeout: 30000,
  browserOptions: {
    headless: false,
    slowMo: 100,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  },
  viewport: { width: 1280, height: 720 }
};
```

### Command Line Options

```bash
--headless true       # Run browser in headless mode
--timeout 30000       # Set test timeout in milliseconds
--server-log path     # Path to server log file to monitor
```

## 🔧 Advanced Usage

### Custom Test Options

```bash
# Run with custom timeout
node agents/test-agent.js run airwallex-sync --timeout 60000

# Run headless for CI/CD
node agents/test-agent.js run navigation --headless true

# Monitor specific log file
node agents/test-agent.js run auth-flow --server-log ./custom.log
```

### Creating Custom Test Scenarios

```javascript
// In test-runner.js
this.scenarios['custom'] = {
  name: 'Custom Test',
  description: 'Custom test scenario',
  tests: ['auth-flow', 'contractor-crud']
};
```

### Integration with CI/CD

```yaml
# .github/workflows/test.yml
- name: Run AkemisFlow Tests
  run: |
    npm run dev &
    sleep 10
    npm run test:full -- --headless true
```

## 🐛 Troubleshooting

### Common Issues

**Browser Launch Failures**
```bash
# Fix for Linux/Docker environments
node agents/test-agent.js run navigation --headless true
```

**Port Conflicts**
```bash
# Check if app is running
curl http://localhost:3000
lsof -i :3000
```

**Permission Issues**
```bash
# Fix screenshot directory permissions
chmod 755 test-screenshots
```

**Module Not Found**
```bash
# Ensure Puppeteer is installed
npm install puppeteer
```

### Debug Mode

```bash
# Run with verbose output
DEBUG=1 node agents/test-agent.js run airwallex-sync

# Keep browser open after test
node agents/test-agent.js run navigation --headless false
```

## 📈 Performance Monitoring

### Metrics Collected

- **Page Load Times**: Initial navigation and subsequent page loads
- **Interaction Response Times**: Button clicks, form submissions
- **Sync Operation Duration**: Airwallex sync timing
- **Error Rates**: Browser console errors, network failures
- **Resource Usage**: Memory and CPU during tests

### Performance Thresholds

- Page load: < 5 seconds
- Button response: < 2 seconds
- Sync operation: < 30 seconds
- Error rate: < 5%

## 🔒 Security Considerations

- **Test Data**: Uses non-production test credentials
- **Sensitive Operations**: Avoids destructive actions in production
- **Log Privacy**: Excludes sensitive data from test logs
- **Browser Security**: Runs with appropriate sandbox settings

## 🚦 Best Practices

### Before Running Tests

1. **Ensure app is running**: `http://localhost:3000` should be accessible
2. **Check database state**: Ensure test data is available
3. **Review recent changes**: Know what functionality to focus on
4. **Clear previous results**: Remove old screenshots and reports if needed

### After Tests

1. **Review reports**: Check JSON reports for detailed results
2. **Examine screenshots**: Visual verification of test states
3. **Check server logs**: Look for backend errors during tests
4. **Analyze performance**: Review timing metrics

### Writing New Tests

1. **Follow module pattern**: Use existing test modules as templates
2. **Implement error handling**: Graceful failure and recovery
3. **Add meaningful screenshots**: Capture key application states
4. **Include performance metrics**: Track relevant timing data
5. **Document test steps**: Clear description of what's being tested

## 📞 Support

### Log Files
- `./logs/app-2025-08-04.log` - Application server logs
- `./test-results/` - Test reports and results
- `./test-screenshots/` - Visual test evidence

### Common Commands

```bash
# Quick health check
npm run test:quick

# Full regression test
npm run test:full

# Test specific functionality after changes
npm run test:airwallex
npm run test:crud

# Get help
node test-runner.js help
node agents/test-agent.js help
```

---

**Last Updated**: August 4, 2025  
**Agent Version**: 1.0.0  
**Compatible with**: AkemisFlow Production Environment