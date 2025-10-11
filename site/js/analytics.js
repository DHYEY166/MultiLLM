// analytics.js - localStorage-based analytics

const STATS_KEY = 'stats::summary';

export function recordQueryStats({ task, model, latencyMs, success }){
  const stats = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
  stats.totalQueries = (stats.totalQueries || 0) + 1;
  stats.successes = (stats.successes || 0) + (success ? 1 : 0);

  stats.byTask = stats.byTask || {};
  stats.byTask[task] = (stats.byTask[task] || 0) + 1;

  stats.byModel = stats.byModel || {};
  stats.byModel[model] = stats.byModel[model] || { count: 0, avg: 0 };
  const modelRec = stats.byModel[model];
  modelRec.avg = (modelRec.avg * modelRec.count + latencyMs) / (modelRec.count + 1);
  modelRec.count += 1;

  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function getStats(){
  return JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
}

export function resetStats(){
  localStorage.removeItem(STATS_KEY);
}


