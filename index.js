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
const UNLUAC_JAR = path.join(__dirname, "unluac.jar");
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

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    lib.get(url, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", reject);
  });
}

/** Download text from URL and return as string */
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 90_000, ...opts }, (err, stdout, stderr) => {
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

/**
 * Obtiene el contenido del script desde:
 * 1. Adjunto .lua o .txt en el mensaje
 * 2. URL raw en el texto del mensaje
 * Devuelve { content, name } o null si no hay nada
 */
async function resolveScript(msg) {
  // 1. Adjunto .lua o .txt
  const att = msg.attachments.find(
    (a) => a.name.endsWith(".lua") || a.name.endsWith(".txt")
  );
  if (att) {
    const content = await fetchText(att.url);
    return { content, name: att.name.replace(/\.txt$/, ".lua") };
  }

  // 2. URL raw en el mensaje (después del comando)
  const args = msg.content.trim().split(/\s+/);
  // args[0] = ".lmoonsec" o args[1] si hay espacio
  const urlArg = args.find((a) =>
    a.startsWith("http://") || a.startsWith("https://")
  );
  if (urlArg) {
    const content = await fetchText(urlArg);
    // Sacar nombre del URL
    const urlName = urlArg.split("/").pop().split("?")[0];
    const name = urlName.endsWith(".lua") || urlName.endsWith(".txt")
      ? urlName.replace(/\.txt$/, ".lua")
      : "script.lua";
    return { content, name };
  }

  return null;
}

// ─── MOONSEC HANDLER ───────────────────────────────────────────────────────
async function handleMoonsec(msg) {
  const loading = await msg.reply({
    embeds: [embed("#7b2fff", "⏳ Procesando...", "Ejecutando **MoonsecDeobfuscator** + **unluac**...")],
  });

  const inputFile  = tmpFile(".lua");
  const binFile    = tmpFile(".bin");
  const outputFile = tmpFile(".lua");

  try {
    const script = await resolveScript(msg);
    if (!script) {
      return loading.edit({
        embeds: [embed("#ff4444", "❌ Error", "Adjunta un `.lua`, `.txt` o pon un link raw después del comando.\nEj: `.l moonsec https://raw.github.../script.lua`")],
      });
    }

    fs.writeFileSync(inputFile, script.content);

    // Paso 1: MoonsecDeobfuscator → bytecode .bin
    const exePath = path.join(MOONSEC_DIR, "bin", "Release", "net9.0", "MoonsecDeobfuscator");
    const exe = fs.existsSync(exePath + ".exe") ? exePath + ".exe" : exePath;

    if (!fs.existsSync(exe)) {
      await run("dotnet", [
        "run", "--project",
        path.join(MOONSEC_DIR, "MoonsecDeobfuscator.csproj"),
        "--configuration", "Release", "--",
        "-dev", "-i", inputFile, "-o", binFile,
      ], { cwd: MOONSEC_DIR });
    } else {
      await run(exe, ["-dev", "-i", inputFile, "-o", binFile]);
    }

    if (!fs.existsSync(binFile) || fs.statSync(binFile).size === 0) {
      throw new Error("MoonsecDeobfuscator no generó output. El script puede no estar obfuscado con MoonSec V3.");
    }

    // Paso 2: unluac → .lua limpio
    const unluacOut = await run("java", ["-jar", UNLUAC_JAR, binFile]);
    fs.writeFileSync(outputFile, unluacOut.stdout);

    if (!fs.existsSync(outputFile) || fs.statSync(outputFile).size === 0) {
      throw new Error("unluac no pudo decompiler el bytecode.");
    }

    const fileSize = fs.statSync(outputFile).size;
    const outName = script.name.replace(".lua", "_deobf.lua");
    const attachment = new AttachmentBuilder(outputFile, { name: outName });

    await loading.edit({
      embeds: [embed(
        "#00e676",
        "✅ MoonsecDeobfuscator",
        `**Archivo:** \`${script.name}\`\n**Pipeline:** MoonSec → bytecode → unluac → Lua limpio\n**Tamaño:** \`${(fileSize / 1024).toFixed(1)} KB\``,
      )],
      files: [attachment],
    });
  } catch (err) {
    await loading.edit({
      embeds: [embed("#ff4444", "❌ MoonsecDeobfuscator falló", `\`\`\`${err.message.slice(0, 1800)}\`\`\``)],
    });
  } finally {
    cleanTmp(inputFile, binFile, outputFile);
  }
}

// ─── PROMETHEUS HANDLER ────────────────────────────────────────────────────
async function handlePrometheus(msg) {
  const loading = await msg.reply({
    embeds: [embed("#7b2fff", "⏳ Procesando...", "Ejecutando **Prometheus/WeAreDevs Deobfuscator**...\nEsto puede tardar hasta 30 seg.")],
  });

  const inputFile  = tmpFile(".lua");
  const reportFile = inputFile + ".report.txt";
  const deobfFile  = inputFile + ".deobf.lua";

  try {
    const script = await resolveScript(msg);
    if (!script) {
      return loading.edit({
        embeds: [embed("#ff4444", "❌ Error", "Adjunta un `.lua`, `.txt` o pon un link raw después del comando.")],
      });
    }

    fs.writeFileSync(inputFile, script.content);

    await run("python3", [PROMETHEUS_SCRIPT, inputFile], {
      cwd: path.dirname(PROMETHEUS_SCRIPT),
    });

    const candidates = [deobfFile, reportFile].filter(
      (f) => fs.existsSync(f) && fs.statSync(f).size > 0
    );

    if (candidates.length === 0) {
      throw new Error("No se generó output. El script puede no ser compatible con Prometheus/WeAreDevs.");
    }

    const files = candidates.map((f) => {
      const ext   = f.endsWith(".lua") ? ".lua" : ".txt";
      const label = f.endsWith(".lua") ? "deobf" : "report";
      return new AttachmentBuilder(f, {
        name: script.name.replace(".lua", `_${label}${ext}`),
      });
    });

    await loading.edit({
      embeds: [embed(
        "#00e676",
        "✅ Prometheus Deobfuscator",
        `**Archivo:** \`${script.name}\`\n**Outputs:** ${files.length} archivo(s)`,
      )],
      files,
    });
  } catch (err) {
    await loading.edit({
      embeds: [embed("#ff4444", "❌ Prometheus falló", `\`\`\`${err.message.slice(0, 1800)}\`\`\``)],
    });
  } finally {
    cleanTmp(inputFile, reportFile, deobfFile);
  }
}

// ─── HELP ──────────────────────────────────────────────────────────────────
function sendHelp(msg) {
  const helpEmbed = new EmbedBuilder()
    .setColor("#7b2fff")
    .setTitle("🔓 Lua Deobfuscator Bot")
    .setDescription("Soporta adjuntos `.lua` / `.txt` y links raw directamente en el mensaje.")
    .addFields(
      {
        name: "`.l moonsec` + archivo o link",
        value: "Deobfusca scripts **MoonSec V3** → Lua limpio ejecutable\nPipeline: MoonSec → bytecode → unluac → `.lua`",
      },
      {
        name: "`.l prom` + archivo o link",
        value: "Deobfusca scripts **Prometheus / WeAreDevs**\nOutput: `.lua` deobfuscado + `.txt` report",
      },
      {
        name: "`.l help`",
        value: "Muestra este menú.",
      }
    )
    .addFields({
      name: "📎 Formatos soportados",
      value: "• Adjunto `.lua`\n• Adjunto `.txt`\n• Link raw (GitHub, pastebin, etc)\n\nEj: `.l moonsec https://raw.githubusercontent.com/.../script.lua`",
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
  const sub  = args[0]?.toLowerCase();

  try {
    if (sub === "moonsec") return await handleMoonsec(msg);
    if (sub === "prom")    return await handlePrometheus(msg);
    if (sub === "help" || !sub) return await sendHelp(msg);

    await msg.reply({
      embeds: [embed("#ff4444", "❌ Comando desconocido", "Usa `.l help` para ver los comandos.")],
    });
  } catch (err) {
    console.error(err);
    await msg
      .reply({ embeds: [embed("#ff4444", "❌ Error interno", `\`${err.message}\``)] })
      .catch(() => {});
  }
});

// ─── READY ─────────────────────────────────────────────────────────────────
client.once("ready", () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);
  client.user.setActivity(".l help", { type: 3 });
});

client.login(TOKEN);
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
   
