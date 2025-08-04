/**
 * Layout Validation Test Module
 * Specialized testing for UI layout and alignment issues
 * Focuses on contractor expanded views and comment field positioning
 */

class LayoutValidationTest {
  constructor(page, config, options = {}) {
    this.page = page;
    this.config = config;
    this.options = options;
    this.results = {
      steps: [],
      metrics: {},
      summary: null,
      layoutIssues: [],
      measurements: {}
    };
    
    // Layout validation specific configuration
    this.layoutConfig = {
      tolerance: options.tolerance || 10, // Pixel tolerance for alignment checks
      maxCommentFieldWidth: options.maxCommentFieldWidth || null, // Auto-detect from column
      screenshotComparisons: options.screenshotComparisons || true,
      validateTableStructure: options.validateTableStructure !== false,
      validateCommentFields: options.validateCommentFields !== false,
      validateColumnAlignment: options.validateColumnAlignment !== false
    };
  }

  async execute() {
    console.log('📐 Starting layout validation test...');
    
    try {
      await this.step1_NavigateAndPrepare();
      await this.step2_AnalyzeTableStructure();
      await this.step3_ValidateContractorRows();
      await this.step4_TestExpandedViews();
      await this.step5_ValidateCommentFields();
      await this.step6_MeasureColumnAlignment();
      await this.step7_GenerateLayoutReport();
      
      this.results.summary = this.generateSummary();
      
    } catch (error) {
      this.results.summary = `Layout validation test failed: ${error.message}`;
      throw error;
    }
    
    return this.results;
  }

  async step1_NavigateAndPrepare() {
    const stepStart = Date.now();
    console.log('🌐 Step 1: Navigating to contractors page and preparing for layout tests...');
    
    try {
      // Navigate to contractors page
      const contractorsUrl = `${this.config.appUrl}/entities/contractors`;
      await this.page.goto(contractorsUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: this.config.testTimeout 
      });
      
      // Wait for page to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Take initial screenshot
      await this.captureScreenshot('01-initial-contractors-page');
      
      // Check if we have contractor data to work with
      const hasContractors = await this.page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr, .contractor-item, .contractor-card');
        return rows.length > 0;
      });
      
      if (!hasContractors) {
        console.log('⚠️  No contractors found - may need to trigger sync first');
        
        // Try to trigger sync if no data
        await this.attemptSyncTrigger();
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Navigate and Prepare',
        success: true,
        duration: stepEnd - stepStart,
        details: hasContractors ? 'Found contractor data' : 'Triggered sync for data'
      });
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Navigate and Prepare',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      throw error;
    }
  }

  async attemptSyncTrigger() {
    console.log('🔄 Attempting to trigger sync for test data...');
    
    try {
      // Look for sync button
      const syncButton = await this.page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
        return buttons.find(btn => {
          const text = btn.textContent.toLowerCase().trim();
          return text.includes('sync') || text.includes('import') || text.includes('refresh');
        });
      });
      
      if (syncButton.asElement()) {
        await syncButton.click();
        console.log('✅ Sync triggered via UI button');
      } else {
        // Try API sync
        await this.page.evaluate(async () => {
          try {
            await fetch('/api/contractors/sync-airwallex', { method: 'POST' });
          } catch (e) {
            // Ignore errors
          }
        });
        console.log('✅ Sync attempted via API');
      }
    } catch (error) {
      console.log('⚠️  Could not trigger sync:', error.message);
    }
  }

  async step2_AnalyzeTableStructure() {
    const stepStart = Date.now();
    console.log('📊 Step 2: Analyzing table structure and column layout...');
    
    try {
      const tableAnalysis = await this.page.evaluate(() => {
        const tables = Array.from(document.querySelectorAll('table'));
        
        return tables.map((table, tableIndex) => {
          const tableRect = table.getBoundingClientRect();
          
          // Analyze headers
          const headers = Array.from(table.querySelectorAll('th')).map((th, index) => {
            const rect = th.getBoundingClientRect();
            const styles = window.getComputedStyle(th);
            
            return {
              index,
              text: th.textContent.trim(),
              width: rect.width,
              left: rect.left,
              right: rect.right,
              textAlign: styles.textAlign,
              padding: styles.padding,
              className: th.className,
              isAkemisColumn: th.textContent.toLowerCase().includes('akemis') || 
                            th.textContent.toLowerCase().includes('contractor'),
              isAirwallexColumn: th.textContent.toLowerCase().includes('airwallex')
            };
          });
          
          // Analyze sample rows
          const rows = Array.from(table.querySelectorAll('tbody tr')).slice(0, 5).map((tr, rowIndex) => {
            const cells = Array.from(tr.querySelectorAll('td')).map((td, cellIndex) => {
              const rect = td.getBoundingClientRect();
              const styles = window.getComputedStyle(td);
              
              return {
                cellIndex,
                width: rect.width,
                left: rect.left,
                right: rect.right,
                textAlign: styles.textAlign,
                hasExpandButton: td.querySelector('button') !== null,
                contentLength: td.textContent.trim().length
              };
            });
            
            return {
              rowIndex,
              cells,
              isExpandable: tr.querySelector('button') !== null || 
                          window.getComputedStyle(tr).cursor === 'pointer'
            };
          });
          
          return {
            tableIndex,
            totalWidth: tableRect.width,
            headers,
            rows,
            columnCount: headers.length
          };
        });
      });
      
      this.results.measurements.tableStructure = tableAnalysis;
      
      // Analyze structure for issues
      const structureIssues = [];
      
      tableAnalysis.forEach((table, tableIndex) => {
        // Check for column alignment consistency
        if (table.headers.length > 1) {
          const akemisColumn = table.headers.find(h => h.isAkemisColumn);
          const airwallexColumn = table.headers.find(h => h.isAirwallexColumn);
          
          if (akemisColumn && airwallexColumn) {
            console.log(`📋 Found AkemisFlow column at index ${akemisColumn.index}, Airwallex at ${airwallexColumn.index}`);
            
            // Check if columns have reasonable widths
            const totalUsableWidth = table.totalWidth;
            const akemisWidthPercent = (akemisColumn.width / totalUsableWidth) * 100;
            const airwallexWidthPercent = (airwallexColumn.width / totalUsableWidth) * 100;
            
            if (Math.abs(akemisWidthPercent - airwallexWidthPercent) > 30) {
              structureIssues.push({
                type: 'column_width_imbalance',
                message: `Column width imbalance: AkemisFlow (${Math.round(akemisWidthPercent)}%) vs Airwallex (${Math.round(airwallexWidthPercent)}%)`,
                tableIndex,
                akemisPercent: akemisWidthPercent,
                airwallexPercent: airwallexWidthPercent,
                severity: 'medium'
              });
            }
          }
        }
        
        // Check for header-cell alignment in sample rows
        table.rows.forEach((row, rowIndex) => {
          if (row.cells.length !== table.headers.length) {
            structureIssues.push({
              type: 'header_cell_mismatch',
              message: `Row ${rowIndex} has ${row.cells.length} cells but table has ${table.headers.length} headers`,
              tableIndex,
              rowIndex,
              severity: 'high'
            });
          }
          
          // Check cell width consistency with headers
          row.cells.forEach((cell, cellIndex) => {
            const header = table.headers[cellIndex];
            if (header && Math.abs(cell.width - header.width) > this.layoutConfig.tolerance) {
              structureIssues.push({
                type: 'cell_header_width_mismatch',
                message: `Cell ${cellIndex} in row ${rowIndex} width (${Math.round(cell.width)}px) doesn't match header width (${Math.round(header.width)}px)`,
                tableIndex,
                rowIndex,
                cellIndex,
                cellWidth: cell.width,
                headerWidth: header.width,
                severity: 'low'
              });
            }
          });
        });
      });
      
      this.results.layoutIssues.push(...structureIssues);
      
      await this.captureScreenshot('02-table-structure-analyzed');
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Analyze Table Structure',
        success: structureIssues.length === 0,
        duration: stepEnd - stepStart,
        details: `Analyzed ${tableAnalysis.length} tables, found ${structureIssues.length} structure issues`,
        issuesFound: structureIssues.length
      });
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Analyze Table Structure',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      throw error;
    }
  }

  async step3_ValidateContractorRows() {
    const stepStart = Date.now();
    console.log('👥 Step 3: Validating contractor row layout and spacing...');
    
    try {
      const rowValidation = await this.page.evaluate((tolerance) => {
        const tables = Array.from(document.querySelectorAll('table'));
        const issues = [];
        
        tables.forEach((table, tableIndex) => {
          const rows = Array.from(table.querySelectorAll('tbody tr'));
          
          rows.forEach((row, rowIndex) => {
            const rowRect = row.getBoundingClientRect();
            const cells = Array.from(row.querySelectorAll('td'));
            
            // Check row height consistency
            if (rowRect.height < 30) {
              issues.push({
                type: 'row_too_short',
                message: `Row ${rowIndex} is very short (${Math.round(rowRect.height)}px)`,
                tableIndex,
                rowIndex,
                height: rowRect.height,
                severity: 'low'
              });
            }
            
            // Check cell vertical alignment
            let maxCellHeight = 0;
            cells.forEach(cell => {
              const cellHeight = cell.getBoundingClientRect().height;
              maxCellHeight = Math.max(maxCellHeight, cellHeight);
            });
            
            cells.forEach((cell, cellIndex) => {
              const cellRect = cell.getBoundingClientRect();
              const heightDiff = Math.abs(cellRect.height - maxCellHeight);
              
              if (heightDiff > tolerance && heightDiff > 10) {
                issues.push({
                  type: 'cell_height_inconsistent',
                  message: `Cell ${cellIndex} in row ${rowIndex} height inconsistent (${Math.round(cellRect.height)}px vs max ${Math.round(maxCellHeight)}px)`,
                  tableIndex,
                  rowIndex,
                  cellIndex,
                  cellHeight: cellRect.height,
                  maxHeight: maxCellHeight,
                  severity: 'low'
                });
              }
            });
            
            // Check for overflow content
            cells.forEach((cell, cellIndex) => {
              const styles = window.getComputedStyle(cell);
              const hasOverflow = cell.scrollWidth > cell.clientWidth;
              
              if (hasOverflow) {
                issues.push({
                  type: 'cell_content_overflow',
                  message: `Cell ${cellIndex} in row ${rowIndex} has content overflow`,
                  tableIndex,
                  rowIndex,
                  cellIndex,
                  scrollWidth: cell.scrollWidth,
                  clientWidth: cell.clientWidth,
                  severity: 'medium'
                });
              }
            });
          });
        });
        
        return {
          issues,
          rowCount: tables.reduce((sum, table) => sum + table.querySelectorAll('tbody tr').length, 0)
        };
      }, this.layoutConfig.tolerance);
      
      this.results.layoutIssues.push(...rowValidation.issues);
      
      await this.captureScreenshot('03-contractor-rows-validated');
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Validate Contractor Rows',
        success: rowValidation.issues.length === 0,
        duration: stepEnd - stepStart,
        details: `Validated ${rowValidation.rowCount} rows, found ${rowValidation.issues.length} issues`,
        issuesFound: rowValidation.issues.length
      });
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Validate Contractor Rows',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      throw error;
    }
  }

  async step4_TestExpandedViews() {
    const stepStart = Date.now();
    console.log('🔍 Step 4: Testing expanded contractor views...');
    
    try {
      // Find expandable elements
      const expandableElements = await this.findExpandableElements();
      let expandedViewIssues = [];
      let testedExpansions = 0;
      
      if (expandableElements.length > 0) {
        console.log(`📋 Found ${expandableElements.length} expandable elements`);
        
        // Test first 3 expandable elements
        for (let i = 0; i < Math.min(3, expandableElements.length); i++) {
          const element = expandableElements[i];
          
          try {
            console.log(`🔄 Testing expansion ${i + 1}...`);
            
            // Take before screenshot
            await this.captureScreenshot(`04-before-expand-${i}`);
            
            // Get initial state measurements
            const beforeState = await this.measurePageLayout();
            
            // Expand the element
            await element.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Take after screenshot
            await this.captureScreenshot(`04-after-expand-${i}`);
            
            // Get expanded state measurements
            const afterState = await this.measurePageLayout();
            
            // Compare states for layout issues
            const expansionIssues = this.compareLayoutStates(beforeState, afterState, i);
            expandedViewIssues.push(...expansionIssues);
            
            testedExpansions++;
            
            // Collapse back
            await element.click();
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (expansionError) {
            console.log(`⚠️  Failed to test expansion ${i}: ${expansionError.message}`);
            expandedViewIssues.push({
              type: 'expansion_test_failed',
              message: `Could not test expansion ${i}: ${expansionError.message}`,
              expansionIndex: i,
              severity: 'medium'
            });
          }
        }
      } else {
        console.log('ℹ️  No expandable elements found');
      }
      
      this.results.layoutIssues.push(...expandedViewIssues);
      
      await this.captureScreenshot('04-expanded-views-tested');
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Expanded Views',
        success: expandedViewIssues.length === 0,
        duration: stepEnd - stepStart,
        details: `Tested ${testedExpansions} expansions, found ${expandedViewIssues.length} issues`,
        testedExpansions,
        issuesFound: expandedViewIssues.length
      });
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Expanded Views',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      // Don't throw - continue with other tests
    }
  }

  async findExpandableElements() {
    const expandableSelectors = [
      'button[aria-expanded]',
      '[data-testid*="expand"]',
      '.expandable',
      '.accordion-toggle',
      'tr button',
      'table tbody tr button',
      '[role="button"][aria-label*="expand"]'
    ];
    
    let elements = [];
    
    for (const selector of expandableSelectors) {
      try {
        const found = await this.page.$$(selector);
        elements.push(...found);
      } catch (error) {
        continue;
      }
    }
    
    // Remove duplicates
    const uniqueElements = [];
    for (const element of elements) {
      try {
        const isUnique = !(await Promise.all(
          uniqueElements.map(unique => 
            this.page.evaluate((el1, el2) => el1 === el2, element, unique)
          )
        )).some(result => result);
        
        if (isUnique) {
          uniqueElements.push(element);
        }
      } catch (error) {
        continue;
      }
    }
    
    return uniqueElements;
  }

  async measurePageLayout() {
    return await this.page.evaluate(() => {
      const measurements = {
        tables: [],
        commentFields: [],
        pageWidth: document.body.scrollWidth,
        pageHeight: document.body.scrollHeight
      };
      
      // Measure tables
      const tables = Array.from(document.querySelectorAll('table'));
      measurements.tables = tables.map((table, index) => {
        const rect = table.getBoundingClientRect();
        return {
          index,
          width: rect.width,
          height: rect.height,
          left: rect.left,
          top: rect.top
        };
      });
      
      // Measure comment fields
      const commentFields = Array.from(document.querySelectorAll('textarea, input[type="text"]')).filter(field => {
        const label = field.labels?.[0]?.textContent || field.placeholder || '';
        return label.toLowerCase().includes('comment') || 
               field.name?.toLowerCase().includes('comment') ||
               field.id?.toLowerCase().includes('comment');
      });
      
      measurements.commentFields = commentFields.map((field, index) => {
        const rect = field.getBoundingClientRect();
        return {
          index,
          width: rect.width,
          height: rect.height,
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          tagName: field.tagName,
          visible: rect.width > 0 && rect.height > 0
        };
      });
      
      return measurements;
    });
  }

  compareLayoutStates(before, after, expansionIndex) {
    const issues = [];
    
    // Check if new comment fields appeared and validate their positioning
    const newCommentFields = after.commentFields.filter(afterField => 
      !before.commentFields.some(beforeField => 
        Math.abs(beforeField.left - afterField.left) < 10 && 
        Math.abs(beforeField.top - afterField.top) < 10
      )
    );
    
    if (newCommentFields.length > 0) {
      console.log(`📝 Found ${newCommentFields.length} new comment fields after expansion`);
      
      newCommentFields.forEach((field, fieldIndex) => {
        // Check if field width is reasonable for a single column
        if (field.width > 600) { // Arbitrary threshold for "too wide"
          issues.push({
            type: 'comment_field_too_wide',
            message: `New comment field ${fieldIndex} is very wide (${Math.round(field.width)}px) - may span multiple columns`,
            expansionIndex,
            fieldIndex,
            fieldWidth: field.width,
            severity: 'high'
          });
        }
        
        // Check if field extends beyond reasonable boundaries
        const pageWidth = after.pageWidth;
        if (field.right > pageWidth * 0.8) {
          issues.push({
            type: 'comment_field_extends_too_far',
            message: `New comment field ${fieldIndex} extends too far right (${Math.round(field.right)}px of ${Math.round(pageWidth)}px page width)`,
            expansionIndex,
            fieldIndex,
            fieldRight: field.right,
            pageWidth: pageWidth,
            severity: 'medium'
          });
        }
      });
    }
    
    return issues;
  }

  async step5_ValidateCommentFields() {
    const stepStart = Date.now();
    console.log('💬 Step 5: Validating comment field positioning and alignment...');
    
    try {
      // First, ensure we have some expanded views to test
      const expandableElements = await this.findExpandableElements();
      let commentFieldIssues = [];
      
      if (expandableElements.length > 0) {
        // Expand first element for detailed comment field analysis
        const firstElement = expandableElements[0];
        
        await firstElement.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.captureScreenshot('05-expanded-for-comment-validation');
        
        // Perform detailed comment field analysis
        const commentAnalysis = await this.page.evaluate(() => {
          const issues = [];
          const measurements = {};
          
          // Find all comment fields
          const commentFields = Array.from(document.querySelectorAll('textarea, input[type="text"]')).filter(field => {
            const label = field.labels?.[0]?.textContent || field.placeholder || field.name || field.id || '';
            return label.toLowerCase().includes('comment');
          });
          
          measurements.commentFieldCount = commentFields.length;
          
          if (commentFields.length === 0) {
            return { issues: [], measurements };
          }
          
          // Find table structure for reference
          const table = document.querySelector('table');
          let tableColumns = [];
          
          if (table) {
            const headers = Array.from(table.querySelectorAll('th'));
            tableColumns = headers.map(th => {
              const rect = th.getBoundingClientRect();
              return {
                text: th.textContent.trim(),
                left: rect.left,
                right: rect.right,
                width: rect.width,
                isAkemis: th.textContent.toLowerCase().includes('akemis') || 
                         th.textContent.toLowerCase().includes('contractor'),
                isAirwallex: th.textContent.toLowerCase().includes('airwallex')
              };
            });
          }
          
          measurements.tableColumns = tableColumns;
          
          // Analyze each comment field
          commentFields.forEach((field, index) => {
            const rect = field.getBoundingClientRect();
            const fieldData = {
              index,
              left: rect.left,
              right: rect.right,
              width: rect.width,
              top: rect.top,
              bottom: rect.bottom
            };
            
            measurements[`commentField_${index}`] = fieldData;
            
            if (tableColumns.length >= 2) {
              const akemisColumn = tableColumns.find(col => col.isAkemis);
              const airwallexColumn = tableColumns.find(col => col.isAirwallex);
              
              if (akemisColumn && airwallexColumn) {
                // Check if comment field spans both columns
                const spansAkemis = rect.left <= akemisColumn.right && rect.right >= akemisColumn.left;
                const spansAirwallex = rect.left <= airwallexColumn.right && rect.right >= airwallexColumn.left;
                
                if (spansAkemis && spansAirwallex) {
                  issues.push({
                    type: 'comment_spans_both_columns',
                    message: `Comment field ${index} spans both AkemisFlow and Airwallex columns`,
                    fieldIndex: index,
                    fieldLeft: rect.left,
                    fieldRight: rect.right,
                    akemisColumn: { left: akemisColumn.left, right: akemisColumn.right },
                    airwallexColumn: { left: airwallexColumn.left, right: airwallexColumn.right },
                    severity: 'critical'
                  });
                }
                
                // Check if comment field width exceeds single column width
                if (rect.width > akemisColumn.width + 20) { // 20px tolerance
                  issues.push({
                    type: 'comment_width_exceeds_column',
                    message: `Comment field ${index} width (${Math.round(rect.width)}px) exceeds AkemisFlow column width (${Math.round(akemisColumn.width)}px)`,
                    fieldIndex: index,
                    fieldWidth: rect.width,
                    columnWidth: akemisColumn.width,
                    severity: 'high'
                  });
                }
                
                // Check alignment with intended column
                if (spansAkemis && !spansAirwallex) {
                  // Good - spans only Akemis column
                  const alignmentOff = Math.abs(rect.left - akemisColumn.left);
                  if (alignmentOff > 10) {
                    issues.push({
                      type: 'comment_alignment_off',
                      message: `Comment field ${index} not well-aligned with AkemisFlow column (${Math.round(alignmentOff)}px off)`,
                      fieldIndex: index,
                      alignmentOffset: alignmentOff,
                      severity: 'low'
                    });
                  }
                }
              }
            }
            
            // Check for general positioning issues
            if (rect.width < 100) {
              issues.push({
                type: 'comment_field_too_narrow',
                message: `Comment field ${index} is very narrow (${Math.round(rect.width)}px)`,
                fieldIndex: index,
                width: rect.width,
                severity: 'low'
              });
            }
            
            if (rect.width > 800) {
              issues.push({
                type: 'comment_field_extremely_wide',
                message: `Comment field ${index} is extremely wide (${Math.round(rect.width)}px)`,
                fieldIndex: index,
                width: rect.width,
                severity: 'high'
              });
            }
          });
          
          return { issues, measurements };
        });
        
        commentFieldIssues.push(...commentAnalysis.issues);
        this.results.measurements.commentFieldAnalysis = commentAnalysis.measurements;
        
        // Collapse back
        await firstElement.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } else {
        console.log('ℹ️  No expandable elements found for comment field validation');
      }
      
      this.results.layoutIssues.push(...commentFieldIssues);
      
      await this.captureScreenshot('05-comment-fields-validated');
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Validate Comment Fields',
        success: commentFieldIssues.length === 0,
        duration: stepEnd - stepStart,
        details: `Found ${commentFieldIssues.length} comment field issues`,
        issuesFound: commentFieldIssues.length
      });
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Validate Comment Fields',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      // Don't throw - continue with other tests
    }
  }

  async step6_MeasureColumnAlignment() {
    const stepStart = Date.now();
    console.log('📏 Step 6: Measuring column alignment and consistency...');
    
    try {
      const alignmentAnalysis = await this.page.evaluate((tolerance) => {
        const tables = Array.from(document.querySelectorAll('table'));
        const issues = [];
        const measurements = {};
        
        tables.forEach((table, tableIndex) => {
          const headers = Array.from(table.querySelectorAll('th'));
          const rows = Array.from(table.querySelectorAll('tbody tr')).slice(0, 10); // Sample first 10 rows
          
          measurements[`table_${tableIndex}`] = {
            headerCount: headers.length,
            rowCount: rows.length,
            headers: headers.map(th => ({
              text: th.textContent.trim(),
              left: th.getBoundingClientRect().left,
              width: th.getBoundingClientRect().width
            }))
          };
          
          // Check header-to-cell alignment for each column
          headers.forEach((header, colIndex) => {
            const headerRect = header.getBoundingClientRect();
            
            // Check alignment consistency across rows
            const cellAlignments = rows.map((row, rowIndex) => {
              const cell = row.querySelectorAll('td')[colIndex];
              if (!cell) return null;
              
              const cellRect = cell.getBoundingClientRect();
              return {
                rowIndex,
                left: cellRect.left,
                width: cellRect.width,
                alignmentDiff: Math.abs(cellRect.left - headerRect.left)
              };
            }).filter(alignment => alignment !== null);
            
            // Find cells with significant alignment differences
            cellAlignments.forEach(alignment => {
              if (alignment.alignmentDiff > tolerance) {
                issues.push({
                  type: 'cell_header_misalignment',
                  message: `Cell in row ${alignment.rowIndex}, column ${colIndex} misaligned by ${Math.round(alignment.alignmentDiff)}px`,
                  tableIndex,
                  rowIndex: alignment.rowIndex,
                  columnIndex: colIndex,
                  alignmentDiff: alignment.alignmentDiff,
                  severity: alignment.alignmentDiff > tolerance * 2 ? 'medium' : 'low'
                });
              }
            });
            
            // Check for width consistency
            const widthVariations = cellAlignments.map(a => a.width);
            const avgWidth = widthVariations.reduce((sum, w) => sum + w, 0) / widthVariations.length;
            const maxVariation = Math.max(...widthVariations.map(w => Math.abs(w - avgWidth)));
            
            if (maxVariation > tolerance * 2) {
              issues.push({
                type: 'column_width_inconsistent',
                message: `Column ${colIndex} has inconsistent width across rows (max variation: ${Math.round(maxVariation)}px)`,
                tableIndex,
                columnIndex: colIndex,
                maxVariation,
                averageWidth: avgWidth,
                severity: 'low'
              });
            }
          });
        });
        
        return { issues, measurements };
      }, this.layoutConfig.tolerance);
      
      this.results.layoutIssues.push(...alignmentAnalysis.issues);
      this.results.measurements.columnAlignment = alignmentAnalysis.measurements;
      
      await this.captureScreenshot('06-column-alignment-measured');
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Measure Column Alignment',
        success: alignmentAnalysis.issues.length === 0,
        duration: stepEnd - stepStart,
        details: `Found ${alignmentAnalysis.issues.length} alignment issues`,
        issuesFound: alignmentAnalysis.issues.length
      });
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Measure Column Alignment',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      // Don't throw - continue with report generation
    }
  }

  async step7_GenerateLayoutReport() {
    const stepStart = Date.now();
    console.log('📋 Step 7: Generating comprehensive layout report...');
    
    try {
      // Take final comprehensive screenshot
      await this.captureScreenshot('07-final-layout-state');
      
      // Categorize issues by severity
      const criticalIssues = this.results.layoutIssues.filter(i => i.severity === 'critical');
      const highIssues = this.results.layoutIssues.filter(i => i.severity === 'high');
      const mediumIssues = this.results.layoutIssues.filter(i => i.severity === 'medium');
      const lowIssues = this.results.layoutIssues.filter(i => i.severity === 'low');
      
      this.results.metrics.layoutValidation = {
        totalIssues: this.results.layoutIssues.length,
        criticalIssues: criticalIssues.length,
        highIssues: highIssues.length,
        mediumIssues: mediumIssues.length,
        lowIssues: lowIssues.length,
        issuesByType: this.groupIssuesByType(),
        hasCommentFieldIssues: this.results.layoutIssues.some(i => i.type.includes('comment')),
        hasColumnAlignmentIssues: this.results.layoutIssues.some(i => i.type.includes('alignment')),
        testCoverage: {
          tableStructureAnalyzed: this.results.measurements.tableStructure !== undefined,
          commentFieldsValidated: this.results.measurements.commentFieldAnalysis !== undefined,
          columnAlignmentMeasured: this.results.measurements.columnAlignment !== undefined
        }
      };
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Generate Layout Report',
        success: true,
        duration: stepEnd - stepStart,
        details: `Generated report with ${this.results.layoutIssues.length} total issues`
      });
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Generate Layout Report',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      throw error;
    }
  }

  groupIssuesByType() {
    const groups = {};
    this.results.layoutIssues.forEach(issue => {
      if (!groups[issue.type]) {
        groups[issue.type] = [];
      }
      groups[issue.type].push(issue);
    });
    
    return Object.keys(groups).map(type => ({
      type,
      count: groups[type].length,
      examples: groups[type].slice(0, 3) // First 3 examples
    }));
  }

  generateSummary() {
    const totalIssues = this.results.layoutIssues.length;
    const criticalIssues = this.results.layoutIssues.filter(i => i.severity === 'critical').length;
    const highIssues = this.results.layoutIssues.filter(i => i.severity === 'high').length;
    
    let summary = `Layout validation completed with ${totalIssues} issues found.\n`;
    
    if (criticalIssues > 0) {
      summary += `⚠️  CRITICAL: ${criticalIssues} critical layout issues require immediate attention.\n`;
    }
    
    if (highIssues > 0) {
      summary += `🔺 HIGH: ${highIssues} high-priority layout issues found.\n`;
    }
    
    if (totalIssues === 0) {
      summary += `✅ No layout issues detected - UI alignment appears correct.\n`;
    }
    
    // Specific comment field issue summary
    const commentIssues = this.results.layoutIssues.filter(i => i.type.includes('comment'));
    if (commentIssues.length > 0) {
      summary += `💬 Comment field issues: ${commentIssues.length} problems with comment field positioning/sizing.\n`;
    }
    
    return summary;
  }

  async captureScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `layout-${name}-${timestamp}.png`;
    const filepath = `${this.config.screenshotsDir}/${filename}`;
    
    await this.page.screenshot({ 
      path: filepath,
      fullPage: true 
    });
    
    console.log(`📷 Layout screenshot saved: ${filename}`);
    return filepath;
  }
}

module.exports = LayoutValidationTest;