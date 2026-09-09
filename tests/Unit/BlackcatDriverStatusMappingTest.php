<?php

namespace Tests\Unit;

use Plugins\Blackcat\BlackcatDriver;
use Tests\TestCase;

class BlackcatDriverStatusMappingTest extends TestCase
{
    public function test_map_transaction_status(): void
    {
        $this->assertSame('paid', BlackcatDriver::mapTransactionStatus('PAID'));
        $this->assertSame('paid', BlackcatDriver::mapTransactionStatus('paid'));
        $this->assertSame('pending', BlackcatDriver::mapTransactionStatus('PENDING'));
        $this->assertSame('cancelled', BlackcatDriver::mapTransactionStatus('CANCELLED'));
        $this->assertSame('cancelled', BlackcatDriver::mapTransactionStatus('canceled'));
        $this->assertSame('cancelled', BlackcatDriver::mapTransactionStatus('refunded'));
        $this->assertSame('cancelled', BlackcatDriver::mapTransactionStatus('failed'));
    }

    public function test_map_withdrawal_status(): void
    {
        $this->assertSame('paid', BlackcatDriver::mapWithdrawalStatus('COMPLETED'));
        $this->assertSame('paid', BlackcatDriver::mapWithdrawalStatus('paid'));
        $this->assertSame('pending', BlackcatDriver::mapWithdrawalStatus('PROCESSING'));
        $this->assertSame('pending', BlackcatDriver::mapWithdrawalStatus('pending'));
        $this->assertSame('failed', BlackcatDriver::mapWithdrawalStatus('FAILED'));
        $this->assertSame('failed', BlackcatDriver::mapWithdrawalStatus('canceled'));
    }
}
