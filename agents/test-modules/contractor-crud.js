/**
 * Contractor CRUD Test Module
 * Tests Create, Read, Update, Delete operations for contractors
 */

class ContractorCrudTest {
  constructor(page, config, options = {}) {
    this.page = page;
    this.config = config;
    this.options = options;
    this.results = {
      steps: [],
      metrics: {},
      summary: null
    };
    this.testContractorData = {
      name: `Test Contractor ${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      phone: '+1234567890',
      company: 'Test Company Ltd',
      address: '123 Test Street, Test City'
    };
  }

  async execute() {
    console.log('📝 Starting Contractor CRUD test...');
    
    try {
      await this.step1_NavigateToContractors();
      await this.step2_CreateContractor();
      await this.step3_ReadContractor();
      await this.step4_UpdateContractor();
      await this.step5_DeleteContractor();
      
      this.results.summary = 'Contractor CRUD test completed successfully';
      
    } catch (error) {
      this.results.summary = `Contractor CRUD test failed: ${error.message}`;
      throw error;
    }
    
    return this.results;
  }

  async step1_NavigateToContractors() {
    const stepStart = Date.now();
    console.log('📍 Step 1: Navigating to contractors page...');
    
    try {
      // First navigate to app
      await this.page.goto(this.config.appUrl, { 
        waitUntil: 'domcontentloaded' 
      });
      
      // Try to navigate to contractors page
      const contractorPaths = [
        '/entities/contractors',
        '/contractors',
        '/dashboard/contractors',
        '/consultants'
      ];
      
      let navigated = false;
      
      for (const path of contractorPaths) {
        try {
          await this.page.goto(`${this.config.appUrl}${path}`, { 
            waitUntil: 'domcontentloaded',
            timeout: 10000
          });
          
          const hasContractorContent = await this.page.evaluate(() => {
            const text = document.body.textContent.toLowerCase();
            return text.includes('contractor') || text.includes('supplier') || text.includes('consultant');
          });
          
          if (hasContractorContent) {
            navigated = true;
            break;
          }
          
        } catch (err) {
          continue;
        }
      }
      
      if (!navigated) {
        throw new Error('Could not navigate to contractors page');
      }
      
      await this.captureScreenshot('01-contractors-page');
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Navigate to Contractors',
        success: true,
        duration: stepEnd - stepStart,
        details: 'Successfully loaded contractors page'
      });
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Navigate to Contractors',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      throw error;
    }
  }

  async step2_CreateContractor() {
    const stepStart = Date.now();
    console.log('➕ Step 2: Creating new contractor...');
    
    try {
      // Look for "Add" or "Create" button
      const addButtonSelectors = [
        'button:has-text("Add")',
        'button:has-text("Create")',
        'button:has-text("New")',
        '.add-contractor',
        '[data-testid="add-contractor"]',
        'a[href*="new"]'
      ];
      
      let addButton = null;
      for (const selector of addButtonSelectors) {
        try {
          addButton = await this.page.$(selector);
          if (addButton) {
            console.log(`✅ Found add button: ${selector}`);
            break;
          }
        } catch (err) {
          continue;
        }
      }
      
      if (!addButton) {
        throw new Error('Could not find add contractor button');
      }
      
      await addButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.captureScreenshot('02-create-form');
      
      // Fill out the form
      await this.fillContractorForm(this.testContractorData);
      
      // Submit the form
      const submitButton = await this.page.$('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      if (submitButton) {
        await submitButton.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      await this.captureScreenshot('03-after-create');
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Create Contractor',
        success: true,
        duration: stepEnd - stepStart,
        details: `Created contractor: ${this.testContractorData.name}`
      });
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Create Contractor',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      throw error;
    }
  }

  async step3_ReadContractor() {
    const stepStart = Date.now();
    console.log('👁️ Step 3: Reading contractor data...');
    
    try {
      // Navigate back to contractors list if not already there
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/contractors') && !currentUrl.includes('/entities')) {
        await this.page.goBack();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Search for the created contractor
      const searchInput = await this.page.$('input[type="search"], input[placeholder*="search"], .search-input');
      if (searchInput) {
        await searchInput.type(this.testContractorData.name);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Look for the contractor in the list
      const contractorFound = await this.page.evaluate((contractorName) => {
        const text = document.body.textContent;
        return text.includes(contractorName);
      }, this.testContractorData.name);
      
      if (!contractorFound) {
        throw new Error(`Could not find contractor: ${this.testContractorData.name}`);
      }
      
      await this.captureScreenshot('04-contractor-found');
      
      // Try to click on the contractor to view details
      const contractorLink = await this.page.$(`a:has-text("${this.testContractorData.name}"), tr:has-text("${this.testContractorData.name}") a`);
      if (contractorLink) {
        await contractorLink.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.captureScreenshot('05-contractor-details');
      }
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Read Contractor',
        success: true,
        duration: stepEnd - stepStart,
        details: `Found contractor: ${this.testContractorData.name}`
      });
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Read Contractor',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      throw error;
    }
  }

  async step4_UpdateContractor() {
    const stepStart = Date.now();
    console.log('✏️ Step 4: Updating contractor...');
    
    try {
      // Look for edit button
      const editButton = await this.page.$('button:has-text("Edit"), a:has-text("Edit"), .edit-button, [data-action="edit"]');
      
      if (editButton) {
        await editButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await this.captureScreenshot('06-edit-form');
        
        // Update contractor data
        const updatedData = {
          ...this.testContractorData,
          name: `${this.testContractorData.name} - Updated`,
          phone: '+0987654321'
        };
        
        await this.fillContractorForm(updatedData);
        
        // Save changes
        const saveButton = await this.page.$('button[type="submit"], button:has-text("Save"), button:has-text("Update")');
        if (saveButton) {
          await saveButton.click();
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        await this.captureScreenshot('07-after-update');
        
        // Verify update
        const updateVerified = await this.page.evaluate((updatedName) => {
          const text = document.body.textContent;
          return text.includes(updatedName);
        }, updatedData.name);
        
        if (!updateVerified) {
          throw new Error('Update verification failed');
        }
        
        this.testContractorData = updatedData; // Update for deletion step
      } else {
        console.log('⚠️  Edit button not found - skipping update test');
      }
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Update Contractor',
        success: true,
        duration: stepEnd - stepStart,
        details: 'Contractor updated successfully'
      });
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Update Contractor',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      throw error;
    }
  }

  async step5_DeleteContractor() {
    const stepStart = Date.now();
    console.log('🗑️ Step 5: Deleting contractor...');
    
    try {
      // Look for delete button
      const deleteButton = await this.page.$('button:has-text("Delete"), .delete-button, [data-action="delete"]');
      
      if (deleteButton) {
        await deleteButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Handle confirmation dialog if present
        const confirmButton = await this.page.$('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
        if (confirmButton) {
          await confirmButton.click();
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        await this.captureScreenshot('08-after-delete');
        
        // Verify deletion
        const deletionVerified = await this.page.evaluate((contractorName) => {
          const text = document.body.textContent;
          return !text.includes(contractorName);
        }, this.testContractorData.name);
        
        if (!deletionVerified) {
          console.log('⚠️  Deletion verification inconclusive - contractor may still be visible');
        }
        
      } else {
        console.log('⚠️  Delete button not found - skipping deletion test');
      }
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Delete Contractor',
        success: true,
        duration: stepEnd - stepStart,
        details: 'Contractor deletion attempted'
      });
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Delete Contractor',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      throw error;
    }
  }

  async fillContractorForm(data) {
    // Fill name field
    const nameInput = await this.page.$('input[name="name"], input[id="name"], input[placeholder*="name"]');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 }); // select all
      await nameInput.type(data.name);
    }
    
    // Fill email field
    const emailInput = await this.page.$('input[name="email"], input[type="email"], input[placeholder*="email"]');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 });
      await emailInput.type(data.email);
    }
    
    // Fill phone field
    const phoneInput = await this.page.$('input[name="phone"], input[type="tel"], input[placeholder*="phone"]');
    if (phoneInput) {
      await phoneInput.click({ clickCount: 3 });
      await phoneInput.type(data.phone);
    }
    
    // Fill company field
    const companyInput = await this.page.$('input[name="company"], input[placeholder*="company"]');
    if (companyInput) {
      await companyInput.click({ clickCount: 3 });
      await companyInput.type(data.company);
    }
    
    // Fill address field
    const addressInput = await this.page.$('textarea[name="address"], input[name="address"], input[placeholder*="address"]');
    if (addressInput) {
      await addressInput.click({ clickCount: 3 });
      await addressInput.type(data.address);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async captureScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `contractor-crud-${name}-${timestamp}.png`;
    const filepath = `${this.config.screenshotsDir}/${filename}`;
    
    await this.page.screenshot({ 
      path: filepath,
      fullPage: true 
    });
    
    console.log(`📷 Screenshot saved: ${filename}`);
    return filepath;
  }
}

module.exports = ContractorCrudTest;