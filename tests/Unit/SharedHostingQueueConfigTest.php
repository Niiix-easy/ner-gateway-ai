<?php

namespace Tests\Unit;

use Tests\TestCase;

class SharedHostingQueueConfigTest extends TestCase
{
    public function test_database_queue_is_a_valid_laravel_connection(): void
    {
        $connections = array_keys(config('queue.connections', []));
        $this->assertContains('database', $connections);
        $this->assertNotContains('file', $connections);
    }

    public function test_build_has_no_license_config(): void
    {
        // Build white label: sem licenciamento, sem portal externo, sem telemetria.
        $this->assertNull(config('license'));
    }
}
