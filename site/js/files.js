// files.js - local-only knowledge base with simple retrieval

const KB_INDEX_KEY = 'kb::files';

function getIndex(){
  return JSON.parse(localStorage.getItem(KB_INDEX_KEY) || '[]');
}

function setIndex(index){
  localStorage.setItem(KB_INDEX_KEY, JSON.stringify(index));
}

function chunkText(text, chunkSize=1200, overlap=120){
  const out = [];
  let i = 0;
  const len = text.length;
  if (len === 0) return out;
  while (i < len){
    const end = Math.min(len, i + chunkSize);
    out.push(text.slice(i, end));
    if (end === len) break; // prevent infinite loop on small texts
    const next = end - overlap;
    i = next > i ? next : end; // always move forward at least to end
  }
  return out;
}

export async function importFileBlob(file){
  const name = file.name || 'untitled.txt';
  const type = file.type || 'text/plain';
  const text = await file.text();
  return saveFile(name, type, text);
}

export function saveFile(name, type, text){
  const id = `f_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const chunks = chunkText(text);
  const meta = { id, name, type, size: text.length, createdAt: Date.now(), numChunks: chunks.length };
  const idx = getIndex();
  idx.push(meta);
  setIndex(idx);
  for (let i=0;i<chunks.length;i++){
    localStorage.setItem(`kb::chunk::${id}::${i}`, JSON.stringify({ fileId: id, fileName: name, i, text: chunks[i] }));
  }
  return meta;
}

export function listFiles(){
  return getIndex();
}

export function getFileText(fileId){
  const meta = getIndex().find(f=>f.id===fileId);
  if (!meta) return '';
  let text = '';
  for (let i=0;i<meta.numChunks;i++){
    const raw = localStorage.getItem(`kb::chunk::${fileId}::${i}`);
    if (!raw) continue;
    try{ const ch = JSON.parse(raw); text += ch.text; }catch(_e){/* ignore */}
  }
  return text;
}

export function replaceFileText(fileId, name, type, newText){
  const idx = getIndex();
  const metaIdx = idx.findIndex(f=>f.id===fileId);
  if (metaIdx === -1) return null;
  // delete old chunks
  const old = idx[metaIdx];
  for (let i=0;i<old.numChunks;i++){
    localStorage.removeItem(`kb::chunk::${fileId}::${i}`);
  }
  const chunks = chunkText(newText);
  const updated = { id: fileId, name, type, size: newText.length, createdAt: old.createdAt, numChunks: chunks.length };
  idx[metaIdx] = updated;
  setIndex(idx);
  for (let i=0;i<chunks.length;i++){
    localStorage.setItem(`kb::chunk::${fileId}::${i}`, JSON.stringify({ fileId, fileName: name, i, text: chunks[i] }));
  }
  return updated;
}

export function deleteFile(fileId){
  const idx = getIndex().filter(f=>f.id !== fileId);
  // remove chunks
  const old = getIndex().find(f=>f.id===fileId);
  if (old){
    for (let i=0;i<old.numChunks;i++){
      localStorage.removeItem(`kb::chunk::${fileId}::${i}`);
    }
  }
  setIndex(idx);
}

export function getAllChunks(){
  const files = getIndex();
  const out = [];
  for (const f of files){
    for (let i=0;i<f.numChunks;i++){
      const raw = localStorage.getItem(`kb::chunk::${f.id}::${i}`);
      if (!raw) continue;
      try{
        out.push(JSON.parse(raw));
      }catch(_e){/* ignore */}
    }
  }
  return out;
}

function tokenize(text){
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function searchChunks(query, topK=5){
  const qTokens = tokenize(query);
  if (!qTokens.length) return [];
  const chunks = getAllChunks();
  const scored = chunks.map(ch => {
    const t = tokenize(ch.text);
    let score = 0;
    for (const qt of qTokens){
      // simple tf score
      score += t.reduce((acc, w)=> acc + (w === qt ? 1 : 0), 0);
    }
    // preference for shorter chunks that match
    score = score / Math.sqrt(Math.max(40, t.length));
    return { ...ch, score };
  }).filter(x => x.score > 0);

  scored.sort((a,b)=> b.score - a.score);
  return scored.slice(0, topK);
}


