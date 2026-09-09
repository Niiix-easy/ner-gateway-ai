<?php

/*
|--------------------------------------------------------------------------
| Conquistas de faturamento (fallback)
|--------------------------------------------------------------------------
|
| Usado apenas quando a tabela `sales_achievements` está vazia. O operador
| cadastra os níveis e envia as artes em Plataforma → Conquistas, e o que
| estiver no banco tem prioridade sobre esta lista.
|
| Build white label: nenhuma arte é distribuída junto e não há CDN externa.
| `image` fica nula até você subir a sua própria imagem pelo painel.
|
*/

return [
    'achievements' => [
        ['threshold' => 10_000, 'slug' => 'nivel-1', 'name' => 'Nível 1', 'image' => null],
        ['threshold' => 50_000, 'slug' => 'nivel-2', 'name' => 'Nível 2', 'image' => null],
        ['threshold' => 100_000, 'slug' => 'nivel-3', 'name' => 'Nível 3', 'image' => null],
        ['threshold' => 500_000, 'slug' => 'nivel-4', 'name' => 'Nível 4', 'image' => null],
        ['threshold' => 1_000_000, 'slug' => 'nivel-5', 'name' => 'Nível 5', 'image' => null],
        ['threshold' => 5_000_000, 'slug' => 'nivel-6', 'name' => 'Nível 6', 'image' => null],
        ['threshold' => 10_000_000, 'slug' => 'nivel-7', 'name' => 'Nível 7', 'image' => null],
        ['threshold' => 25_000_000, 'slug' => 'nivel-8', 'name' => 'Nível 8', 'image' => null],
    ],
];
