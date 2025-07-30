const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const APTOS_CONTRACTS_DIR = path.resolve(__dirname, '../aptos-contracts');

function main() {
  try {
    console.log('Compiling Hackathon Clone contracts...');
    
    // Navigate to the aptos-contracts directory
    process.chdir(APTOS_CONTRACTS_DIR);
    
    // Run the aptos move compile command
    const result = execSync('aptos move compile', { encoding: 'utf8' });
    console.log(result);
    
    console.log('Compilation completed successfully!');
    
    // Check if build directory exists
    const buildDir = path.join(APTOS_CONTRACTS_DIR, 'build');
    if (fs.existsSync(buildDir)) {
      console.log(`Build artifacts available at: ${buildDir}`);
    } else {
      console.warn('Warning: Build directory not found after compilation.');
    }
  } catch (error) {
    console.error('Error during compilation:', error.message);
    if (error.stdout) console.error('Stdout:', error.stdout);
    if (error.stderr) console.error('Stderr:', error.stderr);
    process.exit(1);
  }
}

main();
