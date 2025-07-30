const { importAirwallexCSV } = require('./dist/lib/airwallex-import')
const path = require('path')

async function runImport() {
  try {
    console.log('Starting Airwallex CSV import...')
    
    // Path to the CSV file
    const csvPath = path.join(__dirname, 'Balance_Activity_Report_2025-06-14.csv')
    
    console.log(`Importing from: ${csvPath}`)
    
    const result = await importAirwallexCSV(csvPath)
    
    if (result.success) {
      console.log('✅ Import completed successfully!')
      console.log(`📊 Imported: ${result.imported} transactions`)
      console.log(`⏭️  Skipped: ${result.skipped} transactions`)
      
      if (result.errors.length > 0) {
        console.log(`⚠️  Errors encountered:`)
        result.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`)
        })
      }
    } else {
      console.log('❌ Import failed!')
      console.log('Errors:')
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`)
      })
    }
  } catch (error) {
    console.error('❌ Script error:', error)
  }
}

// Check if CSV file exists
const fs = require('fs')
const csvPath = path.join(__dirname, 'Balance_Activity_Report_2025-06-14.csv')

if (!fs.existsSync(csvPath)) {
  console.error(`❌ CSV file not found: ${csvPath}`)
  console.log('Please ensure the Balance_Activity_Report_2025-06-14.csv file is in the project root.')
  process.exit(1)
}

runImport()