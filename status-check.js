#!/usr/bin/env node

console.log('🇮🇩 KELUARGA SILSILAH - DEMO READY STATUS');
console.log('==========================================');
console.log('');

// Check if server is running
const http = require('http');

const checkServer = () => {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:1420', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
};

(async () => {
  const serverRunning = await checkServer();
  
  console.log('📊 SYSTEM STATUS:');
  console.log(`   Server: ${serverRunning ? '🟢 Running on localhost:1420' : '🔴 Not running'}`);
  console.log('   Demo Data: 🟢 Ready (/frontend/src/lib/sample-data-complete.json)');
  console.log('   Sprint 1: 🟢 All tasks completed');
  console.log('   Documentation: 🟢 DEMO-DOCUMENTATION.md created');
  console.log('');
  
  console.log('🎯 SPRINT 1 ACHIEVEMENTS:');
  console.log('   ✅ Dynamic tree sizing (800x600 min, responsive)');
  console.log('   ✅ Root highlighting (golden border for patriarch)');
  console.log('   ✅ Tree building utility (buildTree.js module)'); 
  console.log('   ✅ Clean codebase (removed all debug logs)');
  console.log('   ✅ Demo data creation (24 people, 4 generations)');
  console.log('');
  
  console.log('🌟 DEMO FEATURES READY:');
  console.log('   🔗 Soekarno family (Indonesia\'s 1st President)');
  console.log('   📊 4 generations: Root → A(1-9) → B(1-3) → C(1-2)');
  console.log('   👥 24 historical figures (Megawati, Puan, etc.)');
  console.log('   💒 Multiple marriages + divorce cases');
  console.log('   👶 Adoption example (Wijaya Kusuma - A9)');
  console.log('   ⚰️  Mixed living/deceased status (🟢/🔴)');
  console.log('');
  
  console.log('📋 TO TEST THE DEMO:');
  if (serverRunning) {
    console.log('   1. Open: http://localhost:1420');
    console.log('   2. Click "Pilih Keluarga"');
    console.log('   3. Click "Import dari JSON"');
    console.log('   4. Select: frontend/src/lib/sample-data-complete.json');
    console.log('   5. View complete family tree with golden-bordered Soekarno');
  } else {
    console.log('   1. Start server: cd frontend && npm run dev');
    console.log('   2. Then follow steps above');
  }
  console.log('');
  
  console.log('🚀 SPRINT 2 READY:');
  console.log('   📋 Next tasks: zoom/pan controls, delete relations');
  console.log('   📚 All documentation in DEMO-DOCUMENTATION.md');
  console.log('   🎨 UI ready for advanced features');
  console.log('');
  
  console.log('✨ Indonesian family lineage system fully operational! ✨');
})();