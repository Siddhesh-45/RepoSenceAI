import madge from 'madge';
import path from 'path';

/**
 * Minimal script to analyze a folder with Madge
 * Run with: node test-madge.js <folder_path>
 */
async function runAnalysis() {
  // Take folder path from CLI args, default to current directory
  const targetFolder = process.argv[2] || '.';
  const absolutePath = path.resolve(targetFolder);

  console.log(`\n🔍 Analyzing folder: ${absolutePath}\n`);

  try {
    // 1. Run Madge analysis
    const result = await madge(absolutePath, {
      fileExtensions: ['js', 'jsx', 'ts', 'tsx', 'mjs'],
      excludeRegExp: [/node_modules/, /dist/, /build/]
    });

    // 2. Extract data
    const rawDependencies = result.obj();
    const files = Object.keys(rawDependencies);
    const circularDeps = result.circular();

    // 3. Print Outputs
    console.log('📦 1. RAW DEPENDENCY OBJECT:');
    console.log(JSON.stringify(rawDependencies, null, 2));

    console.log('\n📄 2. LIST OF FILES:');
    files.forEach((file, idx) => {
      console.log(`  ${idx + 1}. ${file}`);
    });

    console.log('\n🔄 3. CIRCULAR DEPENDENCIES:');
    if (circularDeps.length > 0) {
      console.warn('  ⚠️ Found circular dependencies:');
      circularDeps.forEach((cycle, idx) => {
        console.warn(`  Cycle ${idx + 1}: ${cycle.join(' -> ')}`);
      });
    } else {
      console.log('  ✅ No circular dependencies found!');
    }

  } catch (error) {
    console.error(`\n❌ Error analyzing dependencies:`, error.message);
  }
}

runAnalysis();
