// taskClassifier.js - enhanced semantic task classification with fuzzy matching

// Levenshtein distance function for string similarity
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  // Initialize first row and column
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

const TASKS = {
  code_generation: ['function', 'class', 'bug', 'error', 'stack trace', 'refactor', 'typescript', 'python', 'javascript', 'java', 'go', 'rust', 'explain code', 'code', 'snippet', 'implementation', 'write code', 'give code'],
  translation: ['translate', 'to english', 'to spanish', 'to french', 'in german'],
  math_reasoning: ['calculate', 'solve', 'what is', 'integral', 'derivative', 'equation', 'sum', 'multiply', 'log', 'probability'],
  summarization: ['summarize', 'tl;dr', 'condense', 'shorten'],
  writing: ['blog', 'essay', 'tweet', 'write', 'story', 'paragraph'],
  analysis: ['analyze', 'explain', 'compare', 'pros and cons', 'advantages', 'disadvantages'],
  web_search: ['current', 'latest', 'news', 'who is', 'when is', 'today', 'stock price'],
  general: [],
};

// Extended semantic word groups for better matching
const SEMANTIC_GROUPS = {
  code_generation: {
    programming_languages: ['python', 'javascript', 'typescript', 'java', 'cpp', 'csharp', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'scala', 'haskell', 'clojure'],
    code_terms: ['function', 'method', 'class', 'object', 'variable', 'array', 'loop', 'condition', 'algorithm', 'api', 'library', 'framework', 'module', 'package'],
    debugging: ['bug', 'error', 'exception', 'debug', 'fix', 'issue', 'problem', 'crash', 'stack', 'trace', 'lint', 'syntax'],
    development: ['build', 'compile', 'deploy', 'test', 'unit', 'integration', 'refactor', 'optimize', 'performance', 'review'],
    related_words: ['program', 'script', 'application', 'software', 'development', 'coding', 'programming', 'developer', 'engineer']
  },
  translation: {
    languages: ['english', 'spanish', 'french', 'german', 'italian', 'portuguese', 'chinese', 'japanese', 'korean', 'arabic', 'russian', 'hindi'],
    actions: ['translate', 'convert', 'transform', 'interpret', 'localize'],
    related_words: ['language', 'linguistic', 'bilingual', 'multilingual', 'communication']
  },
  math_reasoning: {
    operations: ['calculate', 'compute', 'solve', 'evaluate', 'determine', 'find'],
    math_terms: ['equation', 'formula', 'expression', 'function', 'variable', 'constant', 'coefficient'],
    arithmetic: ['add', 'subtract', 'multiply', 'divide', 'sum', 'difference', 'product', 'quotient'],
    advanced: ['integral', 'derivative', 'limit', 'matrix', 'vector', 'probability', 'statistics', 'algebra', 'geometry', 'calculus'],
    related_words: ['mathematical', 'numeric', 'quantitative', 'analytical', 'logical']
  },
  summarization: {
    actions: ['summarize', 'condense', 'shorten', 'compress', 'extract', 'digest'],
    formats: ['summary', 'abstract', 'overview', 'synopsis', 'brief', 'outline'],
    related_words: ['key points', 'main ideas', 'essential', 'important', 'highlight']
  },
  writing: {
    formats: ['blog', 'essay', 'article', 'story', 'poem', 'letter', 'email', 'report', 'proposal', 'tweet', 'post'],
    actions: ['write', 'compose', 'draft', 'create', 'author', 'craft'],
    elements: ['paragraph', 'sentence', 'introduction', 'conclusion', 'content', 'narrative'],
    related_words: ['creative', 'literary', 'editorial', 'journalism', 'copywriting']
  },
  analysis: {
    actions: ['analyze', 'examine', 'evaluate', 'assess', 'review', 'compare', 'contrast'],
    types: ['comparison', 'evaluation', 'assessment', 'critique', 'investigation'],
    aspects: ['pros', 'cons', 'advantages', 'disadvantages', 'benefits', 'drawbacks'],
    related_words: ['analytical', 'critical', 'systematic', 'thorough', 'detailed']
  },
  web_search: {
    temporal: ['current', 'latest', 'recent', 'today', 'now', 'live', 'real-time'],
    information: ['news', 'update', 'information', 'data', 'facts'],
    queries: ['who is', 'what is', 'when is', 'where is', 'how much', 'stock price'],
    related_words: ['search', 'lookup', 'find', 'research', 'investigate']
  }
};

// Simple fast similarity check (faster than Levenshtein)
function fastSimilarity(str1, str2) {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;
  
  // Quick substring check
  if (str1.includes(str2) || str2.includes(str1)) {
    return 0.8;
  }
  
  // Character overlap ratio (much faster than edit distance)
  const set1 = new Set(str1.toLowerCase());
  const set2 = new Set(str2.toLowerCase());
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

// Calculate similarity score between two strings
function calculateSimilarity(word1, word2) {
  if (word1 === word2) return 1.0;
  
  const longer = word1.length > word2.length ? word1 : word2;
  const shorter = word1.length > word2.length ? word2 : word1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

// Check if word is similar to any in a list
function findBestMatch(word, wordList, threshold = 0.7) {
  let bestScore = 0;
  let bestMatch = null;
  
  for (const listWord of wordList) {
    // Exact match
    if (word === listWord || word.includes(listWord) || listWord.includes(word)) {
      return { word: listWord, score: 1.0 };
    }
    
    // Fuzzy match
    const similarity = calculateSimilarity(word, listWord);
    if (similarity > bestScore && similarity >= threshold) {
      bestScore = similarity;
      bestMatch = listWord;
    }
  }
  
  return bestMatch ? { word: bestMatch, score: bestScore } : null;
}

// Enhanced semantic classification with context analysis
function classifyTaskEnhanced(query) {
  const text = (query || '').toLowerCase();
  const words = text.split(/\s+/).filter(word => word.length > 2);
  
  let taskScores = {};
  
  // Initialize scores
  for (const task of Object.keys(TASKS)) {
    taskScores[task] = 0;
  }
  
  // 1. Original keyword matching (high weight)
  for (const [task, keywords] of Object.entries(TASKS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        taskScores[task] += keyword.length >= 6 ? 3 : 2;
      }
    }
  }
  
  // 2. Semantic group matching (medium weight)
  for (const [task, groups] of Object.entries(SEMANTIC_GROUPS)) {
    for (const [groupName, groupWords] of Object.entries(groups)) {
      for (const word of words) {
        const match = findBestMatch(word, groupWords, 0.7);
        if (match) {
          taskScores[task] += match.score * 1.5;
        }
      }
    }
  }
  
  // 3. Contextual pattern recognition (medium weight)
  const patterns = {
    code_generation: [
      /\b(how to|create|build|make)\s+(function|class|method|app|script|program)\b/i,
      /\b(fix|debug|solve)\s+(error|bug|issue|problem)\b/i,
      /\b(write|create|generate)\s+(code|script|program)\b/i,
      /\w+\.(js|py|java|cpp|html|css|php|rb|go|rs)\b/i,
      /\b(import|require|include|using)\s+\w+/i,
      /\b(def|function|class|var|let|const)\s+\w+/i
    ],
    translation: [
      /\b(translate|convert|change)\s+(this|it|text)?\s+(to|into|in)\s+\w+/i,
      /\b(in|to)\s+(english|spanish|french|german|chinese|japanese)\b/i,
      /\b(what does|meaning of)\s+.+\s+(in|mean in)\s+\w+/i
    ],
    math_reasoning: [
      /\b(what is|calculate|solve|find)\s+\d+[\+\-\*\/\^]\d+/i,
      /\b(equation|formula|expression)\b/i,
      /\b\d+[\+\-\*\/\^%]\d+/i,
      /\b(integral|derivative|limit|sum)\s+of\b/i,
      /\b(probability|statistics|mean|median|mode)\b/i
    ],
    summarization: [
      /\b(summarize|sum up|give me a summary|tl;dr|in brief)\b/i,
      /\b(key points|main ideas|important parts)\b/i,
      /\b(condense|shorten|brief)\s+(this|the)\b/i
    ],
    writing: [
      /\b(write|create|compose|draft)\s+(a|an)?\s+(blog|essay|story|article|post|letter|email)\b/i,
      /\b(help me write|need to write|writing)\b/i,
      /\b(creative writing|content creation|copywriting)\b/i
    ],
    analysis: [
      /\b(analyze|examine|evaluate|assess|compare)\s+(this|the|these)\b/i,
      /\b(pros and cons|advantages and disadvantages|compare|comparison)\b/i,
      /\b(what are the|give me the)\s+(benefits|drawbacks|differences)\b/i
    ],
    web_search: [
      /\b(what is the (current|latest)|who is|when is|where is)\b/i,
      /\b(today's|current|latest|recent)\s+(news|price|information|update)\b/i,
      /\b(stock price|market cap|real-time|live data)\b/i
    ]
  };
  
  for (const [task, patternList] of Object.entries(patterns)) {
    for (const pattern of patternList) {
      if (pattern.test(text)) {
        taskScores[task] += 2;
      }
    }
  }
  
  // 4. Intent-based scoring (low weight but broad coverage)
  const intentKeywords = {
    code_generation: ['create', 'build', 'make', 'develop', 'implement', 'code', 'program', 'script'],
    translation: ['translate', 'convert', 'transform', 'language', 'say', 'mean'],
    math_reasoning: ['calculate', 'compute', 'solve', 'math', 'number', 'formula'],
    summarization: ['summarize', 'brief', 'short', 'summary', 'key', 'main'],
    writing: ['write', 'compose', 'create', 'draft', 'content', 'text'],
    analysis: ['analyze', 'compare', 'evaluate', 'examine', 'study', 'review'],
    web_search: ['current', 'latest', 'now', 'today', 'recent', 'who', 'when', 'what']
  };
  
  for (const [task, intentWords] of Object.entries(intentKeywords)) {
    for (const word of words) {
      for (const intentWord of intentWords) {
        const similarity = calculateSimilarity(word, intentWord);
        if (similarity >= 0.6) {
          taskScores[task] += similarity * 0.5;
        }
      }
    }
  }
  
  // 5. Fallback classification based on query characteristics
  if (Math.max(...Object.values(taskScores)) === 0) {
    // No matches found, use heuristics
    if (/\?\s*$/.test(text) && (text.includes('what') || text.includes('how') || text.includes('why'))) {
      taskScores['analysis'] += 1;
    } else if (text.length > 200) {
      taskScores['analysis'] += 1;
    } else if (/\d+[\+\-\*\/]/.test(text)) {
      taskScores['math_reasoning'] += 1;
    } else if (text.includes('create') || text.includes('make') || text.includes('build')) {
      taskScores['code_generation'] += 1;
    } else {
      taskScores['general'] += 1;
    }
  }
  
  // Find best task
  let bestTask = 'general';
  let bestScore = 0;
  
  for (const [task, score] of Object.entries(taskScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestTask = task;
    }
  }
  
  // Calculate confidence based on score and query characteristics
  const maxPossibleScore = 10; // Estimated max score for normalization
  const baseConfidence = Math.min(0.95, Math.max(0.3, bestScore / maxPossibleScore));
  
  // Boost confidence if multiple indicators point to same task
  const secondBestScore = Math.max(...Object.values(taskScores).filter(score => score !== bestScore));
  const scoreGap = bestScore - secondBestScore;
  const confidenceBoost = Math.min(0.2, scoreGap * 0.05);
  
  const confidence = Math.min(0.95, baseConfidence + confidenceBoost);
  
  // Determine complexity
  const complexity = text.length > 240 || /\n{2,}/.test(text) ? 'high' : 
                    text.length > 120 || words.length > 20 ? 'medium' : 'low';

  return { 
    task: bestTask, 
    confidence, 
    complexity,
    scores: taskScores, // For debugging
    debug: {
      bestScore,
      secondBestScore,
      scoreGap,
      wordCount: words.length
    }
  };
}

// Enhanced task mapping for fast model selection
function mapToOptimalTask(classificationResult, query) {
  const { task, complexity } = classificationResult;
  const queryLength = query.length;
  
  // Map to speed-optimized task categories
  if (task === 'math_reasoning' && complexity === 'low') {
    return 'simple_math';
  }
  
  if (task === 'code_generation') {
    if (complexity === 'low' || queryLength < 100 || /simple|basic|hello|quick/.test(query.toLowerCase())) {
      return 'simple_code';
    }
    return task; // Keep as code_generation for complex code
  }
  
  if (complexity === 'low' && queryLength < 80) {
    return 'quick_question';
  }
  
  // Return original task for complex requests
  return task;
}

export function classifyTask(query) {
  const result = classifyTaskEnhanced(query);
  const optimizedTask = mapToOptimalTask(result, query);
  
  return {
    ...result,
    task: optimizedTask,
    originalTask: result.task  // Keep original for debugging
  };
}


