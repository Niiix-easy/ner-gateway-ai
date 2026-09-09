FROM php:8.3-cli-alpine AS php_base

RUN apk add --no-cache \
    git unzip libzip-dev libpng-dev libjpeg-turbo-dev freetype-dev oniguruma-dev \
    postgresql-client postgresql-dev icu-dev libxml2-dev $PHPIZE_DEPS

RUN pecl install redis \
    && docker-php-ext-enable redis

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd pdo_pgsql zip exif intl opcache pcntl bcmath

COPY docker/php/uploads.ini /usr/local/etc/php/conf.d/99-uploads.ini

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

FROM php_base AS app

# vendor/ deve existir no contexto (gerado por docker/install-composer-deps.sh no host).
# Evita composer install no build: em alguns VPS o BuildKit não alcança api.github.com.
COPY . .
COPY docker/entrypoint.sh /usr/local/bin/platform-entrypoint
COPY docker/seed-bundled-plugins.sh /usr/local/bin/platform-seed-bundled-plugins

RUN if [ ! -f vendor/autoload.php ]; then \
      echo "ERRO: vendor/ ausente. Rode na VPS: sh docker/install-composer-deps.sh" >&2; \
      exit 1; \
    fi \
    && chmod +x /usr/local/bin/platform-entrypoint /usr/local/bin/platform-seed-bundled-plugins \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views bootstrap/cache .docker \
    && chmod -R 777 storage bootstrap/cache .docker \
    && mkdir -p /opt/platform-bundled-plugins \
    && if [ -d plugins ]; then cp -a plugins/. /opt/platform-bundled-plugins/; fi

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/platform-entrypoint"]
CMD ["sh", "-lc", "php artisan serve --host=0.0.0.0 --port=${PORT:-80} --no-reload"]
