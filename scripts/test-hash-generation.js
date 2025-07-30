const crypto = require('crypto');

/**
 * Вычисляет хэшлок из прообраза с использованием SHA3-256
 * @param {string} preimage - Прообраз для хэширования
 * @returns {string} - Хэш в шестнадцатеричном формате без префикса 0x
 */
function computeHashlock(preimage) {
  const preimageBuffer = Buffer.from(preimage, 'utf8');
  return crypto.createHash('sha3-256').update(preimageBuffer).digest('hex');
}

/**
 * Тестирует вычисление хэшлока для различных прообразов
 */
function testHashGeneration() {
  console.log('=== Testing Hash Generation ===');
  
  const testCases = [
    { preimage: 'secret', description: 'Default preimage' },
    { preimage: 'test', description: 'Simple test string' },
    { preimage: '123456', description: 'Numeric string' },
    { preimage: '', description: 'Empty string' },
    { preimage: 'ThisIsALongerPreimageForTesting', description: 'Longer string' }
  ];
  
  testCases.forEach(test => {
    const hashlock = computeHashlock(test.preimage);
    console.log(`\nPreimage: "${test.preimage}" (${test.description})`);
    console.log(`Computed hashlock: 0x${hashlock}`);
    
    // Вывод в формате для использования в командной строке
    console.log(`For CLI: hex:${hashlock}`);
  });
  
  // Проверяем хэшлок из JSON файла
  try {
    const fs = require('fs');
    const path = require('path');
    const jsonPath = path.join(__dirname, 'vars', 'aptos-htlc-details.json');
    
    if (fs.existsSync(jsonPath)) {
      const htlcDetails = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      console.log('\n=== Comparing with stored HTLC details ===');
      console.log(`Stored preimage: ${htlcDetails.preimage}`);
      console.log(`Stored hashlock: ${htlcDetails.hashlock}`);
      
      const computedHashlock = computeHashlock(htlcDetails.preimage);
      console.log(`Computed hashlock from stored preimage: 0x${computedHashlock}`);
      
      if (htlcDetails.hashlock === `0x${computedHashlock}`) {
        console.log('✅ Hashlock matches computed value!');
      } else {
        console.log('❌ Hashlock does NOT match computed value!');
      }
    } else {
      console.log('\nNo HTLC details file found.');
    }
  } catch (error) {
    console.error('Error reading HTLC details:', error);
  }
}

// Запускаем тест
testHashGeneration();
