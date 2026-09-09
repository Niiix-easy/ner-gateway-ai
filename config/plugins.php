<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Recursos incluídos no código-base (build white label)
    |--------------------------------------------------------------------------
    |
    | Nesta build todos os recursos já vêm liberados: não há loja de plugins,
    | chave de ativação nem cobrança por módulo. Os flags abaixo existem apenas
    | para compatibilidade com código legado e ficam sempre ligados.
    |
    */
    'built_in_features' => [
        'infoprodutos' => true,
        'vitrine-afiliados' => true,
        'equipe' => true,
    ],

    /*
    | Sem catálogo de módulos à venda. Mantido vazio de propósito.
    */
    'catalog' => [],
];
