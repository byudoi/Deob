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

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = ".l";

const MOONSEC_DIR = path.join(__dirname, "MoonsecDeobfuscator-master");
const PROMETHEUS_SCRIPT = path.join(__dirname, "Prometheus-WeAre-Devs-Dumper-main", "deobfuscator.py");
const UNLUAC_JAR = path.join(__dirname, "unluac.jar");
const TMP = path.join(os.tmpdir(), "deobf-bot");

if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

function tmpFile(ext) {
  return path.join(TMP, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302)
        return fetchText(res.headers.location).then(resolve).catch(reject);
      if (res.statusCode !== 200) return reject(new Error("HTTP " + res.statusCode));
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 90000, maxBuffer: 50 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
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
  return new EmbedBuilder().setColor(color).setTitle(title).setDescription(desc).setTimestamp();
}

async function resolveScript(msg) {
  // 1. Adjunto .lua o .txt
  const att = msg.attachments.find((a) => a.name.endsWith(".lua") || a.name.endsWith(".txt"));
  if (att) {
    const content = await fetchText(att.url);
    return { content, name: att.name.replace(/\.txt$/, ".lua") };
  }

  // 2. URL raw en el texto del mensaje
  const urlArg = msg.content.split(/\s+/).find((a) => a.startsWith("http://") || a.startsWith("https://"));
  if (urlArg) {
    const content = await fetchText(urlArg);
    const urlName = urlArg.split("/").pop().split("?")[0];
    const name = (urlName.endsWith(".lua") || urlName.endsWith(".txt"))
      ? urlName.replace(/\.txt$/, ".lua")
      : "script.lua";
    return { content, name };
  }

  return null;
}

async function handleMoonsec(msg) {
  const loading = await msg.reply({
    embeds: [embed("#7b2fff", "⏳ Procesando...", "**MoonsecDeobfuscator** → bytecode → **unluac** → Lua limpio...")],
  });

  const inputFile  = tmpFile(".lua");
  const binFile    = tmpFile(".bin");
  const outputFile = tmpFile(".lua");

  try {
    const script = await resolveScript(msg);
    if (!script) {
      return loading.edit({
        embeds: [embed("#ff4444", "❌ Error", "Adjunta un `.lua`, `.txt` o pon un link raw.\nEj: `.l moonsec https://raw.githubusercontent.com/.../script.lua`")],
      });
    }

    fs.writeFileSync(inputFile, script.content);

    // Paso 1: MoonsecDeobfuscator → .bin
    const exeBase = path.join(MOONSEC_DIR, "bin", "Release", "net9.0", "MoonsecDeobfuscator");
    const exe = fs.existsSync(exeBase + ".exe") ? exeBase + ".exe" : exeBase;

    if (fs.existsSync(exe)) {
      await run(exe, ["-dev", "-i", inputFile, "-o", binFile]);
    } else {
      await run("dotnet", [
        "run", "--project", path.join(MOONSEC_DIR, "MoonsecDeobfuscator.csproj"),
        "--configuration", "Release", "--", "-dev", "-i", inputFile, "-o", binFile,
      ], { cwd: MOONSEC_DIR });
    }

    if (!fs.existsSync(binFile) || fs.statSync(binFile).size === 0)
      throw new Error("MoonsecDeobfuscator no generó output. ¿El script es realmente MoonSec V3?");

    // Paso 2: unluac → .lua limpio
    const { stdout } = await run("java", ["-jar", UNLUAC_JAR, binFile]);
    fs.writeFileSync(outputFile, stdout);

    if (!fs.existsSync(outputFile) || fs.statSync(outputFile).size === 0)
      throw new Error("unluac no pudo decompilar el bytecode.");

    const size = (fs.statSync(outputFile).size / 1024).toFixed(1);
    const attachment = new AttachmentBuilder(outputFile, { name: script.name.replace(".lua", "_deobf.lua") });

    await loading.edit({
      embeds: [embed("#00e676", "✅ MoonsecDeobfuscator",
        `**Archivo:** \`${script.name}\`\n**Pipeline:** MoonSec V3 → bytecode → unluac → Lua ejecutable\n**Tamaño:** \`${size} KB\``)],
      files: [attachment],
    });
  } catch (err) {
    await loading.edit({ embeds: [embed("#ff4444", "❌ Falló", "```" + err.message.slice(0, 1800) + "```")] });
  } finally {
    cleanTmp(inputFile, binFile, outputFile);
  }
}

async function handlePrometheus(msg) {
  const loading = await msg.reply({
    embeds: [embed("#7b2fff", "⏳ Procesando...", "Ejecutando **Prometheus/WeAreDevs Deobfuscator**...\nPuede tardar hasta 30 seg.")],
  });

  const inputFile  = tmpFile(".lua");
  const reportFile = inputFile + ".report.txt";
  const deobfFile  = inputFile + ".deobf.lua";

  try {
    const script = await resolveScript(msg);
    if (!script) {
      return loading.edit({
        embeds: [embed("#ff4444", "❌ Error", "Adjunta un `.lua`, `.txt` o pon un link raw.")],
      });
    }

    fs.writeFileSync(inputFile, script.content);

    await run("python3", [PROMETHEUS_SCRIPT, inputFile], {
      cwd: path.dirname(PROMETHEUS_SCRIPT),
    });

    const candidates = [deobfFile, reportFile].filter((f) => fs.existsSync(f) && fs.statSync(f).size > 0);

    if (candidates.length === 0)
      throw new Error("No se generó output. El script puede no ser compatible con Prometheus/WeAreDevs.");

    const files = candidates.map((f) => {
      const label = f.endsWith(".lua") ? "deobf" : "report";
      const ext   = f.endsWith(".lua") ? ".lua" : ".txt";
      return new AttachmentBuilder(f, { name: script.name.replace(".lua", `_${label}${ext}`) });
    });

    await loading.edit({
      embeds: [embed("#00e676", "✅ Prometheus Deobfuscator",
        `**Archivo:** \`${script.name}\`\n**Outputs:** ${files.length} archivo(s)`)],
      files,
    });
  } catch (err) {
    await loading.edit({ embeds: [embed("#ff4444", "❌ Prometheus falló", "```" + err.message.slice(0, 1800) + "```")] });
  } finally {
    cleanTmp(inputFile, reportFile, deobfFile);
  }
}

function sendHelp(msg) {
  return msg.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("#7b2fff")
        .setTitle("🔓 Lua Deobfuscator Bot")
        .setDescription("Soporta adjuntos `.lua` / `.txt` y links raw directamente en el mensaje.")
        .addFields(
          { name: "`.l moonsec` + archivo o link", value: "Deobfusca **MoonSec V3** → Lua limpio ejecutable\nPipeline: MoonSec → bytecode → unluac → `.lua`" },
          { name: "`.l prom` + archivo o link",    value: "Deobfusca **Prometheus / WeAreDevs**\nOutput: `.lua` + `.txt` report" },
          { name: "`.l help`",                     value: "Muestra este menú." },
          { name: "📎 Formatos soportados",        value: "• Adjunto `.lua`\n• Adjunto `.txt`\n• Link raw (GitHub, pastebin, etc)\n\nEj: `.l moonsec https://raw.githubusercontent.com/.../script.lua`" }
        )
        .setFooter({ text: "Lua Deobfuscator Bot • Railway" })
        .setTimestamp(),
    ],
  });
}

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.toLowerCase().startsWith(PREFIX)) return;

  const args = msg.content.slice(PREFIX.length).trim().split(/\s+/);
  const sub  = args[0]?.toLowerCase();

  try {
    if (sub === "moonsec") return await handleMoonsec(msg);
    if (sub === "prom")    return await handlePrometheus(msg);
    if (sub === "help" || !sub) return await sendHelp(msg);
    await msg.reply({ embeds: [embed("#ff4444", "❌ Comando desconocido", "Usa `.l help` para ver los comandos.")] });
  } catch (err) {
    console.error(err);
    await msg.reply({ embeds: [embed("#ff4444", "❌ Error interno", "`" + err.message + "`")] }).catch(() => {});
  }
});

client.once("ready", () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);
  client.user.setActivity(".l help", { type: 3 });
});

client.login(TOKEN);
