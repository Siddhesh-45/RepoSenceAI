import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

let openai = null;
const summaryCache = new Map(); // Simple in-memory cache

function getClient() {
  if (!openai && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

/**
 * Generate AI summaries for each file
 * Runs in batches of 5 to avoid rate limits
 */
export async function generateSummaries(deps, clonePath, classifications, scores = {}) {
  const client = getClient();
  const allFiles = Object.keys(deps);
  const summaries = {};
  
  if (!client) {
    console.log('⚠️ OpenAI API key not set — using smart fallback summaries');
    for (const file of allFiles) {
      summaries[file] = generateFallbackSummary(file, deps[file], classifications[file]);
    }
    return summaries;
  }
  
  // Sort files by impact to only take the top 30 most important files
  const sortedFiles = [...allFiles].sort((a, b) => {
    const scoreA = scores[a]?.impact || 0;
    const scoreB = scores[b]?.impact || 0;
    return scoreB - scoreA;
  });
  
  const filesToSummarize = sortedFiles.slice(0, 30);
  
  // Immediately flag files outside the top 30
  for (const file of allFiles) {
    if (!filesToSummarize.includes(file)) {
      summaries[file] = "Summary not available (not prioritized)";
    }
  }

  console.log(`🤖 Generating AI summaries for top ${filesToSummarize.length} files...`);
  
  // Process in batches of 5
  for (let i = 0; i < filesToSummarize.length; i += 5) {
    const batch = filesToSummarize.slice(i, i + 5);
    const batchPromises = batch.map(file => summarizeFile(client, file, deps[file], clonePath));
    
    const results = await Promise.allSettled(batchPromises);
    
    results.forEach((result, idx) => {
      const file = batch[idx];
      if (result.status === 'fulfilled') {
        summaries[file] = result.value;
      } else {
        console.error(`⚠️ OpenAI API Error on ${file}:`, result.reason?.message || result.reason);
        summaries[file] = "Summary not available";
      }
    });
    
    console.log(`  📝 Batch ${Math.floor(i / 5) + 1}/${Math.ceil(filesToSummarize.length / 5)} complete`);
    
    // Small delay between batches
    if (i + 5 < filesToSummarize.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return summaries;
}

/**
 * Summarize a single file using OpenAI
 */
async function summarizeFile(client, filename, deps, clonePath) {
  let content = '';
  let snippet = '';
  
  try {
    const filePath = path.join(clonePath, filename);
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf-8');
      
      // Check if file is huge (> 1000 lines) and skip it
      const lines = content.split('\n');
      if (lines.length > 1000) {
         console.log(`⏭️  Skipping large file ${filename} (${lines.length} lines)`);
         return "Summary not available (File too large)";
      }
      
      snippet = lines.slice(0, 100).join('\n'); // Give ChatGPT a decent chunk
    }
  } catch {
    snippet = '(unable to read)';
  }
  
  // Check memory cache based on filename + snippet length
  const cacheKey = `${filename}-${snippet.length}`;
  if (summaryCache.has(cacheKey)) {
    return summaryCache.get(cacheKey);
  }
  
  const response = await client.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'user',
      content: `Explain the purpose of this code file in simple terms.
Describe what it does, its role in the application, and key responsibilities.

File Name: ${filename}
Code:
${snippet}

Keep the explanation short, clear, and beginner-friendly.`
    }],
    max_tokens: 150,
    temperature: 0.3
  });
  
  const result = response.choices[0].message.content.trim();
  
  // Save to cache before returning
  summaryCache.set(cacheKey, result);
  
  return result;
}

/**
 * Smart fallback summary when OpenAI is not available
 */
function generateFallbackSummary(filename, deps, type) {
  const basename = filename.split('/').pop().replace(/\.\w+$/, '');
  const depCount = deps.length;
  
  const typeDescriptions = {
    entry: `System Entrypoint:`,
    core: `Core Architecture:`,
    util: `Utility Collection:`,
    config: `Configuration Setup:`
  };
  
  let summary = `${typeDescriptions[type] || 'Module:'} This file specifically manages the '${basename}' functionality within the system.`;
  
  if (depCount > 0) {
    summary += ` It orchestrates logic by interacting with ${depCount} other component${depCount > 1 ? 's' : ''} (e.g., ${deps.slice(0, 2).map(d => d.split('/').pop()).join(', ')}).`;
  } else {
    summary += ` This is a standalone leaf module that executes independently.`;
  }
  
  // Add context based on filename
  if (basename.toLowerCase().includes('route')) {
    summary += ` It acts as a routing controller for endpoints.`;
  } else if (basename.toLowerCase().includes('middleware')) {
    summary += ` It intercepts and processes traffic in the request pipeline.`;
  } else if (basename.toLowerCase().includes('model')) {
    summary += ` It defines structural data constraints and database interactions.`;
  } else if (basename.toLowerCase().includes('analyzer')) {
    summary += ` It analyzes and parses data logic dynamically.`;
  } else if (basename.toLowerCase().includes('helper')) {
    summary += ` It provides shared helper abstractions.`;
  } else if (basename.toLowerCase().includes('app') || basename.toLowerCase().includes('main')) {
    summary += ` It is an essential root-level orchestrator.`;
  }
  
  return summary;
}
