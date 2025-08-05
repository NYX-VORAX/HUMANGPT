#!/usr/bin/env node

console.log('🔍 Debug Build Script Started');
console.log('================================');

// Check Node.js version
console.log('📊 Environment Info:');
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);

// Check environment variables
console.log('\n🔧 Environment Variables:');
const importantEnvVars = [
  'NODE_ENV',
  'NETLIFY',
  'NETLIFY_DEV',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'NEXT_TELEMETRY_DISABLED'
];

importantEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    if (envVar.includes('PRIVATE_KEY')) {
      console.log(`${envVar}: [REDACTED - ${value.length} characters]`);
    } else if (envVar.includes('EMAIL')) {
      console.log(`${envVar}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`${envVar}: ${value}`);
    }
  } else {
    console.log(`${envVar}: [NOT SET]`);
  }
});

// Check if Firebase variables are properly configured
console.log('\n🔥 Firebase Configuration Check:');
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!firebaseProjectId) {
  console.log('❌ FIREBASE_PROJECT_ID is missing');
} else {
  console.log('✅ FIREBASE_PROJECT_ID is configured');
}

if (!firebaseClientEmail) {
  console.log('❌ FIREBASE_CLIENT_EMAIL is missing');
} else if (!firebaseClientEmail.includes('@') || !firebaseClientEmail.includes('.iam.gserviceaccount.com')) {
  console.log('❌ FIREBASE_CLIENT_EMAIL format is invalid');
} else {
  console.log('✅ FIREBASE_CLIENT_EMAIL is configured');
}

if (!firebasePrivateKey) {
  console.log('❌ FIREBASE_PRIVATE_KEY is missing');
} else if (!firebasePrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
  console.log('❌ FIREBASE_PRIVATE_KEY format is invalid');
} else {
  console.log('✅ FIREBASE_PRIVATE_KEY is configured');
}

// Check if critical files exist
console.log('\n📁 File System Check:');
const fs = require('fs');
const path = require('path');

const criticalFiles = [
  'package.json',
  'next.config.js',
  'app/layout.tsx',
  'app/page.tsx',
  'lib/firebaseAdmin.ts'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(path.join(process.cwd(), file))) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Test Firebase Admin import
console.log('\n🧪 Firebase Admin Test:');
try {
  // Try different possible paths for the Firebase Admin module
  let firebaseAdmin;
  const possiblePaths = [
    '../lib/firebaseAdmin',
    '../lib/firebaseAdmin.ts',
    './lib/firebaseAdmin',
    './lib/firebaseAdmin.ts',
    process.cwd() + '/lib/firebaseAdmin.ts',
    process.cwd() + '/lib/firebaseAdmin.js'
  ];
  
  let moduleLoaded = false;
  for (const modulePath of possiblePaths) {
    try {
      firebaseAdmin = require(modulePath);
      console.log(`✅ Firebase Admin module loaded from: ${modulePath}`);
      moduleLoaded = true;
      break;
    } catch (err) {
      // Continue trying other paths
    }
  }
  
  if (!moduleLoaded) {
    throw new Error('Could not find Firebase Admin module in any expected location');
  }
  
  // Test configuration without initializing
  if (firebaseProjectId && firebaseClientEmail && firebasePrivateKey) {
    console.log('✅ Firebase credentials appear to be available');
  } else {
    console.log('❌ Firebase credentials are incomplete');
  }
} catch (error) {
  console.log('❌ Firebase Admin module failed to load:', error.message);
  
  // Additional file system check for troubleshooting
  const fs = require('fs');
  const path = require('path');
  
  console.log('\n🔍 Troubleshooting file paths:');
  const libDir = path.join(process.cwd(), 'lib');
  
  if (fs.existsSync(libDir)) {
    console.log('✅ lib directory exists');
    const files = fs.readdirSync(libDir);
    console.log('📁 Files in lib directory:', files.join(', '));
  } else {
    console.log('❌ lib directory does not exist');
  }
  
  console.log('📍 Current working directory:', process.cwd());
  console.log('📍 Script location:', __dirname);
}

console.log('\n🏁 Debug Build Script Completed');
console.log('================================');
