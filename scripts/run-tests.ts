#!/usr/bin/env bun

// Simple test runner to run database tests individually to avoid singleton issues
import { spawn } from 'bun';

const testFiles = [
  'backend/services/__tests__/database.test.ts',
  'backend/services/__tests__/repository.test.ts'
];

console.log('Running database tests individually...\n');

let allPassed = true;

for (const testFile of testFiles) {
  console.log(`Running ${testFile}...`);
  
  const result = spawn(['bun', 'test', testFile, '--run'], {
    stdio: ['inherit', 'inherit', 'inherit']
  });
  
  const exitCode = await result.exited;
  
  if (exitCode !== 0) {
    allPassed = false;
    console.log(`❌ ${testFile} failed with exit code ${exitCode}\n`);
  } else {
    console.log(`✅ ${testFile} passed\n`);
  }
}

if (allPassed) {
  console.log('🎉 All database tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed');
  process.exit(1);
}