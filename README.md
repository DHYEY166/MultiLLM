## MultiLLM

MultiLLM is a privacy-first multi-model AI chat and document interaction platform featuring: per-user data isolation, secure authentication, intelligent local model routing, streaming responses, a local knowledge base, and optional Google Analytics event tracking.

Live demo: https://multillm.app

---
### Key Features
* Email/password authentication (bcrypt) and optional Google OAuth
* Per-user directory isolation; automatic cleanup on logout
* Intelligent routing across multiple Ollama models with fallback
* Streaming responses with stop control
* Knowledge base: PDF (text), DOCX, CSV, TXT, MD, JSON, code files, ipynb (code cells)
* Local parsing only (no external file services)
* Task classification → model tier selection
* Optional web access plugin (DuckDuckGo, Open‑Meteo) disabled by default
* Minimal GA4 event tracking (auth, chat, uploads, page views)
* Security: Helmet, rate limiting, CSP, HSTS (behind TLS), secure sessions

---
### Model Tiers (Suggested)
Ultra-Fast: llama3.2:1b (1.3 GB)
Fast (Code): deepseek-coder:1.3b (0.8 GB)
Balanced: phi3:mini (2.2 GB)
Reliable: llama3.2:3b (2.0 GB)
Quality: llama3.1:8b (4.9 GB)
Total (~11.3 GB if all installed)

---
### Quick Start
Prerequisites: macOS/Linux, Node.js 18+, Ollama installed.
1. Install Ollama (https://ollama.ai) and pull desired models.
2. Export origin and start Ollama:
   export OLLAMA_ORIGINS=http://localhost:8000
   ollama serve
3. Clone & install:
   git clone https://github.com/DHYEY166/MultiLLM.git
   cd MultiLLM
   npm install
   cp .env.example .env
4. Edit .env then:
   npm start
5. Open http://localhost:8000

If header shows "Ollama: Offline", ensure ollama serve is running and OLLAMA_ORIGINS matches site origin.

---
### Environment Variables
PORT=8000
NODE_ENV=development
SESSION_SECRET=change-this-to-a-long-random-string
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
USER_DATA_FILE=./data/users.json
OLLAMA_HOST=http://localhost:11434
REDIS_URL=redis://localhost:6379

Production tips:
* Set NODE_ENV=production
* Use reverse proxy (nginx) + TLS
* Strong SESSION_SECRET
* Redis for session storage

---
### Optional Google Analytics
Events implemented in site/js/googleAnalytics.js:
sign_up, login, logout, chat_interaction, file_upload, feature_usage, page_view.
Set your GA measurement ID in that file or remove the script tag references to disable.

---
### Security & Privacy
* Data never leaves server except optional web queries when plugin enabled
* Automatic per-user directory cleanup on logout
* Rate limiting + Helmet headers + CSP
* Optional web access off by default

---
### Knowledge Base
Supported: PDF (text), DOCX, TXT, MD, CSV, JSON, ipynb (code), common code files (py, js, ts, java, go, rs, c, cpp, cs, rb, php). If PDF import fails (image-only), extract text manually and paste.

---
### Repository Structure
server.js                # Express server, auth, routing
package.json             # Scripts & deps
.env.example             # Environment template
LICENSE                  # MIT License
data/users.json          # User store (created automatically)
site/                    # Frontend
  index.html             # Chat UI
  login.html             # Auth
  knowledge.html         # Knowledge base
  analytics.html         # Basic usage metrics
  models.html            # Models list
  admin.html             # Preferences & cleanup
  styles.css             # Styling
  js/                    # Frontend modules (auth, llm, router, analytics, etc.)
vendor/                  # Local pdf.js, mammoth assets

---
### Troubleshooting
Ollama Offline: restart ollama serve with correct OLLAMA_ORIGINS.
Missing Model: ollama pull <model>.
PDF Fails: likely scanned; extract text externally.
GA Not Recording: verify measurement ID & network requests.
Port In Use: stop conflicting process or change PORT.

Performance: use smaller models when possible, enable Redis, limit parallel large document ingestion.

---
### Contributing
1. Fork repository
2. Create feature branch
3. Implement & test
4. Open pull request with summary

---
### License
MIT License (see LICENSE).

---
### Support
Live: https://multillm.app
Issues: https://github.com/DHYEY166/MultiLLM/issues
Release Notes: Use commit history or GitHub Releases (no tracked CHANGELOG file).
Security issues: open a private issue if sensitive.
