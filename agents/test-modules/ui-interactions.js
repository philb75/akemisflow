/**
 * UI Interactions Test Module
 * Tests various UI component interactions and behaviors
 */

class UIInteractionsTest {
  constructor(page, config, options = {}) {
    this.page = page;
    this.config = config;
    this.options = options;
    this.results = {
      steps: [],
      metrics: {},
      summary: null
    };
  }

  async execute() {
    console.log('🎛️ Starting UI Interactions test...');
    
    try {
      await this.step1_TestButtons();
      await this.step2_TestForms();
      await this.step3_TestModals();
      await this.step4_TestDropdowns();
      await this.step5_TestTables();
      await this.step6_TestTooltipsAlerts();
      
      this.results.summary = 'UI interactions test completed successfully';
      
    } catch (error) {
      this.results.summary = `UI interactions test failed: ${error.message}`;
      throw error;
    }
    
    return this.results;
  }

  async step1_TestButtons() {
    const stepStart = Date.now();
    console.log('🔘 Step 1: Testing buttons...');
    
    try {
      // Navigate to a page with buttons
      await this.page.goto(`${this.config.appUrl}/dashboard`, { 
        waitUntil: 'domcontentloaded' 
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.captureScreenshot('01-buttons-page');
      
      // Find all buttons
      const buttons = await this.page.evaluate(() => {
        const buttonElements = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
        return Array.from(buttonElements).map((btn, index) => ({
          index,
          text: btn.textContent.trim() || btn.value || `Button ${index}`,
          type: btn.type || 'button',
          disabled: btn.disabled,
          visible: btn.offsetParent !== null,
          className: btn.className
        })).filter(btn => btn.visible);
      });
      
      console.log(`🔍 Found ${buttons.length} visible buttons:`, buttons.map(b => b.text));
      
      // Test clicking some buttons (excluding potentially dangerous ones)
      const safeButtons = buttons.filter(btn => 
        !btn.text.toLowerCase().includes('delete') &&
        !btn.text.toLowerCase().includes('remove') &&
        !btn.disabled &&
        btn.type !== 'submit'
      );
      
      let clickableButtons = 0;
      let buttonResponses = 0;
      
      for (const button of safeButtons.slice(0, 3)) {
        try {
          console.log(`🎯 Testing button: ${button.text}`);
          
          const beforeClickUrl = this.page.url();
          
          // Click the button
          await this.page.click(`button:nth-of-type(${button.index + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const afterClickUrl = this.page.url();
          
          // Check for any response (URL change, modal, loading state, etc.)
          const hasResponse = await this.page.evaluate(() => {
            // Check for modals, overlays, loading states
            const modal = document.querySelector('.modal, .dialog, .overlay, [role="dialog"]');
            const loading = document.querySelector('.loading, .spinner, [data-loading="true"]');
            return modal !== null || loading !== null;
          });
          
          clickableButtons++;
          
          if (beforeClickUrl !== afterClickUrl || hasResponse) {
            buttonResponses++;
            console.log(`✅ ${button.text}: Button responded`);
          } else {
            console.log(`⚠️  ${button.text}: No visible response`);
          }
          
          // Close any modal that might have opened
          const closeButton = await this.page.$('.modal button:has-text("Close"), .dialog button:has-text("Close"), [aria-label="Close"]');
          if (closeButton) {
            await closeButton.click();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
        } catch (error) {
          console.log(`❌ Error testing button ${button.text}:`, error.message);
        }
      }
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Buttons',
        success: true,
        duration: stepEnd - stepStart,
        details: `Found ${buttons.length} buttons, tested ${clickableButtons}, ${buttonResponses} responded`
      });
      
      this.results.metrics.buttons = {
        total: buttons.length,
        tested: clickableButtons,
        responsive: buttonResponses
      };
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Buttons',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      throw error;
    }
  }

  async step2_TestForms() {
    const stepStart = Date.now();
    console.log('📝 Step 2: Testing forms...');
    
    try {
      // Look for forms on current page or navigate to a form page
      let forms = await this.page.$$('form');
      
      if (forms.length === 0) {
        // Try navigating to a page that likely has forms
        const formPages = ['/entities/contractors', '/admin', '/auth/signin'];
        
        for (const formPage of formPages) {
          try {
            await this.page.goto(`${this.config.appUrl}${formPage}`, { 
              waitUntil: 'domcontentloaded',
              timeout: 10000 
            });
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            forms = await this.page.$$('form');
            
            if (forms.length > 0) {
              console.log(`✅ Found forms on ${formPage}`);
              break;
            }
          } catch (error) {
            continue;
          }
        }
      }
      
      await this.captureScreenshot('02-forms-page');
      
      if (forms.length > 0) {
        console.log(`🔍 Found ${forms.length} forms`);
        
        // Analyze form elements
        const formData = await this.page.evaluate(() => {
          const forms = document.querySelectorAll('form');
          return Array.from(forms).map((form, index) => {
            const inputs = form.querySelectorAll('input, textarea, select');
            const buttons = form.querySelectorAll('button, input[type="submit"]');
            
            return {
              index,
              inputCount: inputs.length,
              buttonCount: buttons.length,
              inputs: Array.from(inputs).map(input => ({
                type: input.type || input.tagName.toLowerCase(),
                name: input.name,
                placeholder: input.placeholder,
                required: input.required
              }))
            };
          });
        });
        
        console.log('📋 Form analysis:', formData);
        
        // Test filling out a simple form (if it's safe)
        for (const form of formData.slice(0, 1)) {
          if (form.inputs.length > 0 && form.inputs.length < 10) { // Reasonable form size
            try {
              console.log(`🎯 Testing form ${form.index}`);
              
              // Fill some safe inputs
              for (const input of form.inputs.slice(0, 3)) {
                if (input.type === 'text' || input.type === 'email') {
                  const selector = input.name ? `input[name="${input.name}"]` : `form:nth-of-type(${form.index + 1}) input[type="${input.type}"]`;
                  
                  try {
                    await this.page.type(selector, 'test-value');
                    await new Promise(resolve => setTimeout(resolve, 200));
                    console.log(`✅ Filled ${input.type} input`);
                  } catch (err) {
                    console.log(`⚠️  Could not fill ${input.type} input:`, err.message);
                  }
                }
              }
              
              await this.captureScreenshot('03-form-filled');
              
            } catch (error) {
              console.log(`❌ Error testing form:`, error.message);
            }
          }
        }
        
        this.results.metrics.forms = {
          total: forms.length,
          formData: formData
        };
        
      } else {
        console.log('⚠️  No forms found');
        this.results.metrics.forms = { total: 0, formData: [] };
      }
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Forms',
        success: true,
        duration: stepEnd - stepStart,
        details: `Found ${forms.length} forms`
      });
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Forms',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      // Don't throw - continue with other tests
    }
  }

  async step3_TestModals() {
    const stepStart = Date.now();
    console.log('🪟 Step 3: Testing modals and dialogs...');
    
    try {
      // Look for buttons that might trigger modals
      const modalTriggers = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button, a');
        return Array.from(buttons).filter(btn => {
          const text = btn.textContent.toLowerCase();
          return text.includes('add') || text.includes('create') || text.includes('edit') || 
                 text.includes('view') || text.includes('details') || text.includes('settings');
        }).map((btn, index) => ({
          index,
          text: btn.textContent.trim(),
          tagName: btn.tagName
        }));
      });
      
      console.log(`🔍 Found ${modalTriggers.length} potential modal triggers`);
      
      let modalsOpened = 0;
      
      for (const trigger of modalTriggers.slice(0, 2)) {
        try {
          console.log(`🎯 Testing modal trigger: ${trigger.text}`);
          
          // Click the trigger
          if (trigger.tagName === 'BUTTON') {
            await this.page.click(`button:has-text("${trigger.text}")`);
          } else {
            await this.page.click(`a:has-text("${trigger.text}")`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if a modal opened
          const modalOpened = await this.page.evaluate(() => {
            const modals = document.querySelectorAll('.modal, .dialog, .overlay, [role="dialog"], .popup');
            return Array.from(modals).some(modal => 
              modal.offsetParent !== null || window.getComputedStyle(modal).display !== 'none'
            );
          });
          
          if (modalOpened) {
            modalsOpened++;
            console.log(`✅ Modal opened for: ${trigger.text}`);
            await this.captureScreenshot(`04-modal-${modalsOpened}`);
            
            // Try to close the modal
            const closeButton = await this.page.$('.modal button:has-text("Close"), .dialog button:has-text("Close"), [aria-label="Close"], .modal .close');
            if (closeButton) {
              await closeButton.click();
              await new Promise(resolve => setTimeout(resolve, 500));
              console.log('✅ Modal closed');
            } else {
              // Try pressing Escape
              await this.page.keyboard.press('Escape');
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } else {
            console.log(`⚠️  No modal opened for: ${trigger.text}`);
          }
          
        } catch (error) {
          console.log(`❌ Error testing modal trigger ${trigger.text}:`, error.message);
        }
      }
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Modals',
        success: true,
        duration: stepEnd - stepStart,
        details: `Tested ${modalTriggers.length} triggers, ${modalsOpened} modals opened`
      });
      
      this.results.metrics.modals = {
        triggers: modalTriggers.length,
        opened: modalsOpened
      };
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Modals',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      // Don't throw - continue with other tests
    }
  }

  async step4_TestDropdowns() {
    const stepStart = Date.now();
    console.log('📋 Step 4: Testing dropdowns and selects...');
    
    try {
      // Find dropdown elements
      const dropdowns = await this.page.evaluate(() => {
        const selects = document.querySelectorAll('select');
        const customDropdowns = document.querySelectorAll('.dropdown, .select, [role="combobox"]');
        
        return {
          nativeSelects: Array.from(selects).map((select, index) => ({
            index,
            name: select.name,
            optionCount: select.options.length,
            disabled: select.disabled
          })),
          customDropdowns: Array.from(customDropdowns).map((dropdown, index) => ({
            index,
            className: dropdown.className,
            visible: dropdown.offsetParent !== null
          }))
        };
      });
      
      console.log(`🔍 Found ${dropdowns.nativeSelects.length} native selects and ${dropdowns.customDropdowns.length} custom dropdowns`);
      
      let dropdownsTested = 0;
      
      // Test native selects
      for (const select of dropdowns.nativeSelects.slice(0, 2)) {
        if (!select.disabled && select.optionCount > 1) {
          try {
            console.log(`🎯 Testing select dropdown ${select.index}`);
            
            await this.page.select(`select:nth-of-type(${select.index + 1})`, '1');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            dropdownsTested++;
            console.log(`✅ Selected option in dropdown ${select.index}`);
            
          } catch (error) {
            console.log(`❌ Error testing select ${select.index}:`, error.message);
          }
        }
      }
      
      // Test custom dropdowns
      for (const dropdown of dropdowns.customDropdowns.slice(0, 2)) {
        if (dropdown.visible) {
          try {
            console.log(`🎯 Testing custom dropdown ${dropdown.index}`);
            
            await this.page.click(`.dropdown:nth-of-type(${dropdown.index + 1}), .select:nth-of-type(${dropdown.index + 1})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Look for dropdown options
            const optionOpened = await this.page.evaluate(() => {
              const options = document.querySelectorAll('.dropdown-menu, .select-options, .options, [role="listbox"]');
              return Array.from(options).some(option => 
                option.offsetParent !== null || window.getComputedStyle(option).display !== 'none'
              );
            });
            
            if (optionOpened) {
              dropdownsTested++;
              console.log(`✅ Custom dropdown ${dropdown.index} opened`);
              await this.captureScreenshot(`05-dropdown-${dropdown.index}`);
              
              // Click somewhere else to close
              await this.page.click('body');
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
          } catch (error) {
            console.log(`❌ Error testing custom dropdown ${dropdown.index}:`, error.message);
          }
        }
      }
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Dropdowns',
        success: true,
        duration: stepEnd - stepStart,
        details: `Found ${dropdowns.nativeSelects.length + dropdowns.customDropdowns.length} dropdowns, tested ${dropdownsTested}`
      });
      
      this.results.metrics.dropdowns = {
        native: dropdowns.nativeSelects.length,
        custom: dropdowns.customDropdowns.length,
        tested: dropdownsTested
      };
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Dropdowns',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      // Don't throw - continue with other tests
    }
  }

  async step5_TestTables() {
    const stepStart = Date.now();
    console.log('📊 Step 5: Testing tables and data displays...');
    
    try {
      // Navigate to a page likely to have tables
      await this.page.goto(`${this.config.appUrl}/entities/contractors`, { 
        waitUntil: 'domcontentloaded' 
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Find tables
      const tables = await this.page.evaluate(() => {
        const tableElements = document.querySelectorAll('table');
        return Array.from(tableElements).map((table, index) => {
          const rows = table.querySelectorAll('tr');
          const headers = table.querySelectorAll('th');
          const cells = table.querySelectorAll('td');
          
          return {
            index,
            rowCount: rows.length,
            headerCount: headers.length,
            cellCount: cells.length,
            visible: table.offsetParent !== null
          };
        }).filter(table => table.visible);
      });
      
      console.log(`🔍 Found ${tables.length} visible tables`);
      
      if (tables.length > 0) {
        await this.captureScreenshot('06-tables');
        
        // Test table interactions
        for (const table of tables.slice(0, 1)) {
          if (table.rowCount > 1) {
            try {
              console.log(`🎯 Testing table ${table.index} with ${table.rowCount} rows`);
              
              // Try clicking on a table row (excluding header)
              const tableRows = await this.page.$$(`table:nth-of-type(${table.index + 1}) tbody tr, table:nth-of-type(${table.index + 1}) tr:not(:first-child)`);
              
              if (tableRows.length > 0) {
                await tableRows[0].click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                console.log(`✅ Clicked on table row`);
                await this.captureScreenshot('07-table-row-clicked');
              }
              
              // Look for sorting controls
              const sortableHeaders = await this.page.$$(`table:nth-of-type(${table.index + 1}) th[data-sortable], table:nth-of-type(${table.index + 1}) th button`);
              
              if (sortableHeaders.length > 0) {
                await sortableHeaders[0].click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                console.log(`✅ Tested table sorting`);
              }
              
            } catch (error) {
              console.log(`❌ Error testing table ${table.index}:`, error.message);
            }
          }
        }
        
        this.results.metrics.tables = {
          total: tables.length,
          totalRows: tables.reduce((sum, t) => sum + t.rowCount, 0),
          totalCells: tables.reduce((sum, t) => sum + t.cellCount, 0)
        };
        
      } else {
        console.log('⚠️  No tables found');
        this.results.metrics.tables = { total: 0, totalRows: 0, totalCells: 0 };
      }
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Tables',
        success: true,
        duration: stepEnd - stepStart,
        details: `Found ${tables.length} tables`
      });
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Tables',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      // Don't throw - continue with other tests
    }
  }

  async step6_TestTooltipsAlerts() {
    const stepStart = Date.now();
    console.log('💬 Step 6: Testing tooltips and alerts...');
    
    try {
      // Look for elements that might have tooltips
      const tooltipTriggers = await this.page.evaluate(() => {
        const elements = document.querySelectorAll('[title], [data-tooltip], [aria-describedby]');
        return Array.from(elements).slice(0, 5).map((el, index) => ({
          index,
          title: el.title,
          tooltip: el.getAttribute('data-tooltip'),
          tagName: el.tagName,
          visible: el.offsetParent !== null
        })).filter(el => el.visible);
      });
      
      console.log(`🔍 Found ${tooltipTriggers.length} potential tooltip triggers`);
      
      let tooltipsTriggered = 0;
      
      for (const trigger of tooltipTriggers) {
        try {
          // Hover over element to trigger tooltip
          await this.page.hover(`[title="${trigger.title}"]:nth-of-type(${trigger.index + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          tooltipsTriggered++;
          console.log(`✅ Hovered over tooltip trigger ${trigger.index}`);
          
        } catch (error) {
          console.log(`❌ Error testing tooltip ${trigger.index}:`, error.message);
        }
      }
      
      // Look for existing alerts/notifications
      const alerts = await this.page.evaluate(() => {
        const alertElements = document.querySelectorAll('.alert, .notification, .toast, [role="alert"], .message');
        return Array.from(alertElements).map((alert, index) => ({
          index,
          text: alert.textContent.trim(),
          className: alert.className,
          visible: alert.offsetParent !== null
        })).filter(alert => alert.visible);
      });
      
      console.log(`🔍 Found ${alerts.length} visible alerts/notifications`);
      
      if (alerts.length > 0) {
        await this.captureScreenshot('08-alerts');
      }
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Tooltips and Alerts',
        success: true,
        duration: stepEnd - stepStart,
        details: `Found ${tooltipTriggers.length} tooltips, ${alerts.length} alerts`
      });
      
      this.results.metrics.tooltipsAlerts = {
        tooltips: tooltipTriggers.length,
        alerts: alerts.length
      };
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Tooltips and Alerts',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      // Don't throw - this is the last step
    }
  }

  async captureScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ui-interactions-${name}-${timestamp}.png`;
    const filepath = `${this.config.screenshotsDir}/${filename}`;
    
    await this.page.screenshot({ 
      path: filepath,
      fullPage: true 
    });
    
    console.log(`📷 Screenshot saved: ${filename}`);
    return filepath;
  }
}

module.exports = UIInteractionsTest;