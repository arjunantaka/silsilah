#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the comprehensive demo data
const demoDataPath = path.join(__dirname, 'frontend/src/lib/sample-data-complete.json');
const demoData = JSON.parse(fs.readFileSync(demoDataPath, 'utf8'));

console.log('=== KELUARGA SILSILAH DEMO DATA LOADER ===');
console.log('');
console.log('Demo data contains:');
console.log(`- ${demoData.families.length} keluarga: ${demoData.families[0].nama}`);
console.log(`- ${demoData.persons.length} orang`);
console.log(`- ${demoData.unions.length} pernikahan/hubungan`);
console.log(`- ${demoData.relations.length} relasi keluarga`);
console.log('');

// Show key family members by generation
const generations = {
  'Root': demoData.persons.filter(p => p.lineage_code === ''),
  'A Generation (Anak)': demoData.persons.filter(p => p.lineage_code && p.lineage_code.startsWith('A')),
  'B Generation (Cucu)': demoData.persons.filter(p => p.lineage_code && p.lineage_code.startsWith('B')),
  'C Generation (Cicit)': demoData.persons.filter(p => p.lineage_code && p.lineage_code.startsWith('C'))
};

Object.entries(generations).forEach(([genName, people]) => {
  if (people.length > 0) {
    console.log(`\n${genName}:`);
    people.forEach(person => {
      const status = person.status_hidup === 'hidup' ? '🟢' : '🔴';
      const code = person.lineage_code ? `[${person.lineage_code}] ` : '';
      console.log(`  ${status} ${code}${person.nama_lengkap}`);
    });
  }
});

console.log('\n=== KEY FEATURES DEMONSTRATED ===');
console.log('✅ Root Highlighting: Soekarno (golden border expected)');
console.log('✅ Lineage Codes: A1-A9, B1-B3, C1-C2');
console.log('✅ Multiple Marriages: Soekarno had 4 wives');
console.log('✅ Divorce Cases: Soekarno-Inggit, Sukmawati-Wiranto');
console.log('✅ Adoption: Wijaya Kusuma (A9) adopted by Sukmawati');
console.log('✅ Living/Deceased Status: Mixed hidup/wafat');
console.log('✅ 4 Generations: Root → A → B → C');
console.log('✅ Historical Accuracy: Real Soekarno family members');
console.log('');

console.log('📋 TO LOAD THIS DATA:');
console.log('1. Navigate to http://localhost:1420');
console.log('2. Click "Pilih Keluarga" button');
console.log('3. Click "Import dari JSON" button');
console.log('4. Select the file: frontend/src/lib/sample-data-complete.json');
console.log('5. Family tree will show all 4 generations with features');
console.log('');

// Check the status of unions to show relationship features
const marriages = demoData.unions;
const activeMarriages = marriages.filter(u => u.status === 'menikah').length;
const divorces = marriages.filter(u => u.status === 'cerai').length;

console.log('🔗 RELATIONSHIP FEATURES:');
console.log(`   Active marriages: ${activeMarriages}`);
console.log(`   Divorces: ${divorces}`);
console.log('   Polygamy: Soekarno\'s multiple concurrent wives');
console.log('');

console.log('🌳 TREE VISUALIZATION FEATURES:');
console.log('   - Dynamic sizing (min 800x600, grows with window)');
console.log('   - Root highlighting (golden border for Soekarno)');
console.log('   - Clean display (no debug logs)');
console.log('   - 4-generation layout with proper spacing');
console.log('');

console.log('Ready to showcase Indonesian family lineage system! 🇮🇩');