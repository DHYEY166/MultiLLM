// prefs.js - user preferences stored locally

const PREFS_KEY = 'prefs::settings';

const DEFAULT_PREFS = {
  codeFirstFormatting: true,
  concise: true,
  markdown: true,
  avoidEmojis: true,
  allowWebAccess: false,
  fullAnswerDefault: false,
};

export function getPrefs(){
  try {
    const data = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
    return { ...DEFAULT_PREFS, ...(data || {}) };
  } catch (_e){
    return { ...DEFAULT_PREFS };
  }
}

export function setPrefs(next){
  const merged = { ...getPrefs(), ...(next || {}) };
  localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
  return merged;
}


