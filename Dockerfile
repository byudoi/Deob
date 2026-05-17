# Base: Node 20 + Python 3 (Debian)
FROM node:20-bookworm-slim

# ─── Instalar .NET 9 SDK ───────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Instalar .NET 9 SDK via script oficial de Microsoft
RUN wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh \
    && chmod +x dotnet-install.sh \
    && ./dotnet-install.sh --version 9.0.100 --install-dir /usr/share/dotnet \
    && ln -s /usr/share/dotnet/dotnet /usr/bin/dotnet \
    && rm dotnet-install.sh

# ─── App ──────────────────────────────────────────────────────────────────
WORKDIR /app

# Copiar todo el proyecto
COPY . .

# Instalar dependencias Node
RUN npm install

# Buildear MoonsecDeobfuscator
RUN dotnet build MoonsecDeobfuscator-master -c Release

# ─── Start ────────────────────────────────────────────────────────────────
CMD ["node", "index.js"]
