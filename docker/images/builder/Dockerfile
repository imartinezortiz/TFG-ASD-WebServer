FROM node:22.9.0-bookworm
ENV DART_SASS_VERSION 1.79.2
ENV DOWNLOAD_URL https://github.com/sass/dart-sass/releases/download/${DART_SASS_VERSION}/dart-sass-${DART_SASS_VERSION}-linux-x64.tar.gz
ENV DOWNLOAD_SHA256 02ee21a9ad4d33961c984df03452fbbea2a134a5599c4bf1205ce2fcce244f92

RUN set -ex; \
    curl -SL "$DOWNLOAD_URL" -o /tmp/sass.tar.gz; \
    echo "$DOWNLOAD_SHA256 /tmp/sass.tar.gz" | sha256sum -c -; \
    mkdir /opt/sass; \
    tar xf /tmp/sass.tar.gz --strip-components=1 -C /opt/sass; \
    chmod +x /opt/sass/sass; \
    ln -s /opt/sass/sass /usr/local/bin; \
    rm -rf /tmp/* /var/tmp/*

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        locales locales-all \
    ; \
    \
    # Set the local
    locale-gen es_ES.UTF-8; \
    \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*;

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        less \
        vim \
        jq \
    ; \
    \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*;

RUN set -eux; \
    npm install -g npm@10.8.3; \
    npm install -g pnpm@9.11.0; \
    npm install -g husky@9.1.6; \
    npm install -g lerna@8.1.8;

ENV LANG es_ES.UTF-8 
ENV LANGUAGE es_ES:es
ENV LC_ALL es_ES.UTF-8

# dependencias canvass
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        build-essential \
        libcairo2-dev \
        libpango1.0-dev \
        libjpeg-dev \
        libgif-dev \
        librsvg2-dev \
    ; \
    \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*;