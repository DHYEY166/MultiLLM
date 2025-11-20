const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const session = require('express-session');
const { RedisStore } = require('connect-redis');
const { createClient } = require('redis');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const multer = require('multer');
const { createProxyMiddleware } = require('http-proxy-middleware');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
require('dotenv').config();

// Advanced response cache for all types of queries
const responseCache = new Map();
const MAX_CACHE_SIZE = 1000;

// Common instant responses for frequent queries
const instantResponses = {
  'hello': 'Hello! How can I help you today?',
  'hi': 'Hi there! What can I do for you?',
  'how are you': 'I\'m doing well, thank you! How can I assist you?',
  'what is your name': 'I\'m an AI assistant powered by MultiLLM. How can I help?',
  'thank you': 'You\'re welcome! Is there anything else I can help you with?',
  'thanks': 'You\'re welcome! Feel free to ask me anything else.',
  'bye': 'Goodbye! Have a great day!',
  'goodbye': 'Goodbye! Feel free to come back anytime.',
  'what can you do': 'I can help with coding, math, writing, analysis, translations, and answer questions on various topics. What would you like to know?',
  'help': 'I\'m here to help! You can ask me about programming, math problems, writing assistance, data analysis, or general questions.',
  'what is machine learning': 'Machine learning is a subset of AI that enables computers to learn and make decisions from data without being explicitly programmed for every task.',
  'what is ai': 'Artificial Intelligence (AI) is technology that enables machines to simulate human intelligence, including learning, reasoning, and problem-solving.',
  'explain python': 'Python is a high-level, interpreted programming language known for its simple syntax and versatility. It\'s widely used for web development, data science, AI, and automation.',
  'what is javascript': 'JavaScript is a programming language primarily used for web development to create interactive websites and web applications.',
  'how to code': 'Start with choosing a programming language like Python or JavaScript, practice with small projects, and gradually build more complex applications. Consistency is key!',
  'what is html': 'HTML (HyperText Markup Language) is the standard markup language for creating web pages and web applications.',
  'what is css': 'CSS (Cascading Style Sheets) is used to style and layout web pages, controlling colors, fonts, spacing, and positioning.',
  'what is react': 'React is a JavaScript library for building user interfaces, particularly web applications with reusable components.',
  'what is node.js': 'Node.js is a JavaScript runtime that allows you to run JavaScript on the server side, enabling full-stack JavaScript development.',
  'what is git': 'Git is a distributed version control system used to track changes in source code during software development.',
  'what is api': 'API (Application Programming Interface) is a set of protocols and tools that allows different software applications to communicate with each other.',
  'what is database': 'A database is an organized collection of structured information or data, typically stored electronically in a computer system.',
  'what is sql': 'SQL (Structured Query Language) is a programming language designed for managing and manipulating relational databases.',
  'hello world python': 'print("Hello, World!")',
  'hello world javascript': 'console.log("Hello, World!");',
  'how to learn programming': 'Start with basics, practice daily, build projects, join communities, and never stop learning. Pick one language first and master it.',
  'best programming language': 'There\'s no single "best" language. Python is great for beginners, JavaScript for web development, and it depends on your goals.',
  'what is github': 'GitHub is a web-based platform for version control using Git, allowing developers to collaborate on projects and share code.',
  
  // Complex programming concepts with instant responses
  'python function': 'def function_name(parameters):\n    """Docstring"""\n    # Function body\n    return result',
  'javascript function': 'function functionName(parameters) {\n    // Function body\n    return result;\n}\n\n// Arrow function:\nconst functionName = (parameters) => {\n    return result;\n};',
  'python list comprehension': '[expression for item in iterable if condition]\n\nExample: squares = [x**2 for x in range(10)]',
  'python for loop': 'for item in iterable:\n    # Do something with item\n    print(item)',
  'javascript for loop': 'for (let i = 0; i < array.length; i++) {\n    // Do something with array[i]\n    console.log(array[i]);\n}',
  'python if statement': 'if condition:\n    # Do something\nelif another_condition:\n    # Do something else\nelse:\n    # Default action',
  'javascript if statement': 'if (condition) {\n    // Do something\n} else if (anotherCondition) {\n    // Do something else\n} else {\n    // Default action\n}',
  'python class': 'class ClassName:\n    def __init__(self, parameters):\n        self.attribute = parameters\n    \n    def method(self):\n        return self.attribute',
  'javascript class': 'class ClassName {\n    constructor(parameters) {\n        this.attribute = parameters;\n    }\n    \n    method() {\n        return this.attribute;\n    }\n}',
  'python dictionary': 'my_dict = {"key1": "value1", "key2": "value2"}\n\n# Access: my_dict["key1"]\n# Add: my_dict["key3"] = "value3"',
  'javascript object': 'const myObject = {\n    key1: "value1",\n    key2: "value2",\n    method: function() {\n        return this.key1;\n    }\n};',
  'python list': 'my_list = [1, 2, 3, 4, 5]\n\n# Access: my_list[0]\n# Add: my_list.append(6)\n# Length: len(my_list)',
  'javascript array': 'const myArray = [1, 2, 3, 4, 5];\n\n// Access: myArray[0]\n// Add: myArray.push(6)\n// Length: myArray.length',
  'python import': 'import module_name\nfrom module_name import function_name\nfrom module_name import function_name as alias\nimport module_name as alias',
  'javascript import': 'import { functionName } from "./module.js";\nimport * as moduleName from "./module.js";\nimport defaultExport from "./module.js";',
  'sql select': 'SELECT column1, column2 FROM table_name WHERE condition ORDER BY column1;',
  'sql insert': 'INSERT INTO table_name (column1, column2) VALUES (value1, value2);',
  'sql update': 'UPDATE table_name SET column1 = value1 WHERE condition;',
  'sql delete': 'DELETE FROM table_name WHERE condition;',
  'create rest api': '// Express.js REST API example:\nconst express = require("express");\nconst app = express();\n\napp.get("/api/users", (req, res) => {\n    res.json({ users: [] });\n});\n\napp.post("/api/users", (req, res) => {\n    // Create user logic\n    res.status(201).json({ message: "User created" });\n});\n\napp.listen(3000);',
  'python web scraping': 'import requests\nfrom bs4 import BeautifulSoup\n\nresponse = requests.get("https://example.com")\nsoup = BeautifulSoup(response.content, "html.parser")\ndata = soup.find("div", class_="content").text',
  'javascript fetch api': 'fetch("https://api.example.com/data")\n    .then(response => response.json())\n    .then(data => console.log(data))\n    .catch(error => console.error("Error:", error));',
  'python error handling': 'try:\n    # Code that might raise an exception\n    result = risky_operation()\nexcept SpecificError as e:\n    # Handle specific error\n    print(f"Error occurred: {e}")\nexcept Exception as e:\n    # Handle any other error\n    print(f"Unexpected error: {e}")\nfinally:\n    # Always executed\n    cleanup()',
  'javascript error handling': 'try {\n    // Code that might throw an error\n    const result = riskyOperation();\n} catch (error) {\n    // Handle the error\n    console.error("Error occurred:", error.message);\n} finally {\n    // Always executed\n    cleanup();\n}'
};

// Simple math evaluator for instant responses
function evaluateMath(expression) {
  try {
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    const sanitizedNoSpaces = sanitized.replace(/\s/g, '');
    const expressionNoSpaces = expression.replace(/\s/g, '');
    
    if (sanitizedNoSpaces !== expressionNoSpaces) {
      return null;
    }
    
    const result = Function('"use strict"; return (' + sanitized + ')')();
    return typeof result === 'number' && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

// Security utility functions
function sanitizeUserId(userId) {
  const sanitized = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');
  if (sanitized !== String(userId)) {
    throw new Error('Invalid user ID format');
  }
  return sanitized;
}

function validatePath(filePath, allowedBaseDir) {
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(allowedBaseDir);
  if (!resolvedPath.startsWith(resolvedBase)) {
    console.error('[SECURITY] Path traversal attempt detected:', filePath);
    throw new Error('Invalid file path');
  }
  return resolvedPath;
}

function sanitizeCsvCell(value) {
  if (typeof value !== 'string') return value;
  const dangerous = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerous.some(char => value.startsWith(char))) {
    return "'" + value;
  }
  return value;
}

function validateQuery(query) {
  const MAX_QUERY_LENGTH = 10000;
  if (query.length > MAX_QUERY_LENGTH) {
    throw new Error('Query too long. Maximum 10,000 characters.');
  }
  const suspiciousPatterns = [
    /ignore (previous|all) (instructions|prompts)/i,
    /system prompt:/i,
    /you are now/i,
    /<script/i,
    /javascript:/i
  ];
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(query)) {
      console.warn('[SECURITY] Suspicious query pattern detected from IP:', query.substring(0, 50));
    }
  }
  return query.replace(/<script[^>]*>.*?<\/script>/gi, '')
              .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
              .trim();
}

function logSecurityEvent(event, details) {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY] ${timestamp} - ${event}:`, JSON.stringify(details));
}

// Generate cache key for responses
function getCacheKey(message, model) {
  return `${model}:${message.toLowerCase().trim()}`;
}

// Check for instant response
function getInstantResponse(message) {
  const normalizedMessage = message.toLowerCase().trim();
  
  // Check for exact matches
  if (instantResponses[normalizedMessage]) {
    return instantResponses[normalizedMessage];
  }
  
  // Check for partial matches
  for (const [key, response] of Object.entries(instantResponses)) {
    if (normalizedMessage.includes(key) && normalizedMessage.length < key.length + 15) {
      return response;
    }
  }
  
  // Pattern-based matching for complex questions
  const patterns = [
    // Simple programming syntax patterns (must be short and direct)
    { pattern: /^(?:python|py) function$/i, response: instantResponses['python function'] },
    { pattern: /^(?:javascript|js) function$/i, response: instantResponses['javascript function'] },
    { pattern: /^(?:python|py) class$/i, response: instantResponses['python class'] },
    { pattern: /^(?:javascript|js) class$/i, response: instantResponses['javascript class'] },
    
    // Loop patterns (simple requests only)
    { pattern: /^(?:python|py) for loop$/i, response: instantResponses['python for loop'] },
    { pattern: /^(?:javascript|js) for loop$/i, response: instantResponses['javascript for loop'] },
    
    // Simple conditional patterns
    { pattern: /^(?:python|py) if$/i, response: instantResponses['python if statement'] },
    { pattern: /^(?:javascript|js) if$/i, response: instantResponses['javascript if statement'] },
    
    // Simple data structure patterns
    { pattern: /^(?:python|py) list$/i, response: instantResponses['python list'] },
    { pattern: /^(?:javascript|js) array$/i, response: instantResponses['javascript array'] },
    { pattern: /^(?:python|py) dict(?:ionary)?$/i, response: instantResponses['python dictionary'] },
    { pattern: /^(?:javascript|js) object$/i, response: instantResponses['javascript object'] },
    
    // Error handling patterns
    { pattern: /(?:python|py).*(?:error|exception|try|catch)/i, response: instantResponses['python error handling'] },
    { pattern: /(?:javascript|js).*(?:error|exception|try|catch)/i, response: instantResponses['javascript error handling'] },
    
    // API patterns
    { pattern: /(?:create|build|make).*(?:rest|api)/i, response: instantResponses['create rest api'] },
    { pattern: /(?:javascript|js).*(?:fetch|api)/i, response: instantResponses['javascript fetch api'] },
    { pattern: /(?:python|py).*(?:scraping|scrape)/i, response: instantResponses['python web scraping'] },
    
    // SQL patterns
    { pattern: /sql.*select/i, response: instantResponses['sql select'] },
    { pattern: /sql.*insert/i, response: instantResponses['sql insert'] },
    { pattern: /sql.*update/i, response: instantResponses['sql update'] },
    { pattern: /sql.*delete/i, response: instantResponses['sql delete'] },
    
    // List comprehension
    { pattern: /(?:python|py).*(?:list comprehension|comprehension)/i, response: instantResponses['python list comprehension'] },
    
    // Import patterns
    { pattern: /(?:python|py).*import/i, response: instantResponses['python import'] },
    { pattern: /(?:javascript|js).*import/i, response: instantResponses['javascript import'] }
  ];
  
  // Check pattern matches
  for (const { pattern, response } of patterns) {
    if (pattern.test(normalizedMessage)) {
      return response;
    }
  }
  
  return null;
}

const app = express();
const PORT = process.env.PORT || 8000;

// In-memory cache for CSV summaries to avoid repeated parsing (keyed by absolute path)
const _csvSummaryCache = {};

function listCsvFiles() {
  // Scan both project root and ./data for *.csv (excluding extremely large > ~10MB to keep speed)
  const roots = [__dirname, path.join(__dirname, 'data')];
  const seen = new Set();
  const out = [];
  for (const dir of roots) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        if (!/\.csv$/i.test(f)) continue;
        const abs = path.join(dir, f);
        if (seen.has(abs)) continue;
        const stat = fs.statSync(abs);
        if (stat.size > 10 * 1024 * 1024) { // skip >10MB for now
          continue;
        }
        out.push({ name: f, abs, size: stat.size, mtimeMs: stat.mtimeMs });
        seen.add(abs);
      }
    } catch (_e) { /* ignore */ }
  }
  return out;
}

function listUserCsvFiles(userId) {
  // Scan user-specific data directory for *.csv files
  const safeUserId = sanitizeUserId(userId);
  const userDataDir = path.join(__dirname, 'data', `user_${safeUserId}`);
  const validatedPath = validatePath(userDataDir, path.join(__dirname, 'data'));
  const out = [];
  if (!fs.existsSync(validatedPath)) return out;
  
  try {
    const files = fs.readdirSync(validatedPath);
    for (const f of files) {
      if (!/\.csv$/i.test(f)) continue;
      const abs = path.join(validatedPath, f);
      const stat = fs.statSync(abs);
      if (stat.size > 10 * 1024 * 1024) { // skip >10MB for now
        continue;
      }
      out.push({ name: f, abs, size: stat.size, mtimeMs: stat.mtimeMs });
    }
  } catch (_e) { /* ignore */ }
  return out;
}

function cleanupUserData(userId) {
  try {
    const safeUserId = sanitizeUserId(userId);
    console.log(`[CLEANUP] Cleaning up data for user ${safeUserId}`);
    
    // Clean up user dataset directory
    const userDataDir = path.join(__dirname, 'data', `user_${safeUserId}`);
    const validatedDataDir = validatePath(userDataDir, path.join(__dirname, 'data'));
    if (fs.existsSync(validatedDataDir)) {
      const dataFiles = fs.readdirSync(validatedDataDir);
      for (const file of dataFiles) {
        const filePath = path.join(validatedDataDir, file);
        fs.unlinkSync(filePath);
        console.log(`[CLEANUP] Deleted dataset: ${file}`);
      }
      fs.rmdirSync(validatedDataDir);
      console.log(`[CLEANUP] Removed user data directory: ${validatedDataDir}`);
      logSecurityEvent('DATA_CLEANUP', { userId: safeUserId, type: 'data_directory' });
    }
    
    // Clean up user uploads directory
    const userUploadsDir = path.join(__dirname, 'uploads', `user_${safeUserId}`);
    const validatedUploadsDir = validatePath(userUploadsDir, path.join(__dirname, 'uploads'));
    if (fs.existsSync(validatedUploadsDir)) {
      const uploadFiles = fs.readdirSync(validatedUploadsDir);
      for (const file of uploadFiles) {
        const filePath = path.join(validatedUploadsDir, file);
        fs.unlinkSync(filePath);
        console.log(`[CLEANUP] Deleted upload: ${file}`);
      }
      fs.rmdirSync(validatedUploadsDir);
      console.log(`[CLEANUP] Removed user uploads directory: ${validatedUploadsDir}`);
      logSecurityEvent('DATA_CLEANUP', { userId: safeUserId, type: 'uploads_directory' });
    }
    
    // Clear user-specific cache entries
    Object.keys(_csvSummaryCache).forEach(key => {
      if (key.includes(`user_${safeUserId}`)) {
        delete _csvSummaryCache[key];
      }
    });
    
    console.log(`[CLEANUP] Successfully cleaned up data for user ${safeUserId}`);
  } catch (error) {
    console.error(`[CLEANUP] Error cleaning up data for user ${userId}:`, error);
    logSecurityEvent('CLEANUP_ERROR', { userId, error: error.message });
  }
}

function summarizeCsv(filePath, opts = {}) {
  const { sampleRows = 5, maxLines = 3000, correlationThreshold = 0.2 } = opts; // Reduced maxLines for speed
  if (!fs.existsSync(filePath)) {
    // Remove from cache if file no longer exists
    delete _csvSummaryCache[filePath];
    return null;
  }
  // Basic mtime-based invalidation
  const stat = fs.statSync(filePath);
  const cacheEntry = _csvSummaryCache[filePath];
  if (cacheEntry && cacheEntry._mtimeMs === stat.mtimeMs) {
    return cacheEntry.summary;
  }
  
  console.log(`[CSV] Processing ${filePath} (${(stat.size/1024/1024).toFixed(2)}MB)...`);
  const startTime = Date.now();
  
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return null;
    const header = lines[0].split(',').map(h => h.trim());
    const colCount = header.length;
    const stats = header.map(() => ({ count: 0, sum: 0, sumSq: 0, min: Infinity, max: -Infinity, uniques: new Set(), numeric: true }));
    const numericCandidate = new Array(colCount).fill(true);
    const pairSums = {}; // key i:j -> { sumXY, n }
    const totalLines = Math.min(lines.length - 1, maxLines - 1);
    
    // For large files, use sampling to speed up processing
    const actualLines = lines.length - 1;
    const useSampling = actualLines > maxLines;
    const sampleStep = useSampling ? Math.ceil(actualLines / maxLines) : 1;
    console.log(`[CSV] Processing ${totalLines}/${actualLines} rows${useSampling ? ' (sampled)' : ''}`);
    for (let i = 1; i <= totalLines; i += sampleStep) {
      if (i >= lines.length) break;
      const parts = lines[i].split(',');
      if (parts.length !== colCount) continue; // skip malformed
      for (let c = 0; c < colCount; c++) {
        const vRaw = parts[c];
        const v = vRaw.trim();
        const s = stats[c];
        // Track uniqueness (cap at 50 to save memory)
        if (s.uniques.size < 50) s.uniques.add(v);
        const num = parseFloat(v);
        if (!Number.isNaN(num) && v !== '') {
          s.count++;
          s.sum += num;
          s.sumSq += num * num;
          if (num < s.min) s.min = num;
          if (num > s.max) s.max = num;
        } else {
          s.numeric = false;
          numericCandidate[c] = false;
        }
      }
      // Correlation accumulation (only if <=10 numeric)
      const numericIndices = [];
      const numericValues = [];
      for (let c = 0; c < colCount; c++) {
        if (numericCandidate[c]) {
          const val = parseFloat(parts[c]);
            numericValues[c] = (!Number.isNaN(val) ? val : null);
            numericIndices.push(c);
        } else {
          numericValues[c] = null;
        }
      }
      if (numericIndices.length && numericIndices.length <= 10) {
        for (let a = 0; a < numericIndices.length; a++) {
          const ia = numericIndices[a];
          const va = numericValues[ia];
          if (va == null) continue;
          for (let b = a + 1; b < numericIndices.length; b++) {
            const ib = numericIndices[b];
            const vb = numericValues[ib];
            if (vb == null) continue;
            const key = ia + ':' + ib;
            if (!pairSums[key]) pairSums[key] = { sumXY: 0, n: 0 };
            pairSums[key].sumXY += va * vb;
            pairSums[key].n++;
          }
        }
      }
    }
    // Finalize stats
    const finalized = header.map((name, idx) => {
      const s = stats[idx];
      if (!s.numeric || s.count === 0) {
        return {
          column: name,
            type: 'categorical',
            uniqueValues: Array.from(s.uniques).slice(0, 20),
            uniqueCount: s.uniques.size
        };
      }
      return {
        column: name,
        type: 'numeric',
        count: s.count,
        mean: +(s.sum / s.count).toFixed(3),
        min: s.min,
        max: s.max,
        sum: s.sum,
        sumSq: s.sumSq
      };
    });
    const sample = [];
    for (let i = 1; i <= Math.min(sampleRows, totalLines); i++) {
      sample.push(lines[i]);
    }
    // Optional derived metrics: if we have Year and Total_Marks columns
    const yearIdx = header.findIndex(h => /year/i.test(h));
    const totalIdx = header.findIndex(h => /total[_ ]?marks/i.test(h));
    const yearAgg = {};
    if (yearIdx !== -1 && totalIdx !== -1) {
      for (let i = 1; i <= totalLines; i++) {
        const parts = lines[i].split(',');
        if (parts.length !== colCount) continue;
        const yr = parts[yearIdx];
        const tot = parseFloat(parts[totalIdx]);
        if (!Number.isNaN(parseFloat(yr)) && !Number.isNaN(tot)) {
          if (!yearAgg[yr]) yearAgg[yr] = { sum: 0, count: 0 };
          yearAgg[yr].sum += tot;
          yearAgg[yr].count++;
        }
      }
    }
    const yearSummary = Object.entries(yearAgg).slice(0, 12).map(([y, v]) => ({ year: y, avgTotalMarks: +(v.sum / v.count).toFixed(2), records: v.count }));
    // Correlations (Pearson r)
    const correlations = [];
    const numericColsInfo = finalized.filter(f => f.type === 'numeric');
    if (numericColsInfo.length >= 2 && numericColsInfo.length <= 10) {
      for (const key in pairSums) {
        const [aStr, bStr] = key.split(':');
        const ia = parseInt(aStr, 10);
        const ib = parseInt(bStr, 10);
        const pair = pairSums[key];
        const sa = stats[ia];
        const sb = stats[ib];
        const n = Math.min(sa.count, sb.count, pair.n);
        if (n < 3) continue;
        const sumX = sa.sum, sumY = sb.sum;
        const sumX2 = sa.sumSq, sumY2 = sb.sumSq;
        const sumXY = pair.sumXY;
        const num = (n * sumXY - sumX * sumY);
        const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        if (!den) continue;
        const r = num / den;
        if (isFinite(r) && Math.abs(r) >= correlationThreshold) correlations.push({ a: header[ia], b: header[ib], r: +r.toFixed(3) });
      }
      correlations.sort((x,y)=> Math.abs(y.r) - Math.abs(x.r));
      if (correlations.length > 20) correlations.length = 20;
    }

    const summary = {
      file: path.basename(filePath),
      rowsParsed: totalLines,
      columns: header.length,
      columnsInfo: finalized,
      sampleRows: sample,
      yearSummary,
      sizeBytes: stat.size,
      truncated: (lines.length - 1) > totalLines,
      correlations
    };
    
    const processingTime = Date.now() - startTime;
    console.log(`[CSV] Completed processing ${filePath} in ${processingTime}ms`);
    
    _csvSummaryCache[filePath] = { _mtimeMs: stat.mtimeMs, summary };
    return summary;
  } catch (e) {
    console.error('CSV summary error:', e.message);
    return null;
  }
}

// Initialize Redis client for sessions (fallback to memory store if Redis unavailable)
let redisClient;
let sessionStore;

async function initializeRedis() {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        lazyConnect: true
      }
    });
    
    redisClient.on('error', (err) => {
      console.warn('Redis Client Error:', err.message);
    });
    
    await redisClient.connect();
    sessionStore = new RedisStore({ 
      client: redisClient,
      prefix: 'multillm:sess:'
    });
    console.log('Redis session store initialized');
  } catch (error) {
    console.warn('Redis unavailable, using memory store:', error.message);
    sessionStore = null; // Will fall back to default MemoryStore
  }
}

// Initialize Redis connection
initializeRedis();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://accounts.google.com',
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com'
      ],
      // Some browsers distinguish script-src-elem / script-src-attr; mirror allowances
      'script-src-elem': [
        "'self'",
        "'unsafe-inline'", // Temporary: inline module scripts still in HTML (index.html, login.html)
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        'https://accounts.google.com'
      ],
      'script-src-attr': ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", 'https://www.google-analytics.com'],
      connectSrc: [
        "'self'",
        'http://localhost:11434',
        'https://accounts.google.com',
        'https://www.google-analytics.com',
        'https://www.googletagmanager.com'
      ],
      frameSrc: ['https://accounts.google.com']
    }
  }
}));

// Trust proxy for production (behind Nginx)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Robust CORS setup: allow production domain + localhost
const allowedOrigins = new Set([
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'https://multillm.app',
  process.env.PUBLIC_URL || ''
].filter(Boolean));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // same-origin or curl
    if (allowedOrigins.has(origin)) return callback(null, true);
    // Allow naked domain variations
    if (/https?:\/\/([a-z0-9.-]*multillm\.app)/i.test(origin)) return callback(null, true);
    console.warn('[CORS] Blocked origin:', origin);
    return callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Accept']
}));

// Rate limiting - simplified configuration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Strict limit: 5 login attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req, res) => {
    logSecurityEvent('RATE_LIMIT_EXCEEDED', { 
      ip: req.ip, 
      path: req.path,
      email: req.body?.email 
    });
    res.status(429).json({
      error: 'Too many attempts',
      message: 'Please try again later'
    });
  },
  skip: (req) => {
    return process.env.NODE_ENV !== 'production' || req.path.includes('health');
  }
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Upload limit reached, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSecurityEvent('UPLOAD_RATE_LIMIT_EXCEEDED', { ip: req.ip, userId: req.user?.id });
    res.status(429).json({ error: 'Upload limit reached' });
  }
});

// API rate limiting for LLM endpoints
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: 'Too many API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV !== 'production';
  }
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration with Redis store
const sessionSecret = process.env.SESSION_SECRET || (() => {
  const fallback = crypto.randomBytes(32).toString('hex');
  console.warn('[SECURITY WARNING] No SESSION_SECRET environment variable set. Using generated secret.');
  console.warn('[SECURITY WARNING] Set SESSION_SECRET in production to persist sessions across restarts.');
  return fallback;
})();

app.use(session({
  store: sessionStore, // Uses Redis if available, falls back to MemoryStore
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // behind TLS / reverse proxy
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict'
  },
  name: 'multillm.sid'
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// CRITICAL: Ollama API proxy MUST be early in middleware chain
// This handles /api requests for AI chat functionality - BEFORE authentication
const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
console.log('Proxying /api requests to:', ollamaHost);

// Create proxy middleware with optimizations for streaming
const ollamaProxy = createProxyMiddleware({
  target: ollamaHost,
  changeOrigin: true,
  // When mounting at /api, Express removes the mount prefix. We need to add it back
  pathRewrite: (path, req) => {
    return path.startsWith('/api/') ? path : `/api${path}`;
  },
  onError: (err, req, res) => {
    console.error('Ollama proxy error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Ollama service unavailable', details: err.message });
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    // Optimize request headers for better performance
    proxyReq.setHeader('Connection', 'keep-alive');
    proxyReq.setHeader('Keep-Alive', 'timeout=5, max=1000');
  },
  // Optimize for streaming responses
  buffer: false,
  timeout: 300000, // 5 minutes to match nginx timeout
  proxyTimeout: 300000,
  // Handle streaming properly
  selfHandleResponse: false,
  // Add headers for better streaming
  onProxyRes: (proxyRes, req, res) => {
    // Enable streaming for all responses
    proxyRes.headers['x-accel-buffering'] = 'no'; // Disable nginx buffering
    proxyRes.headers['cache-control'] = 'no-cache';
    
    // Special handling for chat endpoints
    if (req.url.includes('/chat') || req.url.includes('/generate')) {
      proxyRes.headers['transfer-encoding'] = 'chunked';
      proxyRes.headers['content-type'] = 'application/json';
      delete proxyRes.headers['content-length'];
    }
  }
});

// Fast ping endpoint for liveness checks - BEFORE proxy
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

// Fast generate endpoint for simple questions - bypasses chat format overhead
app.post('/api/fast', async (req, res) => {
  console.log('[FAST] Ultra-fast generate handler');
  try {
    const { model, prompt, message } = req.body;
    const actualPrompt = prompt || message || req.body.query;
    
    // Check for instant responses first
    const instantResponse = getInstantResponse(actualPrompt);
    if (instantResponse) {
      return res.json({ response: instantResponse, instant: true });
    }
    
    // Check cache
    const cacheKey = getCacheKey(actualPrompt, model || 'llama3.2:3b');
    if (responseCache.has(cacheKey)) {
      return res.json({ response: responseCache.get(cacheKey), cached: true });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // 90 second timeout for complex responses
    
    const response = await fetch(`http://localhost:11434/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'llama3.2:3b', // Always use fastest model
        prompt: actualPrompt,
        stream: false,
        options: {
          temperature: 0.1, // Deterministic for speed
          top_p: 0.7,
          top_k: 5,
          num_predict: 150, // Balanced for ARM performance
          num_ctx: 256, // Reduced for faster processing
          repeat_penalty: 1.0,
          num_batch: 64, // Reduced for ARM server
          num_thread: 3, // Conservative threading for ARM
          keep_alive: 1800 // Keep model loaded
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Fast generate failed' });
    }
    
    const data = await response.json();
    
    // Cache the response for future use
    if (data.response && responseCache.size < MAX_CACHE_SIZE) {
      responseCache.set(cacheKey, data.response);
    }
    
    res.json({ response: data.response });
    
  } catch (error) {
    console.error('[FAST] Fast generate error:', error);
    res.status(500).json({ error: error.message });
  }
});



// API request tracing (minimal for production)
app.use((req, res, next) => {
  if (req.path.startsWith('/api') && process.env.NODE_ENV !== 'production') {
    console.log('[API]', req.method, req.path);
  }
  next();
});

// Apply rate limiting to API endpoints
app.use('/api', apiLimiter);

// Smart model selection function
function selectOptimalModel(userContent, isCodeRequest, isSimpleQuestion) {
  const contentLength = userContent.length;
  
  // Ultra-fast tier for simple tasks
  if (isSimpleQuestion && contentLength < 50) {
    return 'llama3.2:1b';  // Fastest for math, short questions
  }
  
  // Fast coding tier
  if (isCodeRequest) {
    if (contentLength < 100 || /simple|basic|hello world|quick/.test(userContent.toLowerCase())) {
      return 'deepseek-coder:1.3b';  // Ultra-fast for simple code
    }
    if (contentLength < 300) {
      return 'deepseek-coder:1.3b';  // Still fast for moderate code
    }
    return 'llama3.2:3b';  // Complex code needs more capable model
  }
  
  // Fast general tier
  if (contentLength < 100) {
    return 'llama3.2:1b';  // Fastest for short requests
  }
  
  if (contentLength < 200) {
    return 'phi3:mini';  // Balanced for moderate requests
  }
  
  // Default to reliable model for complex requests
  return 'llama3.2:3b';
}

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

// Handle chat endpoint directly - optimized for fast streaming
app.post('/api/chat', async (req, res) => {
  // Convert single message format to messages array format if needed
  let requestBody = { ...req.body };
  if (requestBody.message && !requestBody.messages) {
    requestBody.messages = [{ role: 'user', content: requestBody.message }];
    delete requestBody.message; // Remove the single message field
  }
  
  // Validate and sanitize query content
  try {
    if (requestBody.messages && Array.isArray(requestBody.messages)) {
      for (const msg of requestBody.messages) {
        if (msg.content && typeof msg.content === 'string') {
          msg.content = validateQuery(msg.content);
        }
      }
    }
  } catch (error) {
    logSecurityEvent('QUERY_VALIDATION_FAILED', { error: error.message, ip: req.ip, userId: req.user?.id });
    return res.status(400).json({ error: error.message });
  }
  
  // Determine if caller explicitly wants a full (non-streaming) answer
  const lastUserMsg = requestBody.messages?.[requestBody.messages.length - 1]?.content || '';
  const explicitFull = !!requestBody.fullAnswer || /complete output|full answer|full output|entire answer/i.test(lastUserMsg);
  
  // Detect Python code generation requests
  const isCodeRequest = /python.*code|give.*python|python.*script|write.*python|create.*python|eda.*python|python.*eda|pandas|matplotlib|seaborn|numpy/i.test(lastUserMsg);
  
  // Detect question complexity for smart parameter selection
  const userContent = lastUserMsg;
  const isSimpleQuestion = /^[0-9\+\-\*\/\=\s]+$/.test(userContent) || 
                           userContent.length < 20 ||
                           /what is|how much|calculate|solve/.test(userContent.toLowerCase());
  
  // Use smart streaming: streaming for complex questions, full for simple ones
  let wantsFullAnswer = explicitFull || isSimpleQuestion; // Full for simple questions, streaming for complex
  let isStreaming = !wantsFullAnswer; // Enable streaming for complex questions to show progress
  console.log(`[CHAT] Mode: ${isStreaming ? 'streaming' : 'non-streaming'} | CodeRequest: ${isCodeRequest} | Simple: ${isSimpleQuestion}`);
  
  // Optimize parameters for fastest possible generation
  let optimizedBody = { ...requestBody };
  
  // Smart model selection based on request type
  if (!optimizedBody.model) {
    optimizedBody.model = selectOptimalModel(userContent, isCodeRequest, isSimpleQuestion);
    console.log('[CHAT] Auto-selected model:', optimizedBody.model);
  }

  // Check cache first for instant responses
  const cacheKey = getCacheKey(userContent, optimizedBody.model);
  if (responseCache.has(cacheKey)) {
    const cachedResponse = responseCache.get(cacheKey);
    console.log(`[CHAT] Cache hit for: ${userContent.substring(0, 50)}...`);
    return res.json({
      model: optimizedBody.model,
      created_at: new Date().toISOString(),
      message: {
        role: 'assistant',
        content: cachedResponse
      },
      done: true,
      total_duration: 1000000, // 1ms
      cached: true
    });
  }

  // Check for instant responses (common queries)
  const instantResponse = getInstantResponse(userContent);
  if (instantResponse) {
    console.log(`[CHAT] Instant response for: ${userContent.substring(0, 50)}...`);
    // Cache this response
    if (responseCache.size >= MAX_CACHE_SIZE) {
      const firstKey = responseCache.keys().next().value;
      responseCache.delete(firstKey);
    }
    responseCache.set(cacheKey, instantResponse);
    
    return res.json({
      model: 'instant-response',
      created_at: new Date().toISOString(),
      message: {
        role: 'assistant',
        content: instantResponse
      },
      done: true,
      total_duration: 1000000, // 1ms
      instant: true
    });
  }

  // Check for instant math responses to avoid AI processing entirely
  let mathExpression = null;
  
  // Try different math patterns
  if (/^[0-9+\-*/().\s]+\??$/.test(userContent.trim())) {
    // Direct math: "2+2" or "15*23+7?"
    mathExpression = userContent.replace(/\?/g, '').trim();
  } else {
    // Pattern like "What is 15 * 23 + 7?"
    const mathMatch = userContent.match(/(?:what is|calculate|solve)\s+([0-9+\-*/().\s]+)\??/i);
    if (mathMatch) {
      mathExpression = mathMatch[1].trim();
    }
  }
  
  if (mathExpression) {
    const mathResult = evaluateMath(mathExpression);
    if (mathResult !== null) {
      console.log(`[CHAT] Instant math response: ${mathExpression} = ${mathResult}`);
      return res.json({
        model: optimizedBody.model || 'instant-math',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: `${mathExpression} = ${mathResult}`
        },
        done: true,
        total_duration: 1000000, // 1ms in nanoseconds
        instant: true
      });
    }
  }

  // Determine if user is requesting dataset analysis (multi-CSV capable)
  const csvAnalysisKeyword = /(analy\w+|summary|stats|statistic|breakdown|insight|distribution|correlation)/i.test(userContent);
  const mentionedCsvNames = (userContent.match(/[A-Za-z0-9_\-]+\.csv/gi) || []).map(s => s.toLowerCase());
  // Use user-specific CSV files if authenticated, otherwise fall back to global
  const availableCsvs = req.user ? listUserCsvFiles(req.user.id) : listCsvFiles();
  // Map available names to lookup
  const nameToFile = new Map(availableCsvs.map(f => [f.name.toLowerCase(), f]));
  const matchedFiles = [];
  for (const m of mentionedCsvNames) {
    if (nameToFile.has(m)) matchedFiles.push(nameToFile.get(m));
  }
  let selectedCsvs = [];
  if (matchedFiles.length) {
    selectedCsvs = matchedFiles.slice(0, 2); // limit to 2 for brevity
  } else if (csvAnalysisKeyword && availableCsvs.length === 1) {
    // Single dataset available; implicitly select
    selectedCsvs = [availableCsvs[0]];
  } else if (csvAnalysisKeyword && availableCsvs.length > 1 && /data\.csv/i.test(userContent)) {
    // Backward compatibility: user explicitly said data.csv but maybe others exist
    const legacy = availableCsvs.find(f => f.name.toLowerCase() === 'data.csv');
    if (legacy) selectedCsvs = [legacy];
  }
  
  // Check if user referenced non-existent datasets
  if (mentionedCsvNames.length > 0 && matchedFiles.length === 0 && availableCsvs.length === 0) {
    // User mentioned specific CSV files but none exist
    const missingFiles = mentionedCsvNames.join(', ');
    console.log('[CHAT][CSV] User referenced missing datasets:', missingFiles);
    return res.json({
      model: req.body.model,
      created_at: new Date().toISOString(),
      message: {
        role: 'assistant',
        content: `I don't see the dataset "${missingFiles}" that you referenced. This may be a pinned dataset that no longer exists on the server.\n\n**To fix this:**\n1. Upload your CSV file using the Knowledge section\n2. Or refresh the main chat page to clear the invalid pinned dataset\n3. Check that you're using the correct filename\n\nCurrently, no datasets are available in the system.`
      },
      done: true
    });
  }
  
  const wantsCsvAnalysis = selectedCsvs.length > 0;
  // Full answers are already enabled by default
  
  // Parameters optimized for ARM server capacity
  let baseTokens = 400; // Default for complex questions
  if (isSimpleQuestion) baseTokens = 100;
  if (isCodeRequest) baseTokens = 1200; // Much higher for comprehensive code generation
  
  optimizedBody.options = {
    temperature: 0.2, // Slightly higher for more natural responses
    top_p: 0.8, // Balanced for speed and quality
    top_k: 15, // Reduced for faster processing
    num_predict: baseTokens,
    num_ctx: 512, // Reduced context for speed on ARM
    repeat_penalty: 1.0, // Remove penalty for speed
    num_batch: 128, // Reduced batch size for ARM
    num_gpu_layers: 0, // Force CPU-only for this ARM server
    num_thread: 3, // Reduced to prevent CPU overload (leave 1 core for system)
    keep_alive: 3600, // Keep model loaded for 1 hour
    ...requestBody.options
  };

  // Upgrade allowances when full answer requested
  if (wantsFullAnswer) {
    let fullTokens = isSimpleQuestion ? 500 : 1200;
    if (isCodeRequest) fullTokens = 2000; // Extra high for comprehensive code responses
    optimizedBody.options.num_predict = Math.max(optimizedBody.options.num_predict || 300, fullTokens);
    optimizedBody.options.num_ctx = Math.max(optimizedBody.options.num_ctx || 1024, 2048);
  }

  // Inject multi-CSV summary if requested
  if (wantsCsvAnalysis) {
    console.log('[CHAT][CSV] Detected dataset analysis request. Files selected:', selectedCsvs.map(f=>f.name).join(', '));
    const bundleLines = [];
    for (const f of selectedCsvs) {
      // Use fast mode for large files to avoid timeouts
      const fastMode = f.size > 1024 * 1024; // 1MB+
      const csvSummary = summarizeCsv(f.abs, { maxLines: fastMode ? 1000 : 3000, correlationThreshold: fastMode ? 0.4 : 0.2 });
      if (!csvSummary) continue;
      const { file, rowsParsed, columns, columnsInfo, sampleRows, yearSummary, sizeBytes, truncated, correlations } = csvSummary;
      const sizeMB = (sizeBytes/1024/1024).toFixed(2);
      bundleLines.push(`LOCAL DATASET CONTEXT (${file}) rowsParsed=${rowsParsed} columns=${columns} size=${sizeMB}MB`);
      if (truncated) bundleLines.push('WARNING: Summary truncated at line limit for performance.');
      if (sizeBytes > 5*1024*1024) bundleLines.push('WARNING: Large file (>5MB); statistics may omit tail rows.');
      bundleLines.push('COLUMNS:');
      for (const col of columnsInfo.slice(0, 10)) {
        if (col.type === 'numeric') {
          bundleLines.push(`- ${col.column} (num) mean=${col.mean} min=${col.min} max=${col.max}`);
        } else {
          bundleLines.push(`- ${col.column} (cat) uniques~${col.uniqueCount} eg=[${col.uniqueValues.slice(0,3).join(', ')}]`);
        }
      }
      if (yearSummary?.length) {
        bundleLines.push('YEAR AVG TOTAL MARKS:');
        for (const y of yearSummary.slice(0, 6)) {
          bundleLines.push(`  ${y.year}: avgTotal=${y.avgTotalMarks} n=${y.records}`);
        }
      }
      bundleLines.push('SAMPLE ROWS:');
      // Sanitize sample rows to prevent CSV injection
      const sanitizedSamples = sampleRows.slice(0,2).map(row => {
        if (typeof row === 'string') return sanitizeCsvCell(row);
        if (typeof row === 'object') {
          const sanitized = {};
          for (const [key, value] of Object.entries(row)) {
            sanitized[key] = sanitizeCsvCell(String(value));
          }
          return JSON.stringify(sanitized);
        }
        return row;
      });
      for (const r of sanitizedSamples) bundleLines.push('  ' + r);
      if (correlations?.length) {
        bundleLines.push('CORRELATIONS (|r|>=0.2):');
        for (const c of correlations.slice(0,5)) bundleLines.push(`  ${c.a} ~ ${c.b}: r=${c.r}`); // Reduced from 8 to 5
      }
      bundleLines.push('---');
    }
    if (bundleLines.length) {
      bundleLines.push('INSTRUCTIONS: Above is parsed dataset context. Provide comparative insights (distributions, extremes, trends, correlations, anomalies). Ask user to clarify if ambiguous. Do NOT say you cannot access files.');
      if (Array.isArray(optimizedBody.messages) && optimizedBody.messages.length) {
        const lastMsg = optimizedBody.messages[optimizedBody.messages.length - 1];
        if (lastMsg.role === 'user') {
          lastMsg.content = bundleLines.join('\n') + '\n\nUSER QUESTION:\n' + lastMsg.content;
          console.log('[CHAT][CSV] Injected multi-CSV context. New length:', lastMsg.content.length);
        } else {
          optimizedBody.messages.push({ role: 'user', content: bundleLines.join('\n') + '\n\nUSER QUESTION (previous message applies).' });
          console.log('[CHAT][CSV] Appended new user message with multi-CSV context.');
        }
      }
      // Increased token limits for comprehensive code generation
      let csvTokens = wantsFullAnswer ? 1500 : 800;
      if (isCodeRequest) csvTokens = wantsFullAnswer ? 2000 : 1400; // Much higher for comprehensive Python EDA code
      optimizedBody.options.num_predict = Math.max(optimizedBody.options.num_predict || 150, csvTokens);
      optimizedBody.options.num_ctx = Math.max(optimizedBody.options.num_ctx || 768, 1536); // Reduced from 2048
      console.log('[CHAT] Injected dataset summary context for analysis request');
    } else {
      console.log('[CHAT][CSV] No dataset summaries produced');
    }
  }
  
  // Re-evaluate streaming flag after fullAnswer detection
  // Keep the determined streaming mode for better UX
  console.log(`[CHAT] ${isSimpleQuestion ? 'Simple' : 'Complex'} question; mode=${isStreaming ? 'stream' : 'complete'} tokens=${optimizedBody.options.num_predict}`);
  
  // Ensure only one model is loaded for optimal performance
  try {
    const psResponse = await fetch('http://localhost:11434/api/ps');
    if (psResponse.ok) {
      const psData = await psResponse.json();
      const loadedModels = psData.models || [];
      
      // Only unload if we have too many models (4+) to prevent memory issues
      if (loadedModels.length > 3) {
        console.log(`[CHAT] Warning: ${loadedModels.length} models loaded, may affect performance`);
        
        // Only unload oldest/largest models, keep 2-3 loaded for speed
        const sortedModels = loadedModels.sort((a, b) => b.size - a.size); // Sort by size, largest first
        let unloadCount = 0;
        for (const model of sortedModels) {
          if (model.name !== optimizedBody.model && unloadCount < loadedModels.length - 3) {
            try {
              console.log(`[CHAT] Unloading large model ${model.name} to free memory`);
              await fetch(`http://localhost:11434/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: model.name,
                  keep_alive: 0 // Unload immediately
                })
              });
              unloadCount++;
            } catch (err) {
              console.log(`[CHAT] Failed to unload ${model.name}:`, err.message);
            }
          }
        }
      }
    }
  } catch (err) {
    console.log('[CHAT] Could not check model status:', err.message);
  }
  
  // Pre-warm the model if it's not loaded to avoid loading delays
  try {
    // Create manual timeout controller
    const statusController = new AbortController();
    const statusTimeout = setTimeout(() => statusController.abort(), 5000);
    
    const modelStatus = await fetch('http://localhost:11434/api/ps', {
      signal: statusController.signal
    });
    clearTimeout(statusTimeout);
    
    if (modelStatus.ok) {
      const data = await modelStatus.json();
      // Check CPU usage instead of VRAM for ARM server
      const isModelLoaded = data.models?.some(m => m.name === optimizedBody.model);
      
      if (!isModelLoaded) {
        console.log(`[CHAT] Pre-warming model ${optimizedBody.model} for faster response`);
        
        // Create manual timeout for pre-warming
        const warmController = new AbortController();
        const warmTimeout = setTimeout(() => warmController.abort(), 15000); // Reduced to 15s
        
        // Send a tiny request to load the model with timeout
        await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: optimizedBody.model,
            prompt: "Hi",
            stream: false,
            options: { num_predict: 1, keep_alive: 3600 }
          }),
          signal: warmController.signal
        });
        clearTimeout(warmTimeout);
      }
    }
  } catch (err) {
    console.log('[CHAT] Pre-warming failed:', err.message);
  }
  
  try {
    // Add system message to prevent fake copy buttons and improve code formatting
    if (isCodeRequest && optimizedBody.messages && optimizedBody.messages.length > 0) {
      // Insert system message at the beginning
      optimizedBody.messages.unshift({
        role: 'system',
        content: 'IMPORTANT: When providing code examples, you MUST use proper markdown code blocks with triple backticks and language identifiers (e.g., ```python). Do NOT use single backticks for multi-line code. Do NOT add "Copy" buttons or "Copy" text anywhere. Example format:\n\n```python\ndef add(a, b):\n    return a + b\n```\n\nProvide clean code with brief explanations only.'
      });
    }
    
    // Set appropriate timeout based on request type
    const timeoutMs = wantsFullAnswer ? 300000 : 180000; // 5 minutes for full answers, 3 minutes for streaming
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(`http://localhost:11434/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(optimizedBody),
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Ollama chat request failed' });
    }
    
  if (isStreaming) {
      // Streaming response - token by token
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const reader = response.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } catch (error) {
          console.error('[CHAT] Streaming error:', error);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Streaming error' });
          }
        }
      };
      await pump();
    } else {
      // Non-streaming response - collect all tokens and send complete answer
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let messageData = null;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.message?.content) {
                fullResponse += data.message.content;
              }
              if (data.done) {
                messageData = data;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
        
        // Cache the response for future use (only cache if not from dataset analysis)
        if (fullResponse && fullResponse.length > 10 && !wantsCsvAnalysis && fullResponse.length < 500) {
          if (responseCache.size >= MAX_CACHE_SIZE) {
            const firstKey = responseCache.keys().next().value;
            responseCache.delete(firstKey);
          }
          responseCache.set(cacheKey, fullResponse);
          console.log(`[CHAT] Cached response for: ${userContent.substring(0, 30)}...`);
        }

        // Send complete response at once
        res.json({
          model: requestBody.model,
          created_at: new Date().toISOString(),
          message: {
            role: 'assistant',
            content: fullResponse
          },
          done: true,
          ...(messageData && { 
            total_duration: messageData.total_duration,
            prompt_eval_count: messageData.prompt_eval_count,
            eval_count: messageData.eval_count 
          })
        });
      } catch (error) {
        console.error('[CHAT] Non-streaming error:', error);
        res.status(500).json({ error: 'Non-streaming error' });
      }
    }
  } catch (error) {
    console.error('[CHAT] Chat endpoint error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Dataset discovery endpoint (define BEFORE proxy so it is handled locally) - user-specific
app.get('/api/datasets', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const files = listUserCsvFiles(userId);
    res.json({ datasets: files.map(f => ({ name: f.name, size: f.size })) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list datasets' });
  }
});

// List all uploaded files (both datasets and knowledge files) - user-specific
app.get('/api/files', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const datasets = listUserCsvFiles(userId);
    const knowledgeFiles = [];
    
    // Scan user-specific uploads directory for knowledge files
    const userUploadsDir = path.join(__dirname, 'uploads', `user_${userId}`);
    if (fs.existsSync(userUploadsDir)) {
      const files = fs.readdirSync(userUploadsDir);
      for (const file of files) {
        const filePath = path.join(userUploadsDir, file);
        const stat = fs.statSync(filePath);
        // Extract original name from timestamp prefix
        const originalName = file.replace(/^\d+_/, '');
        knowledgeFiles.push({
          filename: file,
          originalname: originalName,
          size: stat.size,
          type: 'knowledge',
          uploadedAt: stat.mtime
        });
      }
    }
    
    res.json({
      datasets: datasets.map(f => ({ ...f, type: 'dataset' })),
      knowledge: knowledgeFiles,
      total: datasets.length + knowledgeFiles.length
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Knowledge search endpoint - search through uploaded knowledge files - user-specific
app.post('/api/knowledge/search', requireAuth, async (req, res) => {
  try {
    const { query, maxResults = 3 } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const userId = req.user.id;
    const results = [];
    const userUploadsDir = path.join(__dirname, 'uploads', `user_${userId}`);
    
    console.log(`[KNOWLEDGE] Searching for: "${query}" in user ${userId} files`);
    
    if (fs.existsSync(userUploadsDir)) {
      const files = fs.readdirSync(userUploadsDir);
      console.log(`[KNOWLEDGE] Found ${files.length} files in ${userUploadsDir}`);
      
      for (const file of files) {
        const filePath = path.join(userUploadsDir, file);
        const originalName = file.replace(/^\d+_/, '');
        
        try {
          const content = await extractTextContent(filePath, originalName);
          console.log(`[KNOWLEDGE] Extracted ${content.length} chars from ${originalName}`);
          
          // Enhanced search logic
          const queryLower = query.toLowerCase();
          const contentLower = content.toLowerCase();
          
          // Check if filename is mentioned in query (like "Dhyey_Desai_Resume.pdf")
          const fileNameInQuery = originalName.toLowerCase().replace(/[._]/g, ' ');
          const isFileSpecific = queryLower.includes(fileNameInQuery) || 
                                 queryLower.includes(originalName.toLowerCase());
          
          // Search for keyword matches or if specific file is requested
          const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);
          let hasKeywordMatch = false;
          let bestMatch = '';
          let bestScore = 0;
          
          if (isFileSpecific || keywords.some(kw => contentLower.includes(kw))) {
            hasKeywordMatch = true;
            
            // Find best matching section
            const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
            
            for (const sentence of sentences) {
              const sentenceLower = sentence.toLowerCase();
              let score = 0;
              for (const keyword of keywords) {
                if (sentenceLower.includes(keyword)) score++;
              }
              if (score > bestScore) {
                bestScore = score;
                bestMatch = sentence.trim();
              }
            }
            
            // If no good sentence match, use beginning of content
            if (!bestMatch && content.length > 50) {
              bestMatch = content.substring(0, 500);
            }
          }
          
          if (hasKeywordMatch || isFileSpecific) {
            // For file-specific queries, return more content
            let chunk = bestMatch;
            if (isFileSpecific && content.length > 200) {
              chunk = content.substring(0, Math.min(1000, content.length));
            }
            
            results.push({
              filename: originalName,
              chunk: chunk || content.substring(0, 300),
              relevanceScore: isFileSpecific ? 2 : 1,
              isFileSpecific: isFileSpecific
            });
            
            console.log(`[KNOWLEDGE] Match found in ${originalName} (specific: ${isFileSpecific})`);
            
            if (results.length >= maxResults) break;
          }
        } catch (error) {
          console.error(`Error searching file ${file}:`, error);
        }
      }
    } else {
      console.log(`[KNOWLEDGE] No uploads directory found for user ${userId}`);
    }
    
    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    console.log(`[KNOWLEDGE] Returning ${results.length} results for query: "${query}"`);
    res.json({ results, query, found: results.length });
  } catch (error) {
    console.error('[KNOWLEDGE] Search error:', error);
    res.status(500).json({ error: 'Knowledge search failed' });
  }
});

// Delete file endpoint - user-specific
app.delete('/api/files/:filename', requireAuth, (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const userId = req.user.id;
    console.log(`[DELETE] Attempting to delete: ${filename} for user ${userId}`);
    
    // Check user-specific locations
    const possiblePaths = [
      path.join(__dirname, 'data', `user_${userId}`, filename),     // User dataset uploads
      path.join(__dirname, 'uploads', `user_${userId}`, filename),  // User knowledge uploads  
      // Legacy fallback (for migration period)
      path.join(__dirname, 'data', filename),     // Legacy dataset uploads
      path.join(__dirname, 'uploads', filename),  // Legacy knowledge uploads  
      path.join(__dirname, filename)              // Legacy files in root
    ];
    
    let deleted = false;
    let fileType = 'unknown';
    
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted = true;
        
        // Determine file type based on location and extension
        if (filePath.includes('/data/') || filePath.endsWith('.csv')) {
          fileType = 'dataset';
          // Clear from CSV cache
          delete _csvSummaryCache[filePath];
        } else {
          fileType = 'knowledge';
        }
        
        console.log(`[DELETE] Deleted ${fileType}: ${filename} from ${filePath}`);
        break; // Stop after first successful deletion
      }
    }
    
    if (deleted) {
      res.json({ 
        success: true, 
        message: `${fileType} file deleted successfully`,
        filename,
        type: fileType
      });
    } else {
      console.log(`[DELETE] File not found in any location: ${filename}`);
      res.status(404).json({ error: `File not found: ${filename}` });
    }
  } catch (error) {
    console.error('[DELETE] Error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Configure multer for unified file uploads (datasets + knowledge)
const unifiedStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Smart routing based on file type and user-specific directories
    const isCSV = file.originalname.toLowerCase().endsWith('.csv') || file.mimetype === 'text/csv';
    const userId = req.user ? req.user.id : 'anonymous';
    
    if (isCSV) {
      // CSV files go to user-specific data directory for dataset analysis
      const userDataDir = path.join(__dirname, 'data', `user_${userId}`);
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }
      cb(null, userDataDir);
    } else {
      // Other files go to user-specific uploads directory for knowledge base
      const userUploadsDir = path.join(__dirname, 'uploads', `user_${userId}`);
      if (!fs.existsSync(userUploadsDir)) {
        fs.mkdirSync(userUploadsDir, { recursive: true });
      }
      cb(null, userUploadsDir);
    }
  },
  filename: function (req, file, cb) {
    // Keep original filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${sanitized}`);
  }
});

const upload = multer({ 
  storage: unifiedStorage,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1 // Only one file at a time
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = {
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/json': ['.json'],
      'application/javascript': ['.js'],
      'text/javascript': ['.js'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/octet-stream': ['.py', '.java', '.go', '.rs', '.c', '.cpp', '.cs', '.rb', '.php', '.ts']
    };
    
    const allowedExtensions = ['.csv', '.txt', '.md', '.json', '.pdf', '.docx', '.doc', '.js', '.ts', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.cs', '.rb', '.php'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    const hasValidExt = allowedExtensions.includes(ext);
    
    if (!hasValidExt) {
      logSecurityEvent('FILE_UPLOAD_REJECTED', { filename: file.originalname, reason: 'invalid_extension', ip: req.ip });
      return cb(new Error('File type not allowed'));
    }
    
    const hasValidMime = Object.entries(allowedTypes).some(([mime, exts]) => {
      return file.mimetype === mime && exts.includes(ext);
    });
    
    if (!hasValidMime && file.mimetype !== 'application/octet-stream') {
      logSecurityEvent('FILE_UPLOAD_REJECTED', { filename: file.originalname, reason: 'mime_mismatch', mime: file.mimetype, ip: req.ip });
      return cb(new Error('File type mismatch'));
    }
    
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (safeName !== file.originalname) {
      logSecurityEvent('FILE_UPLOAD_SANITIZED', { original: file.originalname, sanitized: safeName, ip: req.ip });
    }
    
    cb(null, true);
  }
});

// Helper function to extract text content from uploaded files
async function extractTextContent(filePath, originalName) {
  try {
    const ext = originalName.toLowerCase().split('.').pop();
    
    switch (ext) {
      case 'txt':
      case 'csv':
      case 'md':
      case 'json':
      case 'js':
      case 'ts':
      case 'py':
      case 'java':
      case 'go':
      case 'rs':
      case 'c':
      case 'cpp':
      case 'cs':
      case 'rb':
      case 'php':
        return fs.readFileSync(filePath, 'utf8');
      
      case 'pdf':
        try {
          console.log(`[PDF] Extracting text from ${originalName}...`);
          const dataBuffer = fs.readFileSync(filePath);
          const data = await pdfParse(dataBuffer, {
            max: 100, // Maximum 100 pages to prevent timeouts
            version: 'v1.10.100'
          });
          const text = data.text || '';
          if (text.trim().length < 50) {
            return `[PDF Content: ${originalName}]\nMinimal text extracted. This may be a scanned PDF or image-based document. Consider using OCR or converting to text format.`;
          }
          console.log(`[PDF] Successfully extracted ${text.length} characters from ${originalName}`);
          return text.trim();
        } catch (pdfError) {
          console.error(`[PDF] Extraction failed for ${originalName}:`, pdfError.message);
          return `[PDF Content: ${originalName}]\nFailed to extract text: ${pdfError.message}. This may be a scanned PDF or protected document.`;
        }
      
      case 'docx':
        try {
          console.log(`[DOCX] Extracting text from ${originalName}...`);
          const result = await mammoth.extractRawText({ path: filePath });
          const text = result.value || '';
          if (text.trim().length < 20) {
            return `[Document Content: ${originalName}]\nMinimal text extracted from DOCX file.`;
          }
          console.log(`[DOCX] Successfully extracted ${text.length} characters from ${originalName}`);
          return text.trim();
        } catch (docxError) {
          console.error(`[DOCX] Extraction failed for ${originalName}:`, docxError.message);
          return `[Document Content: ${originalName}]\nFailed to extract text: ${docxError.message}`;
        }
      
      case 'doc':
        return `[Document Content: ${originalName}]\nLegacy .doc format not supported. Please convert to .docx or .txt format.`;
      
      default:
        return `[File: ${originalName}]\nUnsupported file type for text extraction. Supported: TXT, CSV, MD, JSON, PDF, DOCX, and common code files.`;
    }
  } catch (error) {
    console.error('Text extraction error:', error);
    return `[File: ${originalName}]\nError extracting text content: ${error.message}`;
  }
}

// Unified file upload endpoint (handles both datasets and knowledge files)
app.post('/api/files/upload', requireAuth, uploadLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      logSecurityEvent('FILE_UPLOAD_FAILED', { reason: 'no_file', userId: req.user?.id, ip: req.ip });
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { filename, originalname, size, path: filePath } = req.file;
    logSecurityEvent('FILE_UPLOAD_SUCCESS', { 
      userId: req.user?.id, 
      filename: originalname, 
      size, 
      mimetype: req.file.mimetype,
      ip: req.ip 
    });
    const isCSV = originalname.toLowerCase().endsWith('.csv');
    
    console.log(`[UPLOAD] File uploaded: ${originalname} -> ${filename} (${size} bytes, ${isCSV ? 'dataset' : 'knowledge'})`);
    
    let response = {
      success: true,
      filename,
      originalname,
      size,
      type: isCSV ? 'dataset' : 'knowledge'
    };
    
    if (isCSV) {
      // CSV file - goes to dataset system
      response.message = 'Dataset uploaded successfully - available for analysis';
      response.location = 'datasets';
    } else {
      // Other file - extract text and prepare for knowledge base
      const content = await extractTextContent(filePath, originalname);
      
      // Store file info for knowledge retrieval
      response.message = 'Document uploaded successfully - available for knowledge queries';
      response.location = 'knowledge';
      response.preview = content.substring(0, 200) + (content.length > 200 ? '...' : '');
      
      // TODO: Implement server-side knowledge indexing here
      // For now, we'll let the frontend handle the indexing
    }
    
    res.json(response);
  } catch (error) {
    console.error('[UPLOAD] Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Backward compatibility endpoint for dataset uploads
app.post('/api/datasets/upload', upload.single('dataset'), async (req, res) => {
  req.body.file = req.file; // Redirect to unified handler
  req.url = '/api/files/upload';
  return app._router.handle(req, res);
});

// Apply Ollama proxy for other endpoints (tags, generate, etc.)
app.use('/api', ollamaProxy);

// Simple health endpoint to verify Ollama connectivity without relying on proxy chain
app.get('/ollama-health', async (req, res) => {
  try {
    const r = await fetch(`${ollamaHost}/api/tags`, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    if (!r.ok) {
      return res.status(502).json({ ok: false, status: r.status });
    }
    const data = await r.json();
    res.json({ 
      ok: true, 
      modelCount: data.models?.length || 0,
      models: data.models?.map(m => ({ name: m.name, size: m.size })) || []
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// User database functions
const getUsersDb = () => {
  try {
    const data = fs.readFileSync(process.env.USER_DATA_FILE || './data/users.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { users: [], sessions: {}, lastUserId: 0 };
  }
};

const saveUsersDb = (data) => {
  fs.writeFileSync(process.env.USER_DATA_FILE || './data/users.json', JSON.stringify(data, null, 2));
};

const findUserByEmail = (email) => {
  const db = getUsersDb();
  return db.users.find(user => user.email === email);
};

const findUserById = (id) => {
  const db = getUsersDb();
  return db.users.find(user => user.id === id);
};

const createUser = async (email, password, name = '', provider = 'local', googleId = null) => {
  const db = getUsersDb();
  const hashedPassword = provider === 'local' ? await bcrypt.hash(password, 10) : null;
  
  const newUser = {
    id: ++db.lastUserId,
    email,
    password: hashedPassword,
    name,
    provider,
    googleId,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };
  
  db.users.push(newUser);
  saveUsersDb(db);
  return newUser;
};

// Passport Local Strategy
passport.use(new LocalStrategy({
  usernameField: 'email'
}, async (email, password, done) => {
  try {
    const user = findUserByEmail(email);
    if (!user) {
      return done(null, false, { message: 'User not found' });
    }
    if (user.provider !== 'local') {
      return done(null, false, { message: 'Please use Google sign-in for this account' });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return done(null, false, { message: 'Invalid password' });
    }
    // Update last login
    const db = getUsersDb();
    const userIndex = db.users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      db.users[userIndex].lastLogin = new Date().toISOString();
      saveUsersDb(db);
    }
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Passport Google Strategy (restored after patch corruption)
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.PUBLIC_URL || 'http://localhost:8000'}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = findUserByEmail(profile.emails[0].value);
    if (user) {
      if (user.provider !== 'google') {
        return done(null, false, { message: 'Account exists with different provider' });
      }
      // Update last login
      const db = getUsersDb();
      const userIndex = db.users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        db.users[userIndex].lastLogin = new Date().toISOString();
        saveUsersDb(db);
      }
      return done(null, user);
    }
    // Create new user
    user = await createUser(
      profile.emails[0].value,
      null,
      profile.displayName,
      'google',
      profile.id
    );
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = findUserById(id);
  done(null, user);
});

// Auth routes
app.post('/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const user = await createUser(email, password, name || '');
    
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed after registration' });
      }
      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name,
          provider: user.provider 
        } 
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/auth/login', authLimiter, (req, res, next) => {
  logSecurityEvent('LOGIN_ATTEMPT', { email: req.body.email, ip: req.ip, userAgent: req.headers['user-agent'] });
  
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Authentication error:', err);
      logSecurityEvent('AUTH_ERROR', { email: req.body.email, error: err.message, ip: req.ip });
      return res.status(500).json({ error: 'Authentication error' });
    }
    
    if (!user) {
      logSecurityEvent('LOGIN_FAILED', { email: req.body.email, reason: info?.message, ip: req.ip });
      return res.status(401).json({ error: info.message || 'Invalid credentials' });
    }
    
    req.session.regenerate((regenerateErr) => {
      if (regenerateErr) {
        console.error('[SECURITY] Session regeneration failed:', regenerateErr);
        return res.status(500).json({ error: 'Login failed' });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Session creation failed:', loginErr);
          logSecurityEvent('SESSION_ERROR', { userId: user.id, error: loginErr.message, ip: req.ip });
          return res.status(500).json({ error: 'Login failed' });
        }
        
        req.session.loginTime = Date.now();
        logSecurityEvent('LOGIN_SUCCESS', { userId: user.id, email: user.email, ip: req.ip, provider: user.provider });
        
        res.json({ 
          success: true, 
          user: { 
            id: user.id, 
            email: user.email, 
            name: user.name,
            provider: user.provider 
          } 
        });
      });
    });
  })(req, res, next);
});

app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

app.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/login.html?error=google_auth_failed'
}), (req, res) => {
  res.redirect('/?auth=success');
});

// Test endpoint to check user data directories (dev only)
app.get('/api/debug/user-data', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const userDataDir = path.join(__dirname, 'data', `user_${userId}`);
    const userUploadsDir = path.join(__dirname, 'uploads', `user_${userId}`);
    
    const info = {
      userId,
      dataDir: {
        exists: fs.existsSync(userDataDir),
        files: fs.existsSync(userDataDir) ? fs.readdirSync(userDataDir) : []
      },
      uploadsDir: {
        exists: fs.existsSync(userUploadsDir),
        files: fs.existsSync(userUploadsDir) ? fs.readdirSync(userUploadsDir) : []
      }
    };
    
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/auth/logout', (req, res) => {
  const userId = req.user?.id;
  const email = req.user?.email;
  
  if (userId) {
    cleanupUserData(userId);
    logSecurityEvent('LOGOUT', { userId, email, ip: req.ip });
  }
  
  req.logout((err) => {
    if (err) {
      logSecurityEvent('LOGOUT_ERROR', { userId, error: err.message, ip: req.ip });
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error('[SECURITY] Session destruction failed:', destroyErr);
      }
      res.clearCookie('multillm.sid');
      res.json({ success: true });
  });
});

app.post('/auth/check-email', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  const user = findUserByEmail(email);
  
  if (user) {
    res.json({ 
      exists: true, 
      provider: user.provider 
    });
  } else {
    res.json({ 
      exists: false 
    });
  }
});

app.get('/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ 
      user: { 
        id: req.user.id, 
        email: req.user.email, 
        name: req.user.name,
        provider: req.user.provider 
      } 
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});


// Serve static files from the site directory
app.use(express.static(path.join(__dirname, 'site')));

// Handle client-side routing - send index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MultiLLM app running on http://localhost:${PORT}`);
  console.log('Make sure Ollama is running with: OLLAMA_ORIGINS=* ollama serve');
  console.log('Or use the start.sh script to start both services automatically');
  
  // Pre-warm the fastest model for immediate availability
  setTimeout(async () => {
    try {
      console.log('[STARTUP] Pre-warming llama3.2:3b for faster initial responses');
      await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2:3b',
          prompt: 'Hello',
          stream: false,
          options: { num_predict: 1, keep_alive: 900 }
        })
      });
      console.log('[STARTUP] Model pre-warming completed');
    } catch (err) {
      console.log('[STARTUP] Pre-warming failed:', err.message);
    }
  }, 5000); // Wait 5 seconds after startup
});
