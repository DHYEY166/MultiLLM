// modelRouter.js - select the best model based on task and simple performance memory

const MODEL_PREFERENCES = {
  // Ultra-fast models for simple tasks
  simple_math: 'llama3.2:1b',          // Fastest for basic math
  simple_code: 'deepseek-coder:1.3b',  // Ultra-fast for simple coding
  quick_question: 'llama3.2:1b',       // Fastest for simple Q&A
  
  // Fast models for moderate complexity  
  code_generation: 'deepseek-coder:1.3b', // Much faster than codellama:7b
  translation: 'llama3.2:1b',             // Fast and accurate
  math_reasoning: 'phi3:mini',            // Good at reasoning
  writing: 'phi3:mini',                   // Balanced for writing
  general: 'llama3.2:1b',                 // Default fast model
  
  // Quality models for complex tasks
  analysis: 'llama3.1:8b',               // Best for deep analysis
  complex_code: 'llama3.2:3b',           // For complex programming
  summarization: 'llama3.2:3b',          // Reliable summarization
  web_search: 'llama3.2:3b',             // Current working model
};

function getPerfKey(task, model){
  return `perf::${task}::${model}`;
}

export function recordLatency(task, model, ms){
  const key = getPerfKey(task, model);
  const prev = JSON.parse(localStorage.getItem(key) || 'null');
  const next = prev ? { count: prev.count + 1, avg: (prev.avg * prev.count + ms) / (prev.count + 1) } : { count: 1, avg: ms };
  localStorage.setItem(key, JSON.stringify(next));
}

export function selectBestModel(task){
  // Updated candidate list with new fast models, prioritizing speed
  const candidates = [
    MODEL_PREFERENCES[task] || MODEL_PREFERENCES.general,
    'llama3.2:1b',           // Ultra-fast for most tasks
    'deepseek-coder:1.3b',   // Ultra-fast for coding
    'phi3:mini',             // Fast balanced model
    'llama3.2:3b',          // Reliable fallback
    'llama3.1:8b',          // Quality but slower
  ];
  
  // Pick the model with the lowest observed average latency, default to the first
  let best = candidates[0];
  let bestAvg = Infinity;
  for(const model of candidates){
    const perf = JSON.parse(localStorage.getItem(getPerfKey(task, model)) || 'null');
    if (perf && perf.avg < bestAvg) { best = model; bestAvg = perf.avg; }
  }
  return { primary: best, alternatives: candidates.filter(m=>m!==best) };
}


