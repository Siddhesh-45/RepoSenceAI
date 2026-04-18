import madge from 'madge';
import path from 'path';
import fs from 'fs';

/**
 * Run Madge on cloned repository to extract dependency tree
 * Returns raw dependency object: { 'index.js': ['app.js', 'utils.js'] }
 */
export async function analyzeDependencies(clonePath) {
  console.log(`🔍 Analyzing dependencies in ${clonePath}...`);
  
  // Find the best source directory
  const srcDir = findSourceDir(clonePath);
  const targetPath = srcDir || clonePath;
  
  console.log(`📂 Scanning: ${targetPath}`);
  
  try {
    const result = await madge(targetPath, {
      fileExtensions: ['js', 'jsx', 'ts', 'tsx', 'mjs'],
      excludeRegExp: [
        /node_modules/,
        /\.test\./,
        /\.spec\./,
        /__tests__/,
        /\.d\.ts$/,
        /dist\//,
        /build\//,
        /\.min\./
      ],
      detectiveOptions: {
        es6: { mixedImports: true },
        ts: { mixedImports: true }
      }
    });
    
    const deps = result.obj();
    const fileCount = Object.keys(deps).length;
    
    console.log(`✅ Found ${fileCount} files with dependency relationships`);
    console.log(`🔍 Dependency Graph Output:`, JSON.stringify(deps, null, 2));
    
    return deps;
  } catch (error) {
    console.error('⚠️ Madge analysis error:', error.message);
    // Fallback: scan files manually
    return fallbackScan(targetPath);
  }
}

/**
 * Try to find src/ or lib/ directory
 */
function findSourceDir(clonePath) {
  const candidates = ['src', 'lib', 'app', 'source'];
  for (const dir of candidates) {
    const fullPath = path.join(clonePath, dir);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

/**
 * Fallback: scan directory for JS/TS files
 */
function fallbackScan(dirPath) {
  const deps = {};
  const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs'];
  
  function walk(dir, base = '') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') continue;
        
        const fullPath = path.join(dir, entry.name);
        const relativePath = base ? `${base}/${entry.name}` : entry.name;
        
        if (entry.isDirectory()) {
          walk(fullPath, relativePath);
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          // Parse imports from file
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const imports = extractImports(content);
            deps[relativePath] = imports;
          } catch {
            deps[relativePath] = [];
          }
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }
  
  walk(dirPath);
  return deps;
}

/**
 * Simple regex-based import extraction
 */
function extractImports(content) {
  const imports = [];
  const patterns = [
    /import\s+.*from\s+['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const imp = match[1];
      // Only include relative imports
      if (imp.startsWith('.')) {
        imports.push(imp);
      }
    }
  }
  
  return imports;
}
