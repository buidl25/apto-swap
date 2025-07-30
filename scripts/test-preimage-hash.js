const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Функция для вычисления хэша от preimage
function computeHash(preimage) {
  // Преобразуем preimage в Buffer
  const preimageBuffer = Buffer.from(preimage, 'utf8');
  
  // Вычисляем хэш SHA-256
  const hash = crypto.createHash('sha3-256').update(preimageBuffer).digest('hex');
  
  return `0x${hash}`;
}

// Функция для выполнения команды Aptos CLI
function executeAptosCommand(command) {
  try {
    const output = execSync(`aptos ${command}`, { encoding: 'utf8' });
    return output;
  } catch (error) {
    console.error(`Error executing Aptos command: ${error.message}`);
    if (error.stdout) console.error(`Command output: ${error.stdout}`);
    throw error;
  }
}

// Загрузка данных из JSON файла
const htlcDetailsPath = path.join(__dirname, 'vars', 'aptos-htlc-details.json');
const htlcDetails = JSON.parse(fs.readFileSync(htlcDetailsPath, { encoding: 'utf8' }));

const contractId = htlcDetails.contractId;
const preimage = htlcDetails.preimage;
const hashlock = htlcDetails.hashlock;

console.log('=== Testing Preimage Hash ===');
console.log(`Contract ID: ${contractId}`);
console.log(`Preimage: ${preimage}`);
console.log(`Hashlock in JSON: ${hashlock}`);

// Вычисляем хэш от preimage
const computedHash = computeHash(preimage);
console.log(`Computed hash from preimage: ${computedHash}`);

// Проверяем, соответствует ли вычисленный хэш хэшлоку в JSON
console.log(`Hash matches JSON hashlock: ${computedHash === hashlock}`);

// Пробуем разные варианты preimage
const testPreimages = ['secret', 'Secret', 'SECRET', 'secret123', '0xsecret', 'aptos'];

console.log('\n=== Testing Different Preimages ===');
for (const testPreimage of testPreimages) {
  const testHash = computeHash(testPreimage);
  console.log(`Preimage: "${testPreimage}" -> Hash: ${testHash}`);
  console.log(`Matches JSON hashlock: ${testHash === hashlock}`);
  
  // Если хэш соответствует хэшлоку, пробуем выполнить вывод с этим preimage
  if (testHash === hashlock) {
    console.log(`\nFound matching preimage: "${testPreimage}"`);
    console.log('Attempting withdrawal with this preimage...');
    
    const aptosModuleAddress = '0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128';
    const formattedContractId = contractId.startsWith('0x') ? contractId.substring(2) : contractId;
    
    const withdrawCommand = `move run --function-id ${aptosModuleAddress}::atomic_swap::withdraw ` +
      `--type-args ${aptosModuleAddress}::test_aptos_token::TestAptosToken ` +
      `--args hex:${formattedContractId} string:${testPreimage} ` +
      `--assume-yes`;
    
    try {
      console.log(`Executing command: aptos ${withdrawCommand}`);
      const output = executeAptosCommand(withdrawCommand);
      console.log('Withdrawal successful!');
      console.log(output);
      break;
    } catch (error) {
      console.error(`Withdrawal failed with preimage "${testPreimage}": ${error.message}`);
    }
  }
}

// Проверяем, нужно ли использовать хэш от preimage вместо самого preimage
console.log('\n=== Testing Using Hash as Preimage ===');
const hashAsPreimage = computedHash.startsWith('0x') ? computedHash.substring(2) : computedHash;

const aptosModuleAddress = '0x6982a96aa68e520bc6f540295e9547689f07eabd89f4ba6aa2a2b45ffc8fa128';
const formattedContractId = contractId.startsWith('0x') ? contractId.substring(2) : contractId;

const withdrawCommand = `move run --function-id ${aptosModuleAddress}::atomic_swap::withdraw ` +
  `--type-args ${aptosModuleAddress}::test_aptos_token::TestAptosToken ` +
  `--args hex:${formattedContractId} hex:${hashAsPreimage} ` +
  `--assume-yes`;

try {
  console.log(`Executing command: aptos ${withdrawCommand}`);
  const output = executeAptosCommand(withdrawCommand);
  console.log('Withdrawal successful!');
  console.log(output);
} catch (error) {
  console.error(`Withdrawal failed with hash as preimage: ${error.message}`);
}

// Проверяем, может быть нужно использовать пустую строку как preimage
console.log('\n=== Testing Empty String as Preimage ===');
const emptyPreimage = '';
const emptyHash = computeHash(emptyPreimage);
console.log(`Empty string hash: ${emptyHash}`);
console.log(`Matches JSON hashlock: ${emptyHash === hashlock}`);

if (emptyHash === hashlock) {
  const withdrawCommand = `move run --function-id ${aptosModuleAddress}::atomic_swap::withdraw ` +
    `--type-args ${aptosModuleAddress}::test_aptos_token::TestAptosToken ` +
    `--args hex:${formattedContractId} string:"" ` +
    `--assume-yes`;
  
  try {
    console.log(`Executing command: aptos ${withdrawCommand}`);
    const output = executeAptosCommand(withdrawCommand);
    console.log('Withdrawal successful!');
    console.log(output);
  } catch (error) {
    console.error(`Withdrawal failed with empty preimage: ${error.message}`);
  }
}
