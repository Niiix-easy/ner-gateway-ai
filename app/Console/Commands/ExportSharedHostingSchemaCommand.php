<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * Exporta o schema MySQL atual para public/install/database.sql
 * (pacote de hospedagem compartilhada — importação manual no phpMyAdmin).
 */
class ExportSharedHostingSchemaCommand extends Command
{
    protected $signature = 'platform:export-shared-schema
                            {--output= : Caminho de saída (default: public/install/database.sql)}';

    protected $description = 'Exporta dump SQL do schema MySQL para instalação em shared hosting';

    public function handle(): int
    {
        if (config('database.default') !== 'mysql' && ! str_starts_with((string) config('database.default'), 'mysql')) {
            $this->warn('Conexão padrão não é MySQL — tentando connection mysql...');
        }

        $connection = config('database.default');
        if (config("database.connections.mysql")) {
            try {
                DB::connection('mysql')->getPdo();
                $connection = 'mysql';
            } catch (\Throwable) {
                // keep default
            }
        }

        $db = DB::connection($connection);
        $database = (string) $db->getDatabaseName();
        if ($database === '') {
            $this->error('Nome do banco vazio.');

            return self::FAILURE;
        }

        $tables = $db->select('SHOW TABLES');
        $key = 'Tables_in_'.$database;
        $names = [];
        foreach ($tables as $row) {
            $arr = (array) $row;
            $name = $arr[$key] ?? reset($arr);
            if (is_string($name) && $name !== '') {
                $names[] = $name;
            }
        }

        if ($names === []) {
            $this->error('Nenhuma tabela encontrada. Rode as migrations localmente antes de exportar.');

            return self::FAILURE;
        }

        sort($names);
        $out = [];
        $out[] = '-- Plataforma / Plataforma — schema MySQL para hospedagem compartilhada';
        $out[] = '-- Gerado por: php artisan platform:export-shared-schema';
        $out[] = '-- Importe este arquivo no phpMyAdmin em um banco VAZIO antes do wizard /install';
        $out[] = 'SET NAMES utf8mb4;';
        $out[] = 'SET FOREIGN_KEY_CHECKS=0;';
        $out[] = '';

        foreach ($names as $table) {
            $create = $db->selectOne('SHOW CREATE TABLE `'.str_replace('`', '``', $table).'`');
            $createArr = (array) $create;
            $ddl = $createArr['Create Table'] ?? $createArr['Create View'] ?? null;
            if (! is_string($ddl) || $ddl === '') {
                $this->warn("Pulando {$table}: sem DDL.");
                continue;
            }
            $out[] = 'DROP TABLE IF EXISTS `'.str_replace('`', '``', $table).'`;';
            $out[] = $ddl.';';
            $out[] = '';

            // Inclui dados da tabela migrations (necessário para o Laravel)
            if ($table === 'migrations') {
                $rows = $db->table('migrations')->orderBy('id')->get();
                foreach ($rows as $r) {
                    $migration = addslashes((string) $r->migration);
                    $batch = (int) $r->batch;
                    $out[] = "INSERT INTO `migrations` (`migration`, `batch`) VALUES ('{$migration}', {$batch});";
                }
                $out[] = '';
            }
        }

        $out[] = 'SET FOREIGN_KEY_CHECKS=1;';
        $sql = implode("\n", $out)."\n";

        $path = $this->option('output') ?: public_path('install/database.sql');
        File::ensureDirectoryExists(dirname($path));
        File::put($path, $sql);

        $this->info('Schema exportado: '.$path);
        $this->info('Tabelas: '.count($names));

        return self::SUCCESS;
    }
}
