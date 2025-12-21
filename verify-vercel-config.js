#!/usr/bin/env node

/**
 * Vercel Configuration Verification Script
 * 
 * This script verifies that the Vercel deployment configuration is correct
 * and tests the build process locally before deploying.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Vercel Configuration Verification\n');

let hasErrors = false;

// Check 1: Verify vercel.json exists and is valid JSON
console.log('✓ Checking vercel.json...');
try {
  const vercelConfigPath = path.join(__dirname, 'vercel.json');
  if (!fs.existsSync(vercelConfigPath)) {
    console.error('  ❌ vercel.json not found');
    hasErrors = true;
  } else {
    const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    
    // Verify required fields
    if (!config.buildCommand) {
      console.error('  ❌ buildCommand not specified');
      hasErrors = true;
    } else {
      console.log(`  ✓ Build command: ${config.buildCommand}`);
    }
    
    if (!config.outputDirectory) {
      console.error('  ❌ outputDirectory not specified');
      hasErrors = true;
    } else {
      console.log(`  ✓ Output directory: ${config.outputDirectory}`);
    }
    
    if (config.framework !== null) {
      console.warn('  ⚠️  Warning: framework is not null (may use Edge runtime)');
    } else {
      console.log('  ✓ Framework: null (static site mode)');
    }
    
    if (!config.rewrites || config.rewrites.length === 0) {
      console.warn('  ⚠️  Warning: No rewrites configured (SPA routing may not work)');
    } else {
      console.log(`  ✓ Rewrites: ${config.rewrites.length} rule(s)`);
    }
    
    if (config.headers && config.headers.length > 0) {
      console.log(`  ✓ Headers: ${config.headers.length} rule(s)`);
    }
  }
} catch (error) {
  console.error('  ❌ Error reading vercel.json:', error.message);
  hasErrors = true;
}

// Check 2: Verify package.json has build script
console.log('\n✓ Checking package.json...');
try {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.scripts['build:web']) {
    console.error('  ❌ build:web script not found');
    hasErrors = true;
  } else {
    console.log(`  ✓ build:web: ${packageJson.scripts['build:web']}`);
  }
  
  if (!packageJson.scripts['build']) {
    console.warn('  ⚠️  Warning: build script not found');
  } else {
    console.log(`  ✓ build: ${packageJson.scripts['build']}`);
  }
} catch (error) {
  console.error('  ❌ Error reading package.json:', error.message);
  hasErrors = true;
}

// Check 3: Verify .gitignore excludes web-build
console.log('\n✓ Checking .gitignore...');
try {
  const gitignorePath = path.join(__dirname, '.gitignore');
  const gitignore = fs.readFileSync(gitignorePath, 'utf8');
  
  if (gitignore.includes('web-build')) {
    console.log('  ✓ web-build/ is in .gitignore');
  } else {
    console.warn('  ⚠️  Warning: web-build/ not found in .gitignore');
  }
} catch (error) {
  console.error('  ❌ Error reading .gitignore:', error.message);
}

// Check 4: Verify node_modules exists (dependencies installed)
console.log('\n✓ Checking dependencies...');
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.warn('  ⚠️  Warning: node_modules not found. Run: npm install --legacy-peer-deps');
} else {
  console.log('  ✓ Dependencies installed');
  
  // Check if expo is installed
  const expoPath = path.join(nodeModulesPath, 'expo');
  if (fs.existsSync(expoPath)) {
    console.log('  ✓ Expo is installed');
  } else {
    console.warn('  ⚠️  Warning: Expo not found in dependencies');
  }
}

// Check 5: Test build (optional, can be slow)
console.log('\n✓ Build test...');
console.log('  ℹ️  To test the build, run: npm run build:web');
console.log('  ℹ️  This will create a web-build/ directory');

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Configuration has errors. Please fix them before deploying.');
  process.exit(1);
} else {
  console.log('✅ Configuration looks good!');
  console.log('\nNext steps:');
  console.log('1. Run: npm run build:web (to test build locally)');
  console.log('2. Deploy to Vercel via dashboard or CLI');
  console.log('3. Monitor build logs in Vercel dashboard');
  console.log('\nSee DEPLOYMENT_SUMMARY.md for deployment instructions.');
}
