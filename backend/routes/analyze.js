import express from 'express';
import { fetchRepo } from '../modules/repoFetcher.js';
import { analyzeDependencies } from '../modules/dependencyAnalyzer.js';
import { classifyAllFiles } from '../modules/fileClassifier.js';
import { scoreImpact } from '../modules/impactScorer.js';
import { generateSummaries } from '../modules/aiSummarizer.js';
import { buildOnboardingPath } from '../modules/onboardingPath.js';
import { searchNodes } from '../modules/queryEngine.js';
import { buildGraph } from '../modules/graphBuilder.js';
import { cleanup } from '../utils/cleanup.js';

const router = express.Router();

/**
 * POST /api/analyze
 * Body: { repoUrl: "https://github.com/user/repo" }
 */
router.post('/analyze', async (req, res) => {
  const { repoUrl } = req.body;
  
  if (!repoUrl) {
    return res.status(400).json({ error: 'repoUrl is required' });
  }
  
  let clonePath = null;
  
  try {
    // Step 1: Clone repository
    console.log('\n🚀 Starting analysis pipeline...');
    const repoInfo = await fetchRepo(repoUrl);
    clonePath = repoInfo.clonePath;
    
    // Step 2: Analyze dependencies
    const deps = await analyzeDependencies(clonePath);
    
    if (Object.keys(deps).length === 0) {
      cleanup(clonePath);
      return res.status(400).json({ error: 'No JavaScript/TypeScript files found in repository' });
    }
    
    // Step 3: Classify files
    const classifications = classifyAllFiles(deps);
    
    // Step 4: Score impact
    const scores = scoreImpact(deps);
    
    // Step 5: Generate AI summaries
    const summaries = await generateSummaries(deps, clonePath, classifications, scores);
    
    // Step 6: Build onboarding path
    const onboardingPath = buildOnboardingPath(deps, classifications);
    
    // Step 7: Assemble graph
    const graphData = buildGraph(deps, classifications, scores, summaries, onboardingPath);
    
    // Add repo info to response
    graphData.repoInfo = {
      name: repoInfo.fullName,
      url: repoUrl,
      analyzedAt: new Date().toISOString()
    };
    
    console.log(`✅ Analysis complete! ${graphData.metrics.totalFiles} files, ${graphData.metrics.totalEdges} edges`);
    
    // Step 8: Cleanup
    cleanup(clonePath);
    
    return res.json(graphData);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    
    // Cleanup on error
    if (clonePath) cleanup(clonePath);
    
    return res.status(500).json({ 
      error: 'Analysis failed', 
      message: error.message 
    });
  }
});

/**
 * POST /api/search
 * Body: { query: "search term", nodes: [...] }
 */
router.post('/search', (req, res) => {
  const { query, nodes } = req.body;
  
  if (!query || !nodes) {
    return res.status(400).json({ error: 'query and nodes are required' });
  }
  
  const results = searchNodes(query, nodes);
  return res.json({ results });
});

export default router;
