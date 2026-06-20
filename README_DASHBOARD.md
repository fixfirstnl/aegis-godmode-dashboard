# AEGIS GODMODE v2.20 - Extended Dashboard

> **Autonome 24/7 Trading Dashboard** voor MT5 Multi-Terminal Management

---

## 📋 Overzicht

De AEGIS GODMODE Extended Dashboard is een volledig web-based dashboard voor het beheren van meerdere MT5 terminals, real-time monitoring, P&L tracking, alert management, en Telegram integratie.

**Versie**: 2.20  
**Status**: Productie-Ready  
**Laatste update**: 2026-06-20  

---

## 🚀 Features

| Feature | Status | Beschrijving |
|---------|--------|-------------|
| Multi-Terminal Overzicht | ✅ | Bekijk alle 4 terminals tegelijk |
| Real-time P&L Chart | ✅ | Equity curve per terminal (Chart.js) |
| Positie Management | ✅ | Open/close posities per terminal |
| Alert System | ✅ | Drempel alerts + Telegram notificaties |
| Economic Calendar | ✅ | Belangrijke forex events |
| Telegram Chat | ✅ | Interactieve chat widget |
| Logging System | ✅ | Gedetailleerde logs + download |
| Instellingen | ✅ | Configuratie via web UI |
| Mobile Responsive | ✅ | Werkt op alle apparaten |
| Auto-Refresh | ✅ | 5-30 seconden interval |

---

## 🏗️ Architectuur

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Pages (Frontend)                   │
│         https://staxpilot.com/dashboard_v2.html             │
├─────────────────────────────────────────────────────────────┤
│                    Cloudflare Worker (API)                   │
│         https://aegis-godmode-api.fixfirstnl-1db.workers.dev│
├─────────────────────────────────────────────────────────────┤
│                    Cloudflare D1 Database                    │
│         SQLite database in de cloud (9 tabellen)             │
├─────────────────────────────────────────────────────────────┤
│                    Flask Backend (Lokaal)                    │
│         aegis_web_dashboard_v2.py (poort 5000)               │
│         MT5 connectie + data collector + alert engine        │
├─────────────────────────────────────────────────────────────┤
│                    MT5 Terminals (Lokaal)                    │
│         Terminal 1-4 met verschillende strategies             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Bestanden

| Bestand | Pad | Doel |
|---------|-----|------|
| `dashboard_v2.html` | `04_Tools/templates/index_v2.html` | Frontend dashboard |
| `aegis_web_dashboard_v2.py` | `04_Tools/aegis_web_dashboard_v2.py` | Flask backend |
| `database.py` | `04_Tools/database.py` | SQLite database (lokaal) |
| `index.js` | `04_Tools/worker/index.js` | Cloudflare Worker code |
| `aegis.env` | `04_Tools/aegis.env` | Environment configuratie |
| `_headers` | `04_Tools/_headers` | CSP headers voor GitHub Pages |
| `README_DASHBOARD.md` | `04_Tools/README_DASHBOARD.md` | Dit document |

---

## ⚡ Quick Start

### 1. Start het Dashboard (Lokaal)

```bash
# Navigeer naar de project map
cd "04_Tools"

# Start de Flask backend
python aegis_web_dashboard_v2.py
# Dashboard beschikbaar op: http://localhost:5000
```

### 2. Open de Cloudflare versie

```
https://staxpilot.com/dashboard_v2.html
```

### 3. Configureer Telegram (Optioneel)

1. Maak een bot aan via [@BotFather](https://t.me/botfather)
2. Kopieer je bot token
3. Plak het in `aegis.env`:
   ```bash
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxyz
   TELEGRAM_CHAT_ID=123456789
   ```
4. Herstart de Flask backend

---

## 🔧 Configuratie

### Environment Variables (`aegis.env`)

```bash
# MT5 Terminal PIDs (4 terminals)
TERMINAL1_PID=1234
TERMINAL2_PID=5678
TERMINAL3_PID=9012
TERMINAL4_PID=3456

# Telegram
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
TELEGRAM_CHAT_ID=YOUR_CHAT_ID_HERE

# Cloudflare
CF_API_TOKEN=YOUR_CF_TOKEN
WORKER_NAME=aegis-godmode-api
WORKER_URL=https://aegis-godmode-api.fixfirstnl-1db.workers.dev

# D1 Database
D1_DATABASE_NAME=aegis-godmode-db
D1_DATABASE_ID=020e1668-088e-475c-9ec2-b86c495f07b6
```

### Dashboard Instellingen (Web UI)

Ga naar de **Instellingen** tab in het dashboard om:
- API URL te wijzigen
- Auto-refresh interval aan te passen
- Alert drempels te configureren
- Telegram settings te testen

---

## 📊 Database Schema (D1)

### Tabellen (9 total)

| Tabel | Kolommen | Doel |
|-------|----------|------|
| `terminals` | id, name, pid, balance, equity, profit, positions, connected | Terminal status |
| `trades` | id, terminal_id, symbol, type, volume, open_price, profit, open_time, status | Trade history |
| `signals` | id, symbol, type, strategy, entry, sl, tp, status, created_at | Trading signals |
| `metrics` | id, metric_name, value, terminal_id, timestamp | Performance metrics |
| `equity_history` | id, terminal_id, equity, profit, timestamp | Equity tracking |
| `alerts_config` | id, type, threshold, enabled, message | Alert configuratie |
| `alerts_history` | id, type, message, status, created_at | Alert geschiedenis |
| `logs` | id, level, message, source, timestamp | Systeem logs |
| `config` | id, key, value | Dashboard configuratie |

---

## 🔌 API Endpoints (Worker)

| Endpoint | Method | Beschrijving |
|----------|--------|-------------|
| `/api/terminals` | GET | Alle terminals |
| `/api/terminals/overview` | GET | Samenvatting + terminals |
| `/api/connect` | POST | Verbind met terminal |
| `/api/data` | GET | Account + posities |
| `/api/history/equity` | GET | Equity geschiedenis |
| `/api/position/close` | POST | Sluit positie |
| `/api/position/closeall` | POST | Sluit alle posities |
| `/api/signals` | GET | Trading signals |
| `/api/alerts/config` | GET/POST | Alert configuratie |
| `/api/alerts/history` | GET | Alert geschiedenis |
| `/api/logs` | GET | Systeem logs |
| `/api/logs/download` | GET | Download logs als CSV |
| `/api/config` | GET/POST | Dashboard configuratie |
| `/api/calendar` | GET | Economic calendar |
| `/api/telegram/test` | POST | Test Telegram bot |

---

## 🧪 Testing

### Dashboard Test

```bash
# 1. Start backend
cd "04_Tools" && python aegis_web_dashboard_v2.py

# 2. Open in browser
open http://localhost:5000

# 3. Test alle tabs:
#    - Overzicht: Verbind terminal 1
#    - Multi-Terminal: Check alle 4 terminals
#    - P&L Chart: Selecteer terminal
#    - Posities: Bekijk open trades
#    - Logs: Check systeem logs
#    - Alerts: Test alert configuratie
#    - Kalender: Bekijk events
#    - Telegram: Stuur test bericht
#    - Instellingen: Wijzig configuratie
```

### Worker Test

```bash
# Test worker endpoints
curl https://aegis-godmode-api.fixfirstnl-1db.workers.dev/api/terminals
curl https://aegis-godmode-api.fixfirstnl-1db.workers.dev/api/alerts/config
```

---

## 🛠️ Troubleshooting

### Probleem: Dashboard laadt niet

**Oplossing**:
1. Check of `aegis_web_dashboard_v2.py` draait: `curl http://localhost:5000/api/terminals`
2. Check browser console voor CORS errors
3. Verifieer `_headers` file correct gedeployed

### Probleem: "undefined" terminals count

**Oplossing**: De worker retourneert geen `ok: true` veld. Check `index.js` of alle responses `ok: true` bevatten.

### Probleem: Telegram werkt niet

**Oplossing**:
1. Controleer `TELEGRAM_BOT_TOKEN` in `aegis.env`
2. Start een chat met je bot: `@your_bot_name`
3. Verkrijg chat ID: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Plak chat ID in `aegis.env`

### Probleem: Worker deploy faalt

**Oplossing**:
```bash
# 1. Check of je ingelogd bent
wrangler whoami

# 2. Login indien nodig
wrangler login

# 3. Deploy
wrangler deploy index.js
```

---

## 🔒 Security Best Practices

- ✅ Geen hardcoded tokens in code
- ✅ Gebruik environment variables (`aegis.env`)
- ✅ CSP headers via `_headers` file
- ✅ Input validatie op alle endpoints
- ✅ Password fields voor secrets in UI
- ❌ Deel `aegis.env` nooit via Git
- ❌ Gebruik nooit productie tokens in development

---

## 📱 Mobile Support

Het dashboard is volledig responsive:
- **Desktop**: 4 kolommen grid, volledige sidebar
- **Tablet**: 2 kolommen grid, compacte tabs
- **Mobiel**: 1 kolom, horizontale tab scroll, compacte statistieken

---

## 🔄 Auto-Refresh Intervals

| Component | Interval | Endpoint |
|-----------|----------|----------|
| Terminals list | 30 sec | `/api/terminals` |
| Multi-terminal | 10 sec | `/api/terminals/overview` |
| Dashboard data | 5 sec | `/api/data` |
| Equity chart | Bij tab switch | `/api/history/equity` |
| Logs | Bij tab switch | `/api/logs` |
| Alerts | Bij tab switch | `/api/alerts/config` |
| Calendar | Bij tab switch | `/api/calendar` |

---

## 📝 Log Levels

| Level | Kleur | Gebruik |
|-------|-------|---------|
| DEBUG | Grijs | Ontwikkelinformatie |
| INFO | Blauw | Algemene events |
| SUCCESS | Groen | Succesvolle acties |
| WARNING | Oranje | Waarschuwingen |
| ERROR | Rood | Fouten |
| CRITICAL | Rood + bold | Kritieke fouten |

---

## 🎯 Performance Tips

1. **Worker caching**: Responses worden 5 seconden gecached
2. **D1 indexing**: Equity history heeft index op `timestamp`
3. **Lazy loading**: Tabs laden pas bij activatie
4. **Chart optimalisatie**: Max 100 data punten per chart
5. **Log rotatie**: Automatisch na 1000 entries

---

## 🚀 Deployment Checklist

- [ ] Worker code geüpload (`wrangler deploy`)
- [ ] D1 database geconfigureerd
- [ ] `_headers` file in GitHub repo
- [ ] `aegis.env` correct ingevuld (GEEN secrets in Git)
- [ ] Telegram bot aangemaakt + geconfigureerd
- [ ] Flask backend getest op localhost
- [ ] Alle 9 tabs getest in dashboard
- [ ] Mobile responsive getest
- [ ] Security audit uitgevoerd
- [ ] README_DASHBOARD.md bijgewerkt

---

## 📞 Support

Voor vragen of issues:
1. Check dit README eerst
2. Bekijk de logs in het dashboard (Logs tab)
3. Test de worker endpoints via curl
4. Raadpleeg de Flask backend logs

---

**AEGIS GODMODE v2.20** — Autonome Trading Dashboard  
*Built for 24/7 autonomous trading operations*
