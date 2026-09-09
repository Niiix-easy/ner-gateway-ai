<?php

namespace Tests\Unit;

use Plugins\Pluggou\PluggouDriver;
use Tests\TestCase;

class PluggouDriverStatusMappingTest extends TestCase
{
    public function test_map_transaction_status(): void
    {
        $this->assertSame('paid', PluggouDriver::mapTransactionStatus('paid'));
        $this->assertSame('pending', PluggouDriver::mapTransactionStatus('pending'));
        $this->assertSame('cancelled', PluggouDriver::mapTransactionStatus('failed'));
        $this->assertSame('cancelled', PluggouDriver::mapTransactionStatus('canceled'));
        $this->assertSame('cancelled', PluggouDriver::mapTransactionStatus('refunded'));
        $this->assertSame('cancelled', PluggouDriver::mapTransactionStatus('chargeback'));
    }

    public function test_map_withdrawal_status(): void
    {
        $this->assertSame('paid', PluggouDriver::mapWithdrawalStatus('paid'));
        $this->assertSame('paid', PluggouDriver::mapWithdrawalStatus('completed'));
        $this->assertSame('pending', PluggouDriver::mapWithdrawalStatus('pending'));
        $this->assertSame('pending', PluggouDriver::mapWithdrawalStatus('approved'));
        $this->assertSame('failed', PluggouDriver::mapWithdrawalStatus('failed'));
        $this->assertSame('failed', PluggouDriver::mapWithdrawalStatus('canceled'));
        $this->assertSame('failed', PluggouDriver::mapWithdrawalStatus('refunded'));
    }
}
