// llm.js - Browser-side Ollama client with streaming support

// Configuration - Use absolute URLs for HTTPS to avoid browser issues
const OLLAMA_HOST = window.location.protocol === 'https:' ? 
  `${window.location.origin}/api` : 
  'http://localhost:11434';
const OLLAMA_BASE_URL = window.location.protocol === 'https:' ? 
  `${window.location.origin}/api` : 
  'http://localhost:11434';

/**
 * Streams chat responses from Ollama's /api/chat endpoint.
 * onToken is called for each incremental token.
 */
export async function streamChatResponse(modelName, messages, onToken, onDone, onError, options = {}) {
  const url = window.location.protocol === 'https:' ? 
    `${window.location.origin}/api/chat` : 
    'http://localhost:11434/api/chat';
    
  
  const body = {
    model: modelName,
    messages,
    stream: true,
  };

  // Create timeout controller (60 seconds for dataset queries)
  const controller = options.signal ? new AbortController() : new AbortController();
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }
  
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 120000); // Increased to 2 minutes for complex queries

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama chat request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let lastActivity = Date.now();

    // Stream loop with activity timeout
    while (true) {
      // Add timeout for individual read operations (30 seconds)
      const readPromise = reader.read();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Stream read timeout')), 30000)
      );
      
      const { done, value } = await Promise.race([readPromise, timeoutPromise]);
      if (done) {
        break;
      }
      
      lastActivity = Date.now();
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line) continue;
        try {
          const chunk = JSON.parse(line);
          if (chunk?.message?.content) {
            onToken(chunk.message.content);
          }
          if (chunk?.done) {
            clearTimeout(timeoutId);
            onDone?.(chunk);
            return;
          }
        } catch (e) {
          console.warn('Failed to parse stream chunk:', line, e);
        }
      }
    }
    
    // Process any remaining buffer content (for instant responses)
    if (buffer.trim()) {
      try {
        const finalChunk = JSON.parse(buffer.trim());
        if (finalChunk?.message?.content) {
          onToken(finalChunk.message.content);
        }
        clearTimeout(timeoutId);
        onDone?.(finalChunk);
        return;
      } catch (e) {
        console.warn('Failed to parse final buffer:', buffer, e);
      }
    }
    clearTimeout(timeoutId);
    onDone?.();
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('streamChatResponse error:', err);
    if (err.name === 'AbortError') {
      onError?.(new Error('Request timed out'));
    } else {
      onError?.(err);
    }
  }
}

/**
 * Fallback non-streaming completion using /api/generate. Returns the full string.
 */
export async function generateCompletion(modelName, prompt) {
  const url = `${OLLAMA_BASE_URL}/api/generate`;
  const body = {
    model: modelName,
    prompt,
    stream: false,
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Ollama generate failed with status ${response.status}`);
  }
  const data = await response.json();
  return data?.response || '';
}

/**
 * Returns available models from Ollama.
 */
export async function listModels() {
  const url = window.location.protocol === 'https:' ? 
    `${window.location.origin}/api/tags` : 
    'http://localhost:11434/api/tags';
    
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to list Ollama models');
  }
  const data = await response.json();
  return data?.models || [];
}

/**
 * Non-streaming chat response - gets complete answer at once
 */
export async function getChatResponse(modelName, messages, options = {}) {
  const url = window.location.protocol === 'https:' ? 
    `${window.location.origin}/api/chat` : 
    'http://localhost:11434/api/chat';
    
    
  const body = {
    model: modelName,
    messages,
    stream: false,
    ...options
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Ollama chat request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data?.message?.content || '';
}

/**
 * Simple health check to verify Ollama is reachable.
 */
export async function pingOllama() {
  try {
    const apiUrl = window.location.protocol === 'https:' ? 
      `${window.location.origin}/api/tags` : 
      'http://localhost:11434/api/tags';
    
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const res = await fetch(apiUrl, { 
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    return res.ok;
  } catch (error) {
    console.error('Ollama ping failed:', error);
    return false;
  }
}


