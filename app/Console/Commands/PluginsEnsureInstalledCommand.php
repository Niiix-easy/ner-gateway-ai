<?php

namespace App\Console\Commands;

use App\Models\Plugin as PluginModel;
use App\Plugins\PluginRegistry;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

/**
 * Após update/deploy: garante que plugins presentes em disco estejam no banco.
 * Plugins gateway (type != feature) que já estavam enabled permanecem enabled;
 * novos no disco são registrados com o default do tipo.
 * Não desativa nem desinstala nada.
 */
class PluginsEnsureInstalledCommand extends Command
{
    protected $signature = 'plugins:ensure-installed
                            {--reactivate-gateways : Reativa gateways no disco que estejam disabled no banco}';

    protected $description = 'Sincroniza plugins do disco com o banco após update (não remove installs).';

    public function handle(): int
    {
        try {
            if (! Schema::hasTable('plugins')) {
                $this->info('Tabela plugins ausente — nada a fazer.');

                return self::SUCCESS;
            }
        } catch (\Throwable $e) {
            $this->warn('Não foi possível acessar a tabela plugins: '.$e->getMessage());

            return self::SUCCESS;
        }

        try {
            PluginRegistry::syncFromDisk();
        } catch (\Throwable $e) {
            $this->warn('syncFromDisk falhou: '.$e->getMessage());

            return self::SUCCESS;
        }

        $onDisk = collect(PluginRegistry::installed())->keyBy('slug');
        $restored = 0;
        $reactivated = 0;

        foreach ($onDisk as $slug => $plugin) {
            $row = PluginModel::query()->find($slug);
            if ($row === null) {
                PluginRegistry::register($slug);
                $restored++;
                continue;
            }

            // Atualiza metadados sem mexer em is_enabled (exceto --reactivate-gateways).
            $row->name = $plugin['name'] ?? $row->name;
            $row->version = $plugin['version'] ?? $row->version;

            $type = strtolower(trim((string) ($plugin['type'] ?? '')));
            $isGateway = $type === 'gateway' || $type === '';
            if ($this->option('reactivate-gateways') && $isGateway && ! $row->is_enabled) {
                $row->is_enabled = true;
                $reactivated++;
            }

            $row->save();
        }

        // Gateways que estavam enabled no banco mas o volume estava vazio: após seed,
        // syncFromDisk/register já cobriu. Se o registro existia disabled por engano
        // após update antigo, reativa gateways cujo slug está no disco e type=gateway
        // quando a flag explícita não foi passada — só reativa se já havia row enabled
        // antes... na prática o seed + sync basta se is_enabled sobreviveu.

        $this->info(sprintf(
            'Plugins no disco: %d. Registrados/atualizados agora: %d. Reativados: %d.',
            $onDisk->count(),
            $restored,
            $reactivated
        ));

        return self::SUCCESS;
    }
}
