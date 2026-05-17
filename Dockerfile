FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    python3 \
    python3-pip \
    libicu72 \
    libssl3 \
    lua5.1 \
    default-jre-headless \
    && rm -rf /var/lib/apt/lists/*

# .NET 9 SDK
RUN wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh \
    && chmod +x dotnet-install.sh \
    && ./dotnet-install.sh --version 9.0.100 --install-dir /usr/share/dotnet \
    && ln -s /usr/share/dotnet/dotnet /usr/bin/dotnet \
    && rm dotnet-install.sh

WORKDIR /app
COPY . .

RUN npm install

RUN dotnet build MoonsecDeobfuscator-master/MoonsecDeobfuscator.csproj -c Release

CMD ["node", "index.js"]
