# 🔓 Lua Deobfuscator Bot

Bot de Discord para deobfuscar scripts Lua/Roblox. Soporta **MoonSec V3** y **Prometheus/WeAreDevs**.

---

## 📋 Comandos (prefijo `.l`)

| Comando | Descripción |
|---|---|
| `.l moonsec` + `.lua` | Devirtualiza MoonSec V3 → bytecode `.bin` |
| `.l moonsdis` + `.lua` | Disassembly MoonSec V3 → texto legible |
| `.l prom` + `.lua` | Deobfusca Prometheus/WeAreDevs → `.lua` + report |
| `.l help` | Muestra ayuda |

---

## ⚙️ Permisos en Discord Developer Portal

### 1. Ve a https://discord.com/developers/applications → tu app → Bot

Activa estos **Privileged Gateway Intents**:
- ✅ **MESSAGE CONTENT INTENT** ← obligatorio para leer mensajes
- ✅ **SERVER MEMBERS INTENT** (opcional, para features futuras)
- ✅ **PRESENCE INTENT** (opcional)

### 2. OAuth2 → URL Generator

**Scopes:**
- ✅ `bot`

**Bot Permissions:**
- ✅ Read Messages / View Channels
- ✅ Send Messages
- ✅ Attach Files
- ✅ Embed Links
- ✅ Read Message History

### 3. Copia la URL generada y úsala para invitar el bot a tu servidor.

---

## 🚀 Deploy en Railway

### Paso 1 — Sube el proyecto
1. Crea un repo en GitHub y sube todos estos archivos
2. Ve a [railway.app](https://railway.app) → New Project → Deploy from GitHub repo

### Paso 2 — Variables de entorno
En Railway → tu proyecto → **Variables**, agrega:

```
DISCORD_TOKEN = tu_token_aqui
```

### Paso 3 — Railway detecta `nixpacks.toml` automáticamente
- Instala `.NET 9`, `Python 3`, `Node 20`
- Buildea MoonsecDeobfuscator con `dotnet build`
- Inicia el bot con `node index.js`

### Paso 4 — Deploy
Haz push al repo → Railway redeploya automáticamente.

---

## 📁 Estructura del proyecto

```
deobf-bot/
├── index.js                          ← Bot principal
├── package.json
├── nixpacks.toml                     ← Config de Railway
├── .env.example
├── MoonsecDeobfuscator-master/       ← Deobfuscator C# (.NET 9)
│   ├── MoonsecDeobfuscator.csproj
│   └── src/...
└── Prometheus-WeAre-Devs-Dumper-main/ ← Deobfuscator Python
    ├── deobfuscator.py
    └── lua_bin/...
```
