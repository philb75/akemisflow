#!/usr/bin/env node

/**
 * Compatible Data Import Script
 * Import data with proper column mapping and COPY format handling
 */

const { Client } = require('pg');
const fs = require('fs');

class CompatibleDataImporter {
  constructor() {
    this.client = new Client({
      user: 'postgres.wflcaapznpczlxjaeyfd',
      password: 'Philb921056$',
      host: 'aws-0-eu-west-3.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    });
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    console.log(logEntry);
  }

  async connect() {
    await this.client.connect();
    this.log('✅ Connected to database');
  }

  async disconnect() {
    await this.client.end();
    this.log('🔌 Disconnected from database');
  }

  async getTableStructure(tableName) {
    const result = await this.client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName]);
    
    return result.rows.map(row => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES'
    }));
  }

  parseCopyData(copyLine) {
    // Parse PostgreSQL COPY format (tab-separated values with special escaping)
    const fields = [];
    let current = '';
    let i = 0;
    
    while (i < copyLine.length) {
      const char = copyLine[i];
      
      if (char === '\t') {
        fields.push(current === '\\N' ? null : current);
        current = '';
      } else if (char === '\\') {
        const next = copyLine[i + 1];
        if (next === 'N') {
          current += '\\N';
          i++; // Skip the N
        } else if (next === 't') {
          current += '\t';
          i++; // Skip the t
        } else if (next === 'n') {
          current += '\n';
          i++; // Skip the n
        } else if (next === 'r') {
          current += '\r';
          i++; // Skip the r
        } else if (next === '\\') {
          current += '\\';
          i++; // Skip the second backslash
        } else {
          current += char;
        }
      } else {
        current += char;
      }
      i++;
    }
    
    // Add the last field
    fields.push(current === '\\N' ? null : current);
    
    return fields;
  }

  async importTableData(tableName, expectedColumns, dataLines) {
    this.log(`📥 Importing ${tableName} data...`);
    
    if (dataLines.length === 0) {
      this.log(`⚠️ No data found for ${tableName}`, 'WARN');
      return 0;
    }

    // Get current table structure
    const currentColumns = await this.getTableStructure(tableName);
    const currentColumnNames = currentColumns.map(col => col.name);
    
    this.log(`📊 Table ${tableName} has columns: ${currentColumnNames.join(', ')}`);
    this.log(`📊 Data has columns: ${expectedColumns.join(', ')}`);
    
    // Find matching columns
    const columnMapping = [];
    for (let i = 0; i < expectedColumns.length; i++) {
      const expectedCol = expectedColumns[i];
      const currentIndex = currentColumnNames.indexOf(expectedCol);
      if (currentIndex >= 0) {
        columnMapping.push({
          dataIndex: i,
          targetColumn: expectedCol,
          targetIndex: currentIndex
        });
      }
    }
    
    this.log(`📋 Found ${columnMapping.length} matching columns`);
    
    if (columnMapping.length === 0) {
      this.log(`❌ No matching columns found for ${tableName}`, 'ERROR');
      return 0;
    }

    // Prepare INSERT statement
    const targetColumns = columnMapping.map(m => `"${m.targetColumn}"`).join(', ');
    const placeholders = columnMapping.map((_, i) => `$${i + 1}`).join(', ');
    const insertSQL = `INSERT INTO "${tableName}" (${targetColumns}) VALUES (${placeholders})`;
    
    this.log(`📝 Insert SQL: ${insertSQL}`);

    let insertedCount = 0;
    let errorCount = 0;

    // Insert data row by row
    for (const line of dataLines) {
      try {
        const fields = this.parseCopyData(line);
        const values = columnMapping.map(mapping => {
          const value = fields[mapping.dataIndex];
          return value === '\\N' ? null : value;
        });
        
        await this.client.query(insertSQL, values);
        insertedCount++;
        
        if (insertedCount % 10 === 0) {
          this.log(`   📈 Inserted ${insertedCount} records...`);
        }
      } catch (error) {
        errorCount++;
        if (errorCount <= 3) { // Show first 3 errors
          this.log(`   ❌ Insert error: ${error.message}`, 'ERROR');
        }
      }
    }

    this.log(`✅ ${tableName}: ${insertedCount} records inserted, ${errorCount} errors`);
    return insertedCount;
  }

  async importAllData() {
    this.log('📥 Starting data import...');
    
    const dataContent = fs.readFileSync('./migrations/local-export/20250729_214852_local_data.sql', 'utf8');
    const lines = dataContent.split('\n');
    
    let currentTable = null;
    let currentColumns = [];
    let currentData = [];
    const results = {};
    
    for (const line of lines) {
      if (line.startsWith('COPY public.')) {
        // Process previous table if exists
        if (currentTable && currentData.length > 0) {
          results[currentTable] = await this.importTableData(currentTable, currentColumns, currentData);
        }
        
        // Parse new table info
        const match = line.match(/COPY public\.(\w+) \(([^)]+)\) FROM stdin;/);
        if (match) {
          currentTable = match[1];
          currentColumns = match[2].split(', ').map(col => col.trim());
          currentData = [];
          this.log(`📋 Found table: ${currentTable} with ${currentColumns.length} columns`);
        }
      } else if (line === '\\.') {
        // End of data for current table
        if (currentTable && currentData.length > 0) {
          results[currentTable] = await this.importTableData(currentTable, currentColumns, currentData);
        }
        currentTable = null;
        currentColumns = [];
        currentData = [];
      } else if (currentTable && line.trim() && !line.startsWith('--') && !line.startsWith('SET')) {
        // Data line
        currentData.push(line);
      }
    }
    
    // Process last table
    if (currentTable && currentData.length > 0) {
      results[currentTable] = await this.importTableData(currentTable, currentColumns, currentData);
    }
    
    return results;
  }

  async run() {
    const startTime = Date.now();
    
    try {
      this.log('🚀 Starting compatible data import...');
      
      await this.connect();
      const results = await this.importAllData();
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      const totalRecords = Object.values(results).reduce((sum, count) => sum + count, 0);
      
      this.log('🎉 Data import completed successfully!');
      this.log(`⏱️ Total time: ${duration} seconds`);
      this.log(`📊 Total records imported: ${totalRecords}`);
      
      return {
        success: true,
        duration,
        totalRecords,
        tableResults: results,
        message: 'Data import completed successfully'
      };
      
    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      this.log(`💥 Import failed after ${duration} seconds: ${error.message}`, 'ERROR');
      
      return {
        success: false,
        duration,
        error: error.message,
        message: 'Data import failed'
      };
    } finally {
      await this.disconnect();
    }
  }
}

// Execute import
async function main() {
  const importer = new CompatibleDataImporter();
  
  try {
    const result = await importer.run();
    
    console.log('\n📋 Final Result:');
    console.log(JSON.stringify(result, null, 2));
    
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = CompatibleDataImporter;