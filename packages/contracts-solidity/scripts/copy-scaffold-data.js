const fs = require('fs')
const path = require('path')

// Copy scaffold data to frontend for development
function copyScaffoldData() {
  const scaffoldPath = path.join(__dirname, '../scaffold-output.json')
  const frontendPath = path.join(__dirname, '../../frontend/public/scaffold-data.json')

  if (!fs.existsSync(scaffoldPath)) {
    console.log('❌ No scaffold data found. Run "npm run scaffold" first.')
    return
  }

  try {
    const data = fs.readFileSync(scaffoldPath, 'utf8')

    // Ensure frontend public directory exists
    const publicDir = path.dirname(frontendPath)
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    fs.writeFileSync(frontendPath, data)
    console.log('✅ Scaffold data copied to frontend')
    console.log(`📁 Location: ${frontendPath}`)

    // Parse and show summary
    const parsed = JSON.parse(data)
    console.log('\n📊 Data Summary:')
    console.log(`  👥 Users: ${parsed.users?.length || 0}`)
    console.log(`  🏛️  DAOs: ${parsed.daos?.length || 0}`)
    console.log(`  💸 Campaigns: ${parsed.campaigns?.length || 0}`)
    console.log(`  🗳️  Proposals: ${parsed.proposals?.length || 0}`)

  } catch (error) {
    console.error('❌ Error copying scaffold data:', error.message)
  }
}

copyScaffoldData()
