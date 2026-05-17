const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const os = require("os");

// ─── CONFIG ────────────────────────────────────────────────────────────────
const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = ".l";

const MOONSEC_DIR = path.join(__dirname, "MoonsecDeobfuscator-master");
const PROMETHEUS_SCRIPT = path.join(
  __dirname,
  "Prometheus-WeAre-Devs-Dumper-main",
  "deobfuscator.py"
);
const TMP = path.join(os.tmpdir(), "deobf-bot");

if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

// ─── BOT CLIENT ────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ─── HELPERS ───────────────────────────────────────────────────────────────
function tmpFile(ext) {
  return path.join(TMP, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
}

function downloadAttachment(url, dest) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    lib.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", reject);
  });
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 60_000, ...opts }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || stdout || err.message));
      resolve({ stdout, stderr });
    });
  });
}

function cleanTmp(...files) {
  for (const f of files) {
    try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch {}
  }
}

function embed(color, title, desc) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(desc)
    .setTimestamp();
}

// ─── COMMAND HANDLERS ──────────────────────────────────────────────────────

// .l moonsec [attach .lua]     → disassembly MoonSec V3
// .l moonsdis [attach .lua]    → disassembly MoonSec V3
// .l prom [attach .lua]        → Prometheus/WeAreDevs deobfuscator
// .l help                      → show all commands

async function handleMoonsec(msg, mode) {
  const att = msg.attachments.first();
  if (!att || !att.name.endsWith(".lua")) {
    return msg.reply({ embeds: [embed("#ff4444", "❌ Error", "Adjunta un archivo `.lua` junto con el comando.")] });
  }

  const inputFile = tmpFile(".lua");
  const outputFile = tmpFile(mode === "-dev" ? ".bin" : ".txt");

  const loading = await msg.reply({ embeds: [embed("#7b2fff", "⏳ Procesando...", `Ejecutando **MoonsecDeobfuscator** (modo \`${mode === "-dev" ? "devirtualize" : "disassembly"}\`)...`)] });

  try {
    await downloadAttachment(att.url, inputFile);

    // Build first if binary not present
    const exePath = path.join(MOONSEC_DIR, "bin", "Release", "net9.0", "MoonsecDeobfuscator");
    const exePathWin = exePath + ".exe";
    const exe = fs.existsSync(exePathWin) ? exePathWin : exePath;

    if (!fs.existsSync(exe)) {
      // dotnet run as fallback
      await run("dotnet", ["run", "--project", MOONSEC_DIR, "--configuration", "Release", "--", mode, "-i", inputFile, "-o", outputFile], { cwd: MOONSEC_DIR });
    } else {
      await run(exe, [mode, "-i", inputFile, "-o", outputFile]);
    }

    if (!fs.existsSync(outputFile) || fs.statSync(outputFile).size === 0) {
      throw new Error("El deobfuscator no generó ningún output. El script puede no estar obfuscado con MoonSec V3.");
    }

    const fileSize = fs.statSync(outputFile).size;
    const ext = mode === "-dev" ? ".bin" : ".lua";
    const outName = att.name.replace(".lua", `_deobf${ext}`);

    const attachment = new AttachmentBuilder(outputFile, { name: outName });

    await loading.edit({
      embeds: [embed(
        "#00e676",
        "✅ MoonsecDeobfuscator",
        `**Archivo:** \`${att.name}\`\n**Modo:** \`${mode === "-dev" ? "Devirtualize → bytecode" : "Disassembly → texto"}\`\n**Tamaño output:** \`${(fileSize / 1024).toFixed(1)} KB\``
      )],
      files: [attachment],
    });
  } catch (err) {
    await loading.edit({ embeds: [embed("#ff4444", "❌ MoonsecDeobfuscator falló", `\`\`\`${err.message.slice(0, 1800)}\`\`\``)] });
  } finally {
    cleanTmp(inputFile, outputFile);
  }
}

async function handlePrometheus(msg) {
  const att = msg.attachments.first();
  if (!att || !att.name.endsWith(".lua")) {
    return msg.reply({ embeds: [embed("#ff4444", "❌ Error", "Adjunta un archivo `.lua` junto con el comando.")] });
  }

  const inputFile = tmpFile(".lua");
  const reportFile = inputFile + ".report.txt";
  const deobfFile  = inputFile + ".deobf.lua";

  const loading = await msg.reply({ embeds: [embed("#7b2fff", "⏳ Procesando...", "Ejecutando **Prometheus/WeAreDevs Deobfuscator**...\nEsto puede tardar hasta 20 seg.")] });

  try {
    await downloadAttachment(att.url, inputFile);

    await run("python3", [PROMETHEUS_SCRIPT, inputFile], {
      cwd: path.dirname(PROMETHEUS_SCRIPT),
    });

    // Try deobfuscated file first, else report
    const candidates = [deobfFile, reportFile].filter(f => fs.existsSync(f) && fs.statSync(f).size > 0);

    if (candidates.length === 0) {
      throw new Error("No se generó output. El script puede no ser compatible con Prometheus/WeAreDevs.");
    }

    const files = candidates.map((f, i) => {
      const ext = f.endsWith(".lua") ? ".lua" : ".txt";
      const label = f.endsWith(".lua") ? "deobf" : "report";
      return new AttachmentBuilder(f, { name: att.name.replace(".lua", `_${label}${ext}`) });
    });

    await loading.edit({
      embeds: [embed(
        "#00e676",
        "✅ Prometheus Deobfuscator",
        `**Archivo:** \`${att.name}\`\n**Outputs:** ${candidates.map(f => `\`${path.basename(f)}\``).join(", ")}\n**Archivos adjuntos:** ${files.length}`
      )],
      files,
    });
  } catch (err) {
    await loading.edit({ embeds: [embed("#ff4444", "❌ Prometheus falló", `\`\`\`${err.message.slice(0, 1800)}\`\`\``)] });
  } finally {
    cleanTmp(inputFile, reportFile, deobfFile);
  }
}

function sendHelp(msg) {
  const helpEmbed = new EmbedBuilder()
    .setColor("#7b2fff")
    .setTitle("🔓 Lua Deobfuscator Bot")
    .setDescription("Bot para deobfuscar scripts Lua/Roblox obfuscados.")
    .addFields(
      {
        name: "`.l moonsec` + adjunto `.lua`",
        value: "Devirtualiza scripts obfuscados con **MoonSec V3**.\nOutput: bytecode Lua 5.1 (`.bin`)",
      },
      {
        name: "`.l moonsdis` + adjunto `.lua`",
        value: "Genera el **disassembly** de scripts MoonSec V3.\nOutput: texto legible (`.lua`)",
      },
      {
        name: "`.l prom` + adjunto `.lua`",
        value: "Deobfusca scripts de **Prometheus / WeAreDevs** usando trace-based emulation.\nOutput: `.lua` deobfuscado + `.txt` report",
      },
      {
        name: "`.l help`",
        value: "Muestra este menú.",
      }
    )
    .addFields({
      name: "⚙️ Notas",
      value:
        "• Solo archivos `.lua` (max 8 MB)\n• Timeout: 60 seg por operación\n• MoonsecDeobfuscator requiere `.NET 9` instalado en el servidor",
    })
    .setFooter({ text: "Lua Deobfuscator Bot • Railway" })
    .setTimestamp();

  return msg.reply({ embeds: [helpEmbed] });
}

// ─── MESSAGE HANDLER ───────────────────────────────────────────────────────
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.toLowerCase().startsWith(PREFIX)) return;

  const args = msg.content.slice(PREFIX.length).trim().split(/\s+/);
  const sub = args[0]?.toLowerCase();

  try {
    if (sub === "moonsec") return await handleMoonsec(msg, "-dis");
    if (sub === "moonsdis") return await handleMoonsec(msg, "-dis");
    if (sub === "prom") return await handlePrometheus(msg);
    if (sub === "help" || !sub) return await sendHelp(msg);

    await msg.reply({ embeds: [embed("#ff4444", "❌ Comando desconocido", `Usa \`.l help\` para ver los comandos disponibles.`)] });
  } catch (err) {
    console.error(err);
    await msg.reply({ embeds: [embed("#ff4444", "❌ Error interno", `\`${err.message}\``)] }).catch(() => {});
  }
});

// ─── READY ─────────────────────────────────────────────────────────────────
client.once("ready", () => {
  console.log(`✅  Bot listo como ${client.user.tag}`);
  client.user.setActivity(".l help", { type: 3 }); // WATCHING
});

client.login(TOKEN);
   
