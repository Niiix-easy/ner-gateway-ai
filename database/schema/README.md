# Schema MySQL (shared hosting)

Gere o dump usado no wizard:

```bash
php artisan migrate --force
php artisan platform:export-shared-schema
```

Saída: `public/install/database.sql` (incluído no pacote ZIP de shared hosting).

O cliente importa esse arquivo no phpMyAdmin **antes** de concluir o `/install`.
