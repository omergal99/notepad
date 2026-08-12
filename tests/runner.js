#!/usr/bin/env node

/**
 * LIGHTWEIGHT TEST RUNNER
 * For Notepad Online - Runs in Node.js or browser
 * 
 * Usage: node runner.js [testFile.js]
 *        npm test
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// TEST FRAMEWORK
// ============================================================================

class TestRunner {
  constructor() {
    this.suites = [];
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.skippedTests = 0;
    this.startTime = Date.now();
  }

  // Describe a test suite
  describe(name, fn) {
    const suite = {
      name,
      tests: [],
      fn
    };
    this.suites.push(suite);

    // Capture test registrations
    const originalTest = global.test;
    const originalIt = global.it;
    const originalSkip = global.skip;

    global.test = (testName, testFn) => {
      suite.tests.push({ name: testName, fn: testFn, skip: false });
      this.totalTests++;
    };
    global.it = global.test;
    global.skip = (testName, testFn) => {
      suite.tests.push({ name: testName, fn: testFn, skip: true });
      this.totalTests++;
      this.skippedTests++;
    };

    // Run suite function to register tests
    try {
      fn();
    } catch (error) {
      console.error(`❌ Error in suite "${name}":`, error);
    }

    // Restore originals
    global.test = originalTest;
    global.it = originalIt;
    global.skip = originalSkip;
  }

  // Run all tests
  async run() {
    console.log('\n🧪 TEST RUNNER - Notepad Online\n');

    for (const suite of this.suites) {
      console.log(`📋 ${suite.name}`);

      for (const test of suite.tests) {
        if (test.skip) {
          console.log(`  ⊘ ${test.name} (skipped)`);
          continue;
        }

        try {
          // Run test with timeout
          await Promise.race([
            test.fn(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Test timeout (5s)')), 5000)
            )
          ]);

          console.log(`  ✅ ${test.name}`);
          this.passedTests++;
        } catch (error) {
          console.log(`  ❌ ${test.name}`);
          console.log(`     Error: ${error.message}`);
          this.failedTests++;
        }
      }

      console.log('');
    }

    // Print summary
    this.printSummary();
  }

  printSummary() {
    const elapsed = Date.now() - this.startTime;
    const percentage = this.totalTests > 0 
      ? Math.round((this.passedTests / this.totalTests) * 100)
      : 0;

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Tests:    ${this.totalTests}`);
    console.log(`Passed:         ${this.passedTests} ✅`);
    console.log(`Failed:         ${this.failedTests} ❌`);
    console.log(`Skipped:        ${this.skippedTests} ⊘`);
    console.log(`Success Rate:   ${percentage}%`);
    console.log(`Duration:       ${elapsed}ms`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Exit with appropriate code
    process.exit(this.failedTests > 0 ? 1 : 0);
  }
}

// ============================================================================
// ASSERTION LIBRARY
// ============================================================================

global.assert = {
  equal: (actual, expected, message) => {
    if (actual !== expected) {
      throw new Error(
        message || `Expected ${expected} but got ${actual}`
      );
    }
  },

  strictEqual: (actual, expected, message) => {
    if (actual !== expected || typeof actual !== typeof expected) {
      throw new Error(
        message || `Expected ${expected} (${typeof expected}) but got ${actual} (${typeof actual})`
      );
    }
  },

  deepEqual: (actual, expected, message) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(
        message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`
      );
    }
  },

  ok: (value, message) => {
    if (!value) {
      throw new Error(message || `Expected truthy value but got ${value}`);
    }
  },

  notOk: (value, message) => {
    if (value) {
      throw new Error(message || `Expected falsy value but got ${value}`);
    }
  },

  throws: (fn, message) => {
    try {
      fn();
      throw new Error(message || 'Expected function to throw');
    } catch (error) {
      // Expected
    }
  },

  isArray: (value, message) => {
    if (!Array.isArray(value)) {
      throw new Error(message || `Expected array but got ${typeof value}`);
    }
  },

  isObject: (value, message) => {
    if (typeof value !== 'object' || value === null) {
      throw new Error(message || `Expected object but got ${typeof value}`);
    }
  },

  isString: (value, message) => {
    if (typeof value !== 'string') {
      throw new Error(message || `Expected string but got ${typeof value}`);
    }
  },

  isNumber: (value, message) => {
    if (typeof value !== 'number') {
      throw new Error(message || `Expected number but got ${typeof value}`);
    }
  },

  isUndefined: (value, message) => {
    if (value !== undefined) {
      throw new Error(message || `Expected undefined but got ${value}`);
    }
  },

  isNull: (value, message) => {
    if (value !== null) {
      throw new Error(message || `Expected null but got ${value}`);
    }
  }
};

// ============================================================================
// GLOBAL TEST FUNCTIONS
// ============================================================================

const runner = new TestRunner();
global.describe = (name, fn) => runner.describe(name, fn);
global.test = (name, fn) => console.warn('test() called outside describe()');
global.it = (name, fn) => console.warn('it() called outside describe()');
global.skip = (name, fn) => console.warn('skip() called outside describe()');

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const testFile = process.argv[2] || './tests/storage.test.js';
  const absolutePath = path.resolve(testFile);

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Test file not found: ${absolutePath}`);
    process.exit(1);
  }

  try {
    // Load and run test file
    console.log(`📂 Loading: ${testFile}\n`);
    await import(`file://${absolutePath}`);

    // Run tests
    await runner.run();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Uncaught error:', error);
    process.exit(1);
  });
}
