import { createSampleFamily } from './src/lib/sample-data-full.js';

const data = createSampleFamily();
console.log('Sample data loaded:');
console.log('- Trah:', data.trah.nama_trah);
console.log('- Total persons:', data.persons.length);
console.log('- Initialized:', data.initialized);
console.log('\nImporting to localStorage format:');
const jsonData = JSON.stringify(data);
console.log('JSON length:', jsonData.length, 'characters');
console.log('\nReady to import!');
