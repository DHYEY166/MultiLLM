// context.js - session and conversation history

const HISTORY_KEY_PREFIX = 'history::';

export function getOrCreateSessionId(){
  let id = localStorage.getItem('sessionId');
  if (!id){
    id = `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem('sessionId', id);
  }
  return id;
}

export function getHistory(sessionId){
  return JSON.parse(localStorage.getItem(HISTORY_KEY_PREFIX + sessionId) || '[]');
}

export function saveHistory(sessionId, history){
  localStorage.setItem(HISTORY_KEY_PREFIX + sessionId, JSON.stringify(history));
}

export function addMessage(sessionId, role, content){
  const history = getHistory(sessionId);
  history.push({ role, content, ts: Date.now() });
  saveHistory(sessionId, history);
}

export function clearHistory(sessionId){
  localStorage.removeItem(HISTORY_KEY_PREFIX + sessionId);
}


