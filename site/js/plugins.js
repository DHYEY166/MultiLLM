// plugins.js - simple plugin framework (browser-side)
import { getPrefs } from './prefs.js';

function isArithmeticQuery(text){
  const t = (text || '').toLowerCase().trim();
  const cleaned = t
    .replace(/^what\s+is\s+/i,'')
    .replace(/^calculate\s+/i,'')
    .replace(/[=\?\s]+$/g,'')
    .trim();
  return /^[-+/*()\d\s\.]+$/.test(cleaned);
}

// Math Calculator
function tryMathExpression(text){
  // Very safe whitelist parser for + - * / parentheses and numbers
  if(!/^[-+/*()\d\s\.]+$/.test(text)) return null;
  try{
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${text})`);
    const result = fn();
    if (typeof result === 'number' && isFinite(result)) return result;
  }catch(_e){/* ignore */}
  return null;
}

const MathCalculator = {
  name: 'MathCalculator',
  description: 'Safely evaluates basic arithmetic expressions.',
  pre: async ({ query }) => {
    const match = query.match(/what is (.+)\??$/i) || query.match(/calculate (.+)/i) || query.match(/^([\d\s+\-*/().]+)$/i);
    if (match) {
      const expr = match[1] || match[0];
      const val = tryMathExpression(expr.trim());
      if (val !== null) {
        return { handled: true, response: `Result: ${val}` };
      }
    }
    return { handled: false };
  },
};

// Web Search (DuckDuckGo Instant Answer API)
// Note: Requires enabling prefs.allowWebAccess and may be limited by CORS.
const WebSearch = {
  name: 'WebSearch',
  description: 'Fetches quick facts and top links via DuckDuckGo Instant Answer.',
  pre: async ({ query }) => {
    const prefs = getPrefs();
    const q = (query || '').toLowerCase();
    if (isArithmeticQuery(query)) return { handled: false };
    const looksLikeSearch = /(search|latest|news|today|who is|when is|what is|current|price|definition|meaning|weather|temperature|time)/.test(q);

    // Special-case weather/narrow real-time asks for a cleaner narrative
    const looksLikeWeather = /(weather|temperature|forecast|raining|rain)/.test(q);
    if (looksLikeWeather) {
      // Try Open-Meteo (no API key, CORS-friendly) for current weather
      try {
        const location = (() => {
          // Prefer explicit location after 'search:'
          const m1 = /search:\s*(?:current\s+)?(?:weather|temperature|forecast)?\s*(.+)$/i.exec(query);
          if (m1 && m1[1]) return m1[1].trim();
          // Capture after 'in' or 'for' without requiring end of string
          const m2 = /(?:in|for)\s+([A-Za-z0-9 .,'-]+)/i.exec(query);
          if (m2 && m2[1]){
            let loc = m2[1]
              .replace(/\b(right now|today|currently|please|now)\b/gi,'')
              .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g,'')
              .trim();
            if (/^la$/i.test(loc)) loc = 'Los Angeles';
            return loc;
          }
          // Fallback: strip common tokens
          let cleaned = query.replace(/search:|current|weather|temperature|forecast|today|now|\?|\./gi,'').trim();
          if (/^la$/i.test(cleaned)) cleaned = 'Los Angeles';
          return cleaned;
        })();
        if (!location) return { handled: false };

        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
        if (!geoRes.ok) return { handled: false };
        const geo = await geoRes.json();
        const place = geo?.results?.[0];
        if (!place) return { handled: false };

        const { latitude, longitude, name, admin1, country } = place;
        const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`);
        if (!wxRes.ok) return { handled: false };
        const wx = await wxRes.json();
        const cur = wx?.current_weather;
        if (!cur) return { handled: false };

        const desc = (() => {
          const map = {
            0: 'clear sky', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'fog', 48: 'depositing rime fog',
            51: 'light drizzle', 53: 'moderate drizzle', 55: 'dense drizzle', 56: 'freezing drizzle', 57: 'dense freezing drizzle',
            61: 'slight rain', 63: 'moderate rain', 65: 'heavy rain', 66: 'freezing rain', 67: 'heavy freezing rain',
            71: 'slight snow', 73: 'moderate snow', 75: 'heavy snow', 77: 'snow grains',
            80: 'rain showers', 81: 'heavy rain showers', 82: 'violent rain showers',
            85: 'snow showers', 86: 'heavy snow showers', 95: 'thunderstorm', 96: 'thunderstorm with hail', 99: 'severe thunderstorm with hail'
          };
          return map[cur.weathercode] || 'current conditions';
        })();

        const locText = [name, admin1, country].filter(Boolean).join(', ');
        const temp = Math.round(cur.temperature);
        const wind = Math.round(cur.windspeed);
        const response = `Now in ${locText}: ${temp}°C, ${desc}, wind ${wind} km/h.`;
        return { handled: true, response };
      } catch (_e) {
        // Fall back to narrative guidance
        return { handled: true, response: 'Web access is enabled but live weather lookup failed. Please try again or specify the city more clearly.' };
      }
    }

    // Special-case time queries (e.g., "what is time in india right now")
    const looksLikeTime = /(\btime\b|what\s+time)/.test(q);
    if (looksLikeTime) {
      try {
        // Extract optional location
        const m = /(?:in|at|for)\s+([A-Za-z0-9 .,'-]+)/i.exec(query);
        let loc = m && m[1] ? m[1] : '';
        loc = loc.replace(/\b(right now|today|currently|please|now)\b/gi,'').trim();
        if (/^la$/i.test(loc)) loc = 'Los Angeles';
        if (/^india$/i.test(loc)) loc = 'India';

        if (!loc) {
          // No location: use user's local time
          const d = new Date();
          const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(d);
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          return { handled: true, response: `Your local time (${tz}): ${time}` };
        }

        // Offline mapping for common locations (no web required)
        const tzMap = {
          'india': 'Asia/Kolkata',
          'los angeles': 'America/Los_Angeles',
          'la': 'America/Los_Angeles',
          'new york': 'America/New_York',
          'london': 'Europe/London',
          'paris': 'Europe/Paris',
          'berlin': 'Europe/Berlin',
          'tokyo': 'Asia/Tokyo',
          'sydney': 'Australia/Sydney',
          'dubai': 'Asia/Dubai',
          'singapore': 'Asia/Singapore',
          'toronto': 'America/Toronto'
        };
        const key = loc.toLowerCase();
        if (tzMap[key]){
          const d = new Date();
          const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: tzMap[key] }).format(d);
          const label = key === 'la' ? 'Los Angeles' : loc;
          return { handled: true, response: `Time in ${label}: ${time}` };
        }

        if (!prefs.allowWebAccess) {
          return { handled: true, response: 'To get exact time for that location, enable Web Access in Admin.' };
        }

        // With web access: get timezone from Open-Meteo geocoding
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1&language=en&format=json`);
        if (!geoRes.ok) return { handled: false };
        const geo = await geoRes.json();
        const place = geo?.results?.[0];
        if (!place || !place.timezone) return { handled: false };
        const tz = place.timezone;

        // Format current time locally for that timezone (no API call needed)
        const d = new Date();
        const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: tz }).format(d);
        const locText = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
        return { handled: true, response: `Time in ${locText} (${tz}): ${time}` };
      } catch(_e) {
        return { handled: true, response: 'Live time lookup failed. Try specifying the city or country more clearly.' };
      }
    }
    if (!looksLikeSearch) return { handled: false };
    if (!prefs.allowWebAccess) return { handled: false };
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
      const res = await fetch(url);
      if (!res.ok) return { handled: false };
      const data = await res.json();
      if (data.AbstractText) {
        // Prefer a concise paragraph when available
        return { handled: true, response: data.AbstractText };
      }
      // Fall back to a short narrative rather than a markdown list
      const first = (data.Results && data.Results[0]?.Text) || (data.RelatedTopics && (data.RelatedTopics[0]?.Text || data.RelatedTopics[0]?.Topics?.[0]?.Text));
      if (first) {
        return { handled: true, response: first };
      }
      return { handled: true, response: 'I couldn\'t find a concise summary for that. Try refining your query or specifying exactly what you want to know.' };
    } catch(_e){
      return { handled: true, response: 'Web access is enabled but the quick lookup failed. Please try again or refine your query.' };
    }
  }
};

// Code Analyzer: injects analysis instructions for LLM when code is provided
const CodeAnalyzer = {
  name: 'CodeAnalyzer',
  description: 'Guides the model to analyze code (purpose, complexity, edge cases, bugs).',
  pre: async ({ query }) => {
    const text = (query || '').toLowerCase();
    const looksLikeCodeFence = query.includes('```');
    const looksLikeAsk = /(explain|analyze|complexity|bugs?|review)/.test(text);
    if (!looksLikeCodeFence && !looksLikeAsk) return { handled: false };
    const instruction = [
      'When the user shares code or asks to analyze it, respond with a clear analysis: purpose, step-by-step logic, time/space complexity, edge cases, and potential bugs. ',
      'Use concise bullet points. Provide improved code only if it fixes a concrete issue.'
    ].join('');
    return { handled: false, instruction };
  }
};

// Minimal framework
const BUILTIN = [MathCalculator, WebSearch, CodeAnalyzer];

export async function runPrePlugins(context){
  const systemInstructions = [];
  for(const plugin of BUILTIN){
    const res = await plugin.pre?.(context);
    if (!res) continue;
    if (res.handled) return res;
    if (res.instruction) systemInstructions.push(res.instruction);
  }
  return { handled: false, systemInstructions };
}

export function listPlugins(){
  return BUILTIN.map(p=>({ name: p.name, description: p.description || '' }));
}


