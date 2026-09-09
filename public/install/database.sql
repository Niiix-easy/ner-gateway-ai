-- Schema MySQL para hospedagem compartilhada
-- Gerado por: php artisan platform:export-shared-schema
-- Importe este arquivo no phpMyAdmin em um banco VAZIO antes do wizard /install
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS `affiliate_commissions`;
CREATE TABLE `affiliate_commissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `affiliate_user_id` bigint unsigned NOT NULL,
  `affiliate_enrollment_id` bigint unsigned NOT NULL,
  `producer_tenant_id` bigint unsigned NOT NULL,
  `producer_user_id` bigint unsigned DEFAULT NULL,
  `product_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sale_origin` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commission_percent` decimal(8,2) NOT NULL DEFAULT '0.00',
  `sale_gross` decimal(12,2) NOT NULL DEFAULT '0.00',
  `commission_gross` decimal(12,2) NOT NULL DEFAULT '0.00',
  `commission_fee` decimal(12,2) NOT NULL DEFAULT '0.00',
  `commission_net` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `wallet_transaction_id` bigint unsigned DEFAULT NULL,
  `affiliate_ref` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `affiliate_link` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `affiliate_commissions_order_id_unique` (`order_id`),
  KEY `affiliate_commissions_affiliate_enrollment_id_foreign` (`affiliate_enrollment_id`),
  KEY `affiliate_commissions_affiliate_user_id_status_index` (`affiliate_user_id`,`status`),
  KEY `affiliate_commissions_producer_tenant_id_created_at_index` (`producer_tenant_id`,`created_at`),
  KEY `affiliate_commissions_product_id_index` (`product_id`),
  CONSTRAINT `affiliate_commissions_affiliate_enrollment_id_foreign` FOREIGN KEY (`affiliate_enrollment_id`) REFERENCES `product_affiliate_enrollments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `affiliate_commissions_affiliate_user_id_foreign` FOREIGN KEY (`affiliate_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `affiliate_commissions_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `api_applications`;
CREATE TABLE `api_applications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logo` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checkout_sidebar_bg` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `api_key_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `legacy_api_key_sha256` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `public_key` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `secret_key_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `secret_encrypted` text COLLATE utf8mb4_unicode_ci,
  `payment_gateways` json DEFAULT NULL,
  `allowed_ips` json DEFAULT NULL,
  `webhook_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `default_return_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `webhook_secret` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `webhook_events` json DEFAULT NULL,
  `webhook_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_legacy` tinyint(1) NOT NULL DEFAULT '1',
  `scopes` json DEFAULT NULL,
  `strict_idempotency` tinyint(1) NOT NULL DEFAULT '0',
  `async_payments` tinyint(1) NOT NULL DEFAULT '0',
  `rate_limit_tier` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'legacy',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_applications_tenant_id_slug_unique` (`tenant_id`,`slug`),
  UNIQUE KEY `api_applications_public_key_unique` (`public_key`),
  KEY `api_applications_tenant_id_index` (`tenant_id`),
  KEY `api_applications_slug_index` (`slug`),
  KEY `api_applications_legacy_api_key_sha256_index` (`legacy_api_key_sha256`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `api_checkout_sessions`;
CREATE TABLE `api_checkout_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `api_application_id` bigint unsigned NOT NULL,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `session_token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer` json NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BRL',
  `product_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_offer_id` bigint unsigned DEFAULT NULL,
  `subscription_plan_id` bigint unsigned DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `return_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `order_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_checkout_sessions_session_token_unique` (`session_token`),
  KEY `api_checkout_sessions_api_application_id_expires_at_index` (`api_application_id`,`expires_at`),
  KEY `api_checkout_sessions_tenant_id_index` (`tenant_id`),
  CONSTRAINT `api_checkout_sessions_api_application_id_foreign` FOREIGN KEY (`api_application_id`) REFERENCES `api_applications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `api_idempotency_keys`;
CREATE TABLE `api_idempotency_keys` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `api_application_id` bigint unsigned DEFAULT NULL,
  `api_key_id` bigint unsigned DEFAULT NULL,
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'completed',
  `response_status` smallint unsigned DEFAULT NULL,
  `response_body` json DEFAULT NULL,
  `resource_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resource_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_idempotency_tenant_key_unique` (`tenant_id`,`idempotency_key`),
  KEY `api_idempotency_keys_tenant_id_index` (`tenant_id`),
  KEY `api_idempotency_keys_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `api_keys`;
CREATE TABLE `api_keys` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `api_application_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `public_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `secret_key_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `secret_encrypted` text COLLATE utf8mb4_unicode_ci,
  `scopes` json NOT NULL,
  `allowed_ips` json DEFAULT NULL,
  `strict_idempotency` tinyint(1) NOT NULL DEFAULT '1',
  `async_payments` tinyint(1) NOT NULL DEFAULT '0',
  `rate_limit_tier` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'standard',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_keys_public_key_unique` (`public_key`),
  KEY `api_keys_tenant_id_index` (`tenant_id`),
  KEY `api_keys_api_application_id_index` (`api_application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `api_webhook_deliveries`;
CREATE TABLE `api_webhook_deliveries` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` bigint unsigned NOT NULL,
  `api_application_id` bigint unsigned DEFAULT NULL,
  `api_key_id` bigint unsigned DEFAULT NULL,
  `event` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` json NOT NULL,
  `url` varchar(2048) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempt` smallint unsigned NOT NULL DEFAULT '0',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `last_status_code` smallint unsigned DEFAULT NULL,
  `last_response_body` text COLLATE utf8mb4_unicode_ci,
  `next_retry_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_webhook_deliveries_event_id_unique` (`event_id`),
  KEY `api_webhook_deliveries_tenant_id_index` (`tenant_id`),
  KEY `api_webhook_deliveries_api_application_id_index` (`api_application_id`),
  KEY `api_webhook_deliveries_event_index` (`event`),
  KEY `api_webhook_deliveries_status_index` (`status`),
  KEY `api_webhook_deliveries_next_retry_at_index` (`next_retry_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `branding_settings`;
CREATE TABLE `branding_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `data` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branding_settings_tenant_id_unique` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `cache`;
CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `cache_locks`;
CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `cademi_integration_product`;
CREATE TABLE `cademi_integration_product` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cademi_integration_id` bigint unsigned NOT NULL,
  `product_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cademi_tag_id` bigint unsigned DEFAULT NULL,
  `cademi_produto_id` bigint unsigned DEFAULT NULL,
  `cademi_produto_ids` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cademi_int_product_unique` (`cademi_integration_id`,`product_id`),
  KEY `cademi_integration_product_product_id_foreign` (`product_id`),
  CONSTRAINT `cademi_integration_product_cademi_integration_id_foreign` FOREIGN KEY (`cademi_integration_id`) REFERENCES `cademi_integrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cademi_integration_product_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `cademi_integration_product_offer`;
CREATE TABLE `cademi_integration_product_offer` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cademi_integration_id` bigint unsigned NOT NULL,
  `product_offer_id` bigint unsigned NOT NULL,
  `cademi_tag_id` bigint unsigned DEFAULT NULL,
  `cademi_produto_id` bigint unsigned DEFAULT NULL,
  `cademi_produto_ids` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cademi_int_offer_unique` (`cademi_integration_id`,`product_offer_id`),
  KEY `cademi_integration_product_offer_product_offer_id_foreign` (`product_offer_id`),
  CONSTRAINT `cademi_integration_product_offer_cademi_integration_id_foreign` FOREIGN KEY (`cademi_integration_id`) REFERENCES `cademi_integrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cademi_integration_product_offer_product_offer_id_foreign` FOREIGN KEY (`product_offer_id`) REFERENCES `product_offers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `cademi_integration_subscription_plan`;
CREATE TABLE `cademi_integration_subscription_plan` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cademi_integration_id` bigint unsigned NOT NULL,
  `subscription_plan_id` bigint unsigned NOT NULL,
  `cademi_tag_id` bigint unsigned DEFAULT NULL,
  `cademi_produto_id` bigint unsigned DEFAULT NULL,
  `cademi_produto_ids` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cademi_int_plan_unique` (`cademi_integration_id`,`subscription_plan_id`),
  KEY `cad_int_plan_plan_fk` (`subscription_plan_id`),
  CONSTRAINT `cad_int_plan_int_fk` FOREIGN KEY (`cademi_integration_id`) REFERENCES `cademi_integrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cad_int_plan_plan_fk` FOREIGN KEY (`subscription_plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `cademi_integrations`;
CREATE TABLE `cademi_integrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `base_url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `api_key` text COLLATE utf8mb4_unicode_ci,
  `delivery_method` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'postback_custom',
  `postback_token` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cademi_integrations_tenant_id_index` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `cajupay_accounts`;
CREATE TABLE `cajupay_accounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `credentials` text COLLATE utf8mb4_unicode_ci,
  `is_connected` tinyint(1) NOT NULL DEFAULT '0',
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `webhook_setup_status` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cajupay_accounts_is_default_index` (`is_default`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `checkout_sessions`;
CREATE TABLE `checkout_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_offer_id` bigint unsigned DEFAULT NULL,
  `subscription_plan_id` bigint unsigned DEFAULT NULL,
  `checkout_slug` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `step` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'visit',
  `form_started_at` timestamp NULL DEFAULT NULL,
  `form_filled_at` timestamp NULL DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_fbp` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_fbc` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_fbclid` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_user_agent` text COLLATE utf8mb4_unicode_ci,
  `meta_page_url` text COLLATE utf8mb4_unicode_ci,
  `affiliate_ref` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order_id` bigint unsigned DEFAULT NULL,
  `utm_source` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `utm_medium` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `utm_campaign` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `utm_content` text COLLATE utf8mb4_unicode_ci,
  `utm_term` text COLLATE utf8mb4_unicode_ci,
  `sck` text COLLATE utf8mb4_unicode_ci,
  `src` text COLLATE utf8mb4_unicode_ci,
  `abandoned_webhook_fired_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `cpf` varchar(14) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `checkout_sessions_session_token_unique` (`session_token`),
  KEY `checkout_sessions_tenant_id_step_index` (`tenant_id`,`step`),
  KEY `checkout_sessions_tenant_id_created_at_index` (`tenant_id`,`created_at`),
  KEY `checkout_sessions_tenant_id_index` (`tenant_id`),
  KEY `checkout_sessions_product_id_foreign` (`product_id`),
  CONSTRAINT `checkout_sessions_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `coupon_product`;
CREATE TABLE `coupon_product` (
  `coupon_id` bigint unsigned NOT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`coupon_id`,`product_id`),
  KEY `tmp_fk_coupon_id` (`coupon_id`),
  KEY `coupon_product_product_id_foreign` (`product_id`),
  CONSTRAINT `coupon_product_coupon_id_foreign` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `coupon_product_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `coupons`;
CREATE TABLE `coupons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'percent',
  `value` decimal(10,2) NOT NULL,
  `min_amount` decimal(10,2) DEFAULT NULL,
  `max_uses` int unsigned DEFAULT NULL,
  `used_count` int unsigned NOT NULL DEFAULT '0',
  `valid_from` datetime DEFAULT NULL,
  `valid_until` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coupons_tenant_id_code_unique` (`tenant_id`,`code`),
  KEY `coupons_tenant_id_index` (`tenant_id`),
  KEY `coupons_product_id_foreign` (`product_id`),
  CONSTRAINT `coupons_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `email_campaign_sends`;
CREATE TABLE `email_campaign_sends` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `email_campaign_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_campaign_sends_email_campaign_id_email_unique` (`email_campaign_id`,`email`),
  KEY `email_campaign_sends_email_campaign_id_index` (`email_campaign_id`),
  CONSTRAINT `email_campaign_sends_email_campaign_id_foreign` FOREIGN KEY (`email_campaign_id`) REFERENCES `email_campaigns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `email_campaigns`;
CREATE TABLE `email_campaigns` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body_html` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `filter_config` json DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `total_recipients` int unsigned DEFAULT NULL,
  `sent_count` int unsigned NOT NULL DEFAULT '0',
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `email_campaigns_tenant_id_index` (`tenant_id`),
  KEY `email_campaigns_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `failed_jobs`;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `gateway_credentials`;
CREATE TABLE `gateway_credentials` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `gateway_slug` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `credentials` text COLLATE utf8mb4_unicode_ci,
  `is_connected` tinyint(1) NOT NULL DEFAULT '0',
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `gateway_credentials_tenant_id_gateway_slug_unique` (`tenant_id`,`gateway_slug`),
  KEY `gateway_credentials_tenant_id_index` (`tenant_id`),
  KEY `gateway_credentials_gateway_slug_index` (`gateway_slug`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `integrax_sms_dispatches`;
CREATE TABLE `integrax_sms_dispatches` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `checkout_session_id` bigint unsigned DEFAULT NULL,
  `order_id` bigint unsigned DEFAULT NULL,
  `event_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sequence_step` tinyint unsigned DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `error` text COLLATE utf8mb4_unicode_ci,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `integrax_sms_dispatches_checkout_session_id_event_type_index` (`checkout_session_id`,`event_type`),
  KEY `integrax_sms_dispatches_order_id_event_type_index` (`order_id`,`event_type`),
  KEY `integrax_sms_dispatches_tenant_id_index` (`tenant_id`),
  KEY `integrax_sms_dispatches_checkout_session_id_index` (`checkout_session_id`),
  KEY `integrax_sms_dispatches_order_id_index` (`order_id`),
  KEY `integrax_dispatches_session_step_idx` (`checkout_session_id`,`event_type`,`sequence_step`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `job_batches`;
CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `jobs`;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `kyc_documents`;
CREATE TABLE `kyc_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `public_token` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `kind` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `disk_path` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_mime` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size_bytes` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kyc_documents_public_token_unique` (`public_token`),
  KEY `kyc_documents_user_id_kind_index` (`user_id`,`kind`),
  CONSTRAINT `kyc_documents_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `med_disputes`;
CREATE TABLE `med_disputes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `tenant_id` bigint unsigned NOT NULL,
  `responsible_party` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'tenant',
  `cajupay_dispute_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cajupay_payment_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `outcome` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount_cents` bigint unsigned NOT NULL DEFAULT '0',
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BRL',
  `txid` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `reason_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `defense_text` text COLLATE utf8mb4_unicode_ci,
  `defense_dossier_path` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `defended_at` timestamp NULL DEFAULT NULL,
  `opened_at` timestamp NULL DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolved_by_user_id` bigint unsigned DEFAULT NULL,
  `resolution_note` text COLLATE utf8mb4_unicode_ci,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `med_disputes_cajupay_dispute_id_unique` (`cajupay_dispute_id`),
  KEY `med_disputes_order_id_foreign` (`order_id`),
  KEY `med_disputes_tenant_id_status_index` (`tenant_id`,`status`),
  KEY `med_disputes_tenant_id_index` (`tenant_id`),
  KEY `med_disputes_cajupay_payment_id_index` (`cajupay_payment_id`),
  KEY `med_disputes_status_index` (`status`),
  KEY `med_disputes_responsible_party_index` (`responsible_party`),
  KEY `med_disputes_resolved_by_user_id_index` (`resolved_by_user_id`),
  CONSTRAINT `med_disputes_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `member_achievement_unlocks`;
CREATE TABLE `member_achievement_unlocks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `achievement_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unlocked_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `member_ach_unlocks_user_product_ach_unique` (`user_id`,`product_id`,`achievement_id`),
  KEY `tmp_fk_user_id` (`user_id`),
  KEY `member_achievement_unlocks_product_id_foreign` (`product_id`),
  CONSTRAINT `member_achievement_unlocks_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `member_achievement_unlocks_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `member_area_domains`;
CREATE TABLE `member_area_domains` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `member_area_domains_product_id_unique` (`product_id`),
  CONSTRAINT `member_area_domains_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `member_certificates_issued`;
CREATE TABLE `member_certificates_issued` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `issued_at` timestamp NOT NULL,
  `completion_percent` tinyint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `member_certificates_issued_user_id_product_id_unique` (`user_id`,`product_id`),
  KEY `tmp_fk_user_id` (`user_id`),
  KEY `member_certificates_issued_product_id_foreign` (`product_id`),
  CONSTRAINT `member_certificates_issued_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `member_certificates_issued_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `member_comments`;
CREATE TABLE `member_comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `member_lesson_id` bigint unsigned DEFAULT NULL,
  `parent_id` bigint unsigned DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `member_comments_user_id_foreign` (`user_id`),
  KEY `member_comments_member_lesson_id_foreign` (`member_lesson_id`),
  KEY `member_comments_parent_id_foreign` (`parent_id`),
  KEY `member_comments_reviewed_by_foreign` (`reviewed_by`),
  KEY `member_comments_product_id_status_index` (`product_id`,`status`),
  CONSTRAINT `member_comments_member_lesson_id_foreign` FOREIGN KEY (`member_lesson_id`) REFERENCES `member_lessons` (`id`) ON DELETE SET NULL,
  CONSTRAINT `member_comments_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `member_comments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `member_comments_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `member_comments_reviewed_by_foreign` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `member_comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `member_community_pages`;
CREATE TABLE `member_community_pages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `banner` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` int unsigned NOT NULL DEFAULT '0',
  `is_public_posting` tinyint(1) NOT NULL DEFAULT '1',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `member_community_pages_product_id_slug_unique` (`product_id`,`slug`),
  KEY `member_community_pages_slug_index` (`slug`),
  CONSTRAINT `member_community_pages_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `member_community_post_comments`;
CREATE TABLE `member_community_post_comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `member_community_post_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `member_community_post_comments_user_id_foreign` (`user_id`),
  KEY `member_community_post_comments_member_community_post_id_index` (`member_community_post_id`),
  CONSTRAINT `member_community_post_comments_member_community_post_id_foreign` FOREIGN KEY (`member_community_post_id`) REFERENCES `member_community_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `member_community_post_comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `member_community_post_likes`;
CREATE TABLE `member_community_post_likes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `member_community_post_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mc_post_likes_post_user_unique` (`member_community_post_id`,`user_id`),
  KEY `member_community_post_likes_user_id_foreign` (`user_id`),
  CONSTRAINT `member_community_post_likes_member_community_post_id_foreign` FOREIGN KEY (`member_community_post_id`) REFERENCES `member_community_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `member_community_post_likes_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `member_community_posts`;
CREATE TABLE `member_community_posts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `member_community_page_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `member_community_posts_user_id_foreign` (`user_id`),
  KEY `member_community_posts_member_community_page_id_index` (`member_community_page_id`),
  CONSTRAINT `member_community_posts_member_community_page_id_foreign` FOREIGN KEY (`member_community_page_id`) REFERENCES `member_community_pages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `member_community_posts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `member_internal_products`;
CREATE TABLE `member_internal_products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `related_product_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `member_internal_products_product_id_related_product_id_unique` (`product_id`,`related_product_id`),
  KEY `member_internal_products_related_product_id_foreign` (`related_product_id`),
  CONSTRAINT `member_internal_products_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `member_internal_products_related_product_id_foreign` FOREIGN KEY (`related_product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `member_lesson_progress`;
CREATE TABLE `member_lesson_progress` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `member_lesson_id` bigint unsigned NOT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `progress_percent` tinyint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `member_lesson_progress_user_id_member_lesson_id_unique` (`user_id`,`member_lesson_id`),
  KEY `member_lesson_progress_member_lesson_id_foreign` (`member_lesson_id`),
  KEY `member_lesson_progress_product_id_foreign` (`product_id`),
  CONSTRAINT `member_lesson_progress_member_lesson_id_foreign` FOREIGN KEY (`member_lesson_id`) REFERENCES `member_lessons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `member_lesson_progress_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `member_lesson_progress_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `member_lessons`;
CREATE TABLE `member_lessons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `member_module_id` bigint unsigned NOT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` int unsigned NOT NULL DEFAULT '0',
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'video',
  `content_url` text COLLATE utf8mb4_unicode_ci,
  `link_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_files` json DEFAULT NULL,
  `release_after_days` int unsigned DEFAULT NULL,
  `release_at_date` date DEFAULT NULL,
  `content_text` text COLLATE utf8mb4_unicode_ci,
  `duration_seconds` int unsigned DEFAULT NULL,
  `is_free` tinyint(1) NOT NULL DEFAULT '0',
  `watermark_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `member_lessons_member_module_id_foreign` (`member_module_id`),
  KEY `member_lessons_product_id_position_index` (`product_id`,`position`),
  CONSTRAINT `member_lessons_member_module_id_foreign` FOREIGN KEY (`member_module_id`) REFERENCES `member_modules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `member_lessons_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `member_modules`;
CREATE TABLE `member_modules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `member_section_id` bigint unsigned NOT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `related_product_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `access_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `release_after_days` int unsigned DEFAULT NULL,
  `release_at_date` date DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` int unsigned NOT NULL DEFAULT '0',
  `thumbnail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `show_title_on_cover` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `member_modules_member_section_id_foreign` (`member_section_id`),
  KEY `member_modules_product_id_position_index` (`product_id`,`position`),
  KEY `member_modules_related_product_id_foreign` (`related_product_id`),
  CONSTRAINT `member_modules_member_section_id_foreign` FOREIGN KEY (`member_section_id`) REFERENCES `member_sections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `member_modules_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `member_modules_related_product_id_foreign` FOREIGN KEY (`related_product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `member_notifications`;
CREATE TABLE `member_notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `member_notifications_product_id_user_id_read_at_index` (`product_id`,`user_id`,`read_at`),
  KEY `member_notifications_user_id_created_at_index` (`user_id`,`created_at`),
  KEY `member_notifications_type_index` (`type`),
  CONSTRAINT `member_notifications_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `member_notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `member_push_subscriptions`;
CREATE TABLE `member_push_subscriptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `endpoint` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `keys` json DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tmp_fk_user_id` (`user_id`),
  KEY `member_push_subscriptions_product_id_foreign` (`product_id`),
  KEY `member_push_subscriptions_user_id_product_id_index` (`user_id`,`product_id`),
  CONSTRAINT `member_push_subscriptions_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `member_push_subscriptions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `member_sections`;
CREATE TABLE `member_sections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` int unsigned NOT NULL DEFAULT '0',
  `cover_mode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'vertical',
  `section_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'courses',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `member_sections_product_id_position_index` (`product_id`,`position`),
  CONSTRAINT `member_sections_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `member_turma_user`;
CREATE TABLE `member_turma_user` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `member_turma_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `member_turma_user_member_turma_id_user_id_unique` (`member_turma_id`,`user_id`),
  KEY `member_turma_user_user_id_foreign` (`user_id`),
  CONSTRAINT `member_turma_user_member_turma_id_foreign` FOREIGN KEY (`member_turma_id`) REFERENCES `member_turmas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `member_turma_user_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `member_turmas`;
CREATE TABLE `member_turmas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `position` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `member_turmas_product_id_index` (`product_id`),
  CONSTRAINT `member_turmas_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `merchant_admin_notes`;
CREATE TABLE `merchant_admin_notes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `merchant_user_id` bigint unsigned NOT NULL,
  `author_user_id` bigint unsigned NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `merchant_admin_notes_author_user_id_foreign` (`author_user_id`),
  KEY `merchant_admin_notes_merchant_user_id_created_at_index` (`merchant_user_id`,`created_at`),
  CONSTRAINT `merchant_admin_notes_author_user_id_foreign` FOREIGN KEY (`author_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `merchant_admin_notes_merchant_user_id_foreign` FOREIGN KEY (`merchant_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `meta_tracking_events`;
CREATE TABLE `meta_tracking_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `event_name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `context_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `context_id` bigint unsigned NOT NULL,
  `pixel_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `attempts` smallint unsigned NOT NULL DEFAULT '0',
  `last_error` text COLLATE utf8mb4_unicode_ci,
  `response_body` text COLLATE utf8mb4_unicode_ci,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `meta_tracking_events_event_pixel_unique` (`event_id`,`pixel_id`),
  KEY `meta_tracking_events_context_type_context_id_index` (`context_type`,`context_id`),
  KEY `meta_tracking_events_status_created_at_index` (`status`,`created_at`),
  KEY `meta_tracking_events_tenant_id_index` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `migrations`;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=169 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('0001_01_01_000000_create_users_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('0001_01_01_000001_create_cache_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('0001_01_01_000002_create_jobs_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_20_000001_add_role_and_tenant_to_users_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_20_000002_create_settings_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_20_000003_create_products_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_20_000004_create_product_user_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_20_000005_create_orders_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_20_100000_create_plugins_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_20_100001_add_product_image_and_currency', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_20_120001_create_coupons_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_20_130001_create_coupon_product_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_20_140001_add_billing_type_to_products_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_20_150001_add_conversion_pixels_to_products_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_20_200000_drop_cloud_tenant_tables_if_exist', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_21_000001_add_checkout_slug_and_config_to_products_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_21_000002_add_cpf_phone_to_orders_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_21_000003_add_coupon_code_to_orders_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_21_100000_create_gateway_credentials_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_21_160000_add_customer_ip_to_orders_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_000001_add_member_area_config_to_products_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_000002_create_member_area_domains_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_000003_create_member_sections_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_000004_create_member_modules_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_000005_create_member_lessons_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_000006_create_member_lesson_progress_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_000007_create_member_internal_products_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_000008_create_member_turmas_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_000009_create_member_turma_user_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_000010_create_member_comments_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_000011_create_member_community_pages_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_000012_create_member_community_posts_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_000013_create_member_certificates_issued_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_000014_create_member_push_subscriptions_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_200001_add_cover_mode_to_member_sections_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_200001_add_watermark_enabled_to_member_lessons_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_200002_add_show_title_on_cover_to_member_modules_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_200003_add_section_type_to_member_sections_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_22_200004_add_related_product_and_external_to_member_modules_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_23_000001_add_icon_and_banner_to_member_community_pages', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_23_000002_add_image_to_member_community_posts', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_24_000001_add_is_default_to_member_community_pages', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_24_000001_add_link_title_to_member_lessons_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_24_000001_create_member_community_post_likes_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_24_000002_add_avatar_to_users_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_24_000002_create_member_community_post_comments_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_24_000003_create_member_achievement_unlocks_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_25_000001_create_product_offers_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_25_000002_create_subscription_plans_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_25_000003_add_offer_plan_period_to_orders_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_25_000004_create_saved_payment_methods_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_25_000005_create_subscriptions_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_26_000001_change_products_id_to_uuid', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2025_02_27_000001_add_metadata_to_orders_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_25_000001_fix_product_offers_subscription_plans_product_id_uuid', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_26_000001_make_checkout_slug_nullable_on_offers_and_plans', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_26_000002_add_checkout_config_to_offers_and_plans', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_27_000001_fix_member_tables_product_id_uuid', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_27_000002_create_product_order_bumps_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_27_000003_create_order_items_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_27_000004_change_conversion_pixels_to_json', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_27_012304_create_checkout_sessions_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_27_012305_fix_checkout_sessions_product_id_uuid', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_27_100001_create_webhooks_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_27_120000_add_abandoned_webhook_fired_at_to_checkout_sessions', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_27_130000_create_webhook_logs_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_27_140000_create_utmify_integrations_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_27_150000_add_name_to_utmify_integrations', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_27_150000_add_product_filtering_to_webhooks', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_27_150001_create_utmify_integration_product_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_27_160000_create_spedy_integrations_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_02_27_160001_create_spedy_integration_product_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_01_000001_fix_product_user_product_id_uuid', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_01_000002_fix_subscriptions_product_id_uuid', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_07_000001_create_email_campaigns_tables', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_09_100001_create_api_applications_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_09_100002_create_api_checkout_sessions_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_09_100003_add_api_fields_to_orders_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_09_100004_add_webhook_secret_to_api_applications_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_09_100005_add_logo_to_api_applications_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_09_100006_add_checkout_sidebar_bg_to_api_applications_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_09_200000_add_username_to_users_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_09_200001_add_approved_manually_to_orders_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_09_300001_create_panel_push_subscriptions_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_11_000001_create_panel_notifications_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_12_000001_add_event_key_to_panel_notifications_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_13_000001_create_member_notifications_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_15_000001_add_default_return_url_to_api_applications_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_15_000003_add_content_files_to_member_lessons_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_03_15_000004_add_release_schedule_to_member_modules_and_lessons_tables', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_07_000001_create_cademi_integrations_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_07_000002_create_cademi_integration_product_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_07_000003_create_cademi_integration_product_offer_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_07_000004_create_cademi_integration_subscription_plan_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_07_000005_add_delivery_method_and_postback_token_to_cademi_integrations_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_07_000006_add_cademi_produto_ids_to_cademi_pivot_tables', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_07_120000_create_team_roles_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_07_120001_create_team_role_product_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_07_120002_add_team_role_id_to_users_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_07_180000_create_team_audit_logs_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_10_000001_platform_gateway_roles_and_merchant_tables', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_10_120000_email_campaigns_global_tenant_null', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_10_140000_promote_dev_at_dev_com_to_admin', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_11_000001_ensure_platform_merchant_tables', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_11_120000_fix_checkout_sessions_product_id_uuid_pgsql', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_11_140000_merchant_settlement_withdrawals_payout', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_11_200000_ensure_users_payout_and_settlement_columns', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_12_100000_financial_wallets_fees_and_payment_method', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_13_100000_create_branding_settings_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_13_100001_migrate_white_label_settings_to_branding_settings', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_13_120000_add_kyc_fields_and_kyc_documents_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_13_120000_add_public_reference_to_orders_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_13_130000_create_sales_achievements_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_13_130001_seed_sales_achievements_from_config', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_13_160000_create_platform_languages_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_13_160001_create_platform_translations_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_13_160002_seed_platform_languages_and_translations', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_13_170000_seed_spanish_platform_language', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_13_200000_create_product_coproducers_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_14_100000_add_affiliate_columns_to_products_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_14_100001_create_product_affiliate_enrollments_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_14_120000_add_public_token_to_kyc_documents_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_15_100000_fix_products_showcase_requires_affiliate_enabled', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_16_100000_add_conversion_pixels_to_product_affiliate_enrollments_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_17_100000_add_admin_wallet_block_to_tenant_wallets_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_20_100000_add_seller_onboarded_at_to_users_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_20_100001_migrate_aluno_to_cliente_and_buyer_tenant', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_20_100002_add_refund_policy_days_to_products_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_20_100003_create_refund_requests_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_04_21_120000_backfill_products_refund_policy_days', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_05_04_120000_add_tracking_params_to_checkout_sessions', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_05_05_100000_add_admin_blocked_to_products_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_05_06_130100_add_public_and_secret_keys_to_api_applications_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_05_11_140000_ensure_public_key_columns_on_api_applications_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_05_11_160000_add_secret_encrypted_to_api_applications_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_05_18_100000_create_shipping_stores_and_rules_tables', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_05_21_120000_ensure_api_fields_on_orders_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_05_21_140000_add_customer_contact_to_checkout_sessions_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_05_21_150000_add_soft_deletes_to_products_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_05_21_151000_preserve_orders_when_product_deleted', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_05_22_100000_add_provider_to_panel_push_subscriptions', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_05_24_120000_add_legal_consent_fields_to_users_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_05_24_140000_create_med_disputes_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_05_24_160000_add_wallet_transaction_credit_reference', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_05_24_160001_add_withdrawal_processing_and_complete_unique', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_05_28_120000_add_form_timestamps_to_checkout_sessions', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_06_08_120000_add_is_enabled_to_gateway_credentials_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_06_09_100000_add_failed_status_support_to_withdrawals', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_06_09_100001_add_totp_to_users_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_06_10_100000_add_vapid_public_key_to_panel_push_subscriptions', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_06_10_110000_create_merchant_admin_notes_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_06_10_120000_add_kyc_needs_document_review_to_users_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_06_11_120000_sync_platform_translations_from_config', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_06_18_100000_api_scale_foundation', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_06_18_200000_add_webhook_events_and_api_key_secret_encrypted', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_06_18_300000_med_disputes_dual_system', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_06_19_100000_cajupay_accounts', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_06_20_100000_create_meta_tracking_events_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_06_20_100001_add_meta_context_to_checkout_sessions_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_06_20_110000_create_utmify_order_dispatches_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_06_20_120000_add_meta_fbclid_to_checkout_sessions_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_07_03_180000_create_platform_integrax_settings_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_07_03_180001_create_integrax_sms_dispatches_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_07_03_210000_add_integrax_cart_recovery_steps', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_07_04_120000_add_integrax_sms_checkout_only', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_07_09_100000_create_affiliate_commissions_and_order_affiliate_columns', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_07_12_100000_add_affiliate_hide_customer_data_to_products_table', 1);
INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_07_12_120000_normalize_users_email_unique', 1);

DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `product_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_offer_id` bigint unsigned DEFAULT NULL,
  `subscription_plan_id` bigint unsigned DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `position` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_items_product_offer_id_foreign` (`product_offer_id`),
  KEY `order_items_subscription_plan_id_foreign` (`subscription_plan_id`),
  KEY `order_items_order_id_index` (`order_id`),
  KEY `order_items_product_id_foreign` (`product_id`),
  CONSTRAINT `order_items_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `order_items_product_offer_id_foreign` FOREIGN KEY (`product_offer_id`) REFERENCES `product_offers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `order_items_subscription_plan_id_foreign` FOREIGN KEY (`subscription_plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `public_reference` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `affiliate_user_id` bigint unsigned DEFAULT NULL,
  `affiliate_enrollment_id` bigint unsigned DEFAULT NULL,
  `sale_origin` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_offer_id` bigint unsigned DEFAULT NULL,
  `subscription_plan_id` bigint unsigned DEFAULT NULL,
  `api_application_id` bigint unsigned DEFAULT NULL,
  `api_checkout_session_id` bigint unsigned DEFAULT NULL,
  `period_start` date DEFAULT NULL,
  `period_end` date DEFAULT NULL,
  `is_renewal` tinyint(1) NOT NULL DEFAULT '0',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `amount` decimal(10,2) NOT NULL,
  `shipping_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `shipping_store_id` bigint unsigned DEFAULT NULL,
  `shipping_rule_id` bigint unsigned DEFAULT NULL,
  `shipping_address` json DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cpf` varchar(14) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `coupon_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cajupay_account_id` bigint unsigned DEFAULT NULL,
  `payment_method` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_manually` tinyint(1) NOT NULL DEFAULT '0',
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orders_public_reference_unique` (`public_reference`),
  KEY `orders_user_id_foreign` (`user_id`),
  KEY `orders_tenant_id_index` (`tenant_id`),
  KEY `orders_product_offer_id_foreign` (`product_offer_id`),
  KEY `orders_subscription_plan_id_foreign` (`subscription_plan_id`),
  KEY `orders_product_id_foreign` (`product_id`),
  KEY `orders_api_checkout_session_id_index` (`api_checkout_session_id`),
  KEY `orders_shipping_store_id_foreign` (`shipping_store_id`),
  KEY `orders_shipping_rule_id_foreign` (`shipping_rule_id`),
  KEY `orders_gateway_gateway_id_index` (`gateway`,`gateway_id`),
  KEY `orders_tenant_status_created_index` (`tenant_id`,`status`,`created_at`),
  KEY `orders_api_app_status_index` (`api_application_id`,`status`),
  KEY `orders_cajupay_account_id_index` (`cajupay_account_id`),
  KEY `orders_affiliate_user_id_index` (`affiliate_user_id`),
  KEY `orders_affiliate_enrollment_id_index` (`affiliate_enrollment_id`),
  KEY `orders_sale_origin_index` (`sale_origin`),
  CONSTRAINT `orders_api_application_id_foreign` FOREIGN KEY (`api_application_id`) REFERENCES `api_applications` (`id`) ON DELETE SET NULL,
  CONSTRAINT `orders_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `orders_product_offer_id_foreign` FOREIGN KEY (`product_offer_id`) REFERENCES `product_offers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `orders_shipping_rule_id_foreign` FOREIGN KEY (`shipping_rule_id`) REFERENCES `shipping_rules` (`id`) ON DELETE SET NULL,
  CONSTRAINT `orders_shipping_store_id_foreign` FOREIGN KEY (`shipping_store_id`) REFERENCES `shipping_stores` (`id`) ON DELETE SET NULL,
  CONSTRAINT `orders_subscription_plan_id_foreign` FOREIGN KEY (`subscription_plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE SET NULL,
  CONSTRAINT `orders_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `panel_notifications`;
CREATE TABLE `panel_notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `panel_notifications_tenant_id_user_id_read_at_index` (`tenant_id`,`user_id`,`read_at`),
  KEY `panel_notifications_user_id_created_at_index` (`user_id`,`created_at`),
  KEY `panel_notifications_tenant_id_index` (`tenant_id`),
  KEY `panel_notifications_type_index` (`type`),
  KEY `panel_notifications_event_key_index` (`event_key`),
  CONSTRAINT `panel_notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `panel_push_subscriptions`;
CREATE TABLE `panel_push_subscriptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `provider` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'vapid',
  `vapid_public_key` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endpoint` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fcm_token` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `keys` json DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_label` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `panel_push_subscriptions_user_id_tenant_id_index` (`user_id`,`tenant_id`),
  KEY `panel_push_subscriptions_tenant_id_index` (`tenant_id`),
  KEY `panel_push_subscriptions_provider_index` (`provider`),
  KEY `panel_push_subscriptions_fcm_token_index` (`fcm_token`),
  CONSTRAINT `panel_push_subscriptions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `password_reset_tokens`;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `platform_audit_logs`;
CREATE TABLE `platform_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `action` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` json DEFAULT NULL,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `platform_audit_logs_user_id_foreign` (`user_id`),
  KEY `platform_audit_logs_action_index` (`action`),
  CONSTRAINT `platform_audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `platform_integrax_settings`;
CREATE TABLE `platform_integrax_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `sms_checkout_only` tinyint(1) NOT NULL DEFAULT '1',
  `api_token` text COLLATE utf8mb4_unicode_ci,
  `sender_from` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `event_cart_recovery_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `event_order_paid_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `event_access_granted_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `event_pix_generated_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `message_cart_recovery` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message_order_paid` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message_access_granted` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message_pix_generated` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cart_recovery_steps` json DEFAULT NULL,
  `cart_first_delay_minutes` smallint unsigned NOT NULL DEFAULT '10',
  `cart_interval_minutes` int unsigned NOT NULL DEFAULT '1440',
  `cart_max_duration_hours` smallint unsigned NOT NULL DEFAULT '72',
  `cart_max_sends` tinyint unsigned NOT NULL DEFAULT '3',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `platform_languages`;
CREATE TABLE `platform_languages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `platform_languages_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `platform_translations`;
CREATE TABLE `platform_translations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `group` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `locale` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `platform_translations_group_key_locale_unique` (`group`,`key`,`locale`),
  KEY `platform_translations_group_locale_idx` (`group`,`locale`)
) ENGINE=InnoDB AUTO_INCREMENT=1526 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `plugins`;
CREATE TABLE `plugins` (
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1.0.0',
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `config` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `product_affiliate_enrollments`;
CREATE TABLE `product_affiliate_enrollments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `affiliate_user_id` bigint unsigned NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `public_ref` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `conversion_pixels` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pae_product_affiliate_unique` (`product_id`,`affiliate_user_id`),
  UNIQUE KEY `product_affiliate_enrollments_public_ref_unique` (`public_ref`),
  KEY `product_affiliate_enrollments_affiliate_user_id_foreign` (`affiliate_user_id`),
  KEY `product_affiliate_enrollments_status_index` (`status`),
  CONSTRAINT `product_affiliate_enrollments_affiliate_user_id_foreign` FOREIGN KEY (`affiliate_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_affiliate_enrollments_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `product_coproducers`;
CREATE TABLE `product_coproducers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `inviter_user_id` bigint unsigned NOT NULL,
  `co_producer_user_id` bigint unsigned DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `commission_percent` decimal(5,2) NOT NULL,
  `commission_on_direct_sales` tinyint(1) NOT NULL DEFAULT '1',
  `commission_on_affiliate_sales` tinyint(1) NOT NULL DEFAULT '0',
  `duration_preset` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'eternal',
  `starts_at` timestamp NULL DEFAULT NULL,
  `ends_at` timestamp NULL DEFAULT NULL,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_coproducers_token_unique` (`token`),
  KEY `product_coproducers_inviter_user_id_foreign` (`inviter_user_id`),
  KEY `product_coproducers_co_producer_user_id_foreign` (`co_producer_user_id`),
  KEY `product_coproducers_product_id_status_index` (`product_id`,`status`),
  KEY `product_coproducers_email_index` (`email`),
  CONSTRAINT `product_coproducers_co_producer_user_id_foreign` FOREIGN KEY (`co_producer_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `product_coproducers_inviter_user_id_foreign` FOREIGN KEY (`inviter_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_coproducers_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `product_offers`;
CREATE TABLE `product_offers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checkout_slug` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checkout_config` json DEFAULT NULL,
  `position` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_offers_checkout_slug_unique` (`checkout_slug`),
  KEY `product_offers_product_id_foreign` (`product_id`),
  CONSTRAINT `product_offers_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `product_order_bumps`;
CREATE TABLE `product_order_bumps` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_product_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_product_offer_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `price_override` decimal(10,2) DEFAULT NULL,
  `cta_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_order_bumps_target_product_id_foreign` (`target_product_id`),
  KEY `product_order_bumps_target_product_offer_id_foreign` (`target_product_offer_id`),
  KEY `product_order_bumps_product_id_index` (`product_id`),
  CONSTRAINT `product_order_bumps_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_order_bumps_target_product_id_foreign` FOREIGN KEY (`target_product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_order_bumps_target_product_offer_id_foreign` FOREIGN KEY (`target_product_offer_id`) REFERENCES `product_offers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `product_user`;
CREATE TABLE `product_user` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_user_product_id_user_id_unique` (`product_id`,`user_id`),
  KEY `product_user_user_id_foreign` (`user_id`),
  CONSTRAINT `product_user_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_user_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `product_webhook`;
CREATE TABLE `product_webhook` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `webhook_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_webhook_product_id_webhook_id_unique` (`product_id`,`webhook_id`),
  KEY `product_webhook_webhook_id_foreign` (`webhook_id`),
  CONSTRAINT `product_webhook_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_webhook_webhook_id_foreign` FOREIGN KEY (`webhook_id`) REFERENCES `webhooks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checkout_slug` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checkout_config` json DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'course',
  `billing_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'one_time',
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BRL',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `admin_blocked` tinyint(1) NOT NULL DEFAULT '0',
  `affiliate_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `affiliate_commission_percent` decimal(8,2) NOT NULL DEFAULT '0.00',
  `affiliate_manual_approval` tinyint(1) NOT NULL DEFAULT '1',
  `affiliate_show_in_showcase` tinyint(1) NOT NULL DEFAULT '0',
  `affiliate_page_url` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `affiliate_support_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `affiliate_showcase_description` text COLLATE utf8mb4_unicode_ci,
  `affiliate_hide_customer_data` tinyint(1) NOT NULL DEFAULT '0',
  `refund_policy_days` tinyint unsigned DEFAULT NULL,
  `shipping_store_id` bigint unsigned DEFAULT NULL,
  `physical_config` json DEFAULT NULL,
  `conversion_pixels` json DEFAULT NULL,
  `member_area_config` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_tenant_id_slug_unique` (`tenant_id`,`slug`),
  UNIQUE KEY `products_checkout_slug_unique` (`checkout_slug`),
  KEY `products_tenant_id_index` (`tenant_id`),
  KEY `products_slug_index` (`slug`),
  KEY `products_shipping_store_id_foreign` (`shipping_store_id`),
  CONSTRAINT `products_shipping_store_id_foreign` FOREIGN KEY (`shipping_store_id`) REFERENCES `shipping_stores` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `refund_requests`;
CREATE TABLE `refund_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `tenant_id` bigint unsigned NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `customer_reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `seller_rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `gateway_refund_status` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_refund_note` text COLLATE utf8mb4_unicode_ci,
  `resolved_by_user_id` bigint unsigned DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `refund_requests_order_id_foreign` (`order_id`),
  KEY `refund_requests_resolved_by_user_id_foreign` (`resolved_by_user_id`),
  KEY `refund_requests_tenant_id_status_index` (`tenant_id`,`status`),
  KEY `refund_requests_user_id_status_index` (`user_id`,`status`),
  CONSTRAINT `refund_requests_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `refund_requests_resolved_by_user_id_foreign` FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `refund_requests_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `sales_achievements`;
CREATE TABLE `sales_achievements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `threshold` decimal(15,2) NOT NULL DEFAULT '0.00',
  `image` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_achievements_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `saved_payment_methods`;
CREATE TABLE `saved_payment_methods` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `gateway` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gateway_payment_method_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_four` varchar(4) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brand` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `saved_payment_methods_user_id_foreign` (`user_id`),
  KEY `saved_payment_methods_tenant_id_index` (`tenant_id`),
  CONSTRAINT `saved_payment_methods_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_tenant_id_key_unique` (`tenant_id`,`key`),
  KEY `settings_tenant_id_index` (`tenant_id`),
  KEY `settings_key_index` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `shipping_rules`;
CREATE TABLE `shipping_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `shipping_store_id` bigint unsigned NOT NULL,
  `priority` smallint unsigned NOT NULL DEFAULT '100',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `match_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `match_config` json DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `is_free` tinyint(1) NOT NULL DEFAULT '0',
  `delivery_days_min` smallint unsigned DEFAULT NULL,
  `delivery_days_max` smallint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `shipping_rules_shipping_store_id_priority_index` (`shipping_store_id`,`priority`),
  CONSTRAINT `shipping_rules_shipping_store_id_foreign` FOREIGN KEY (`shipping_store_id`) REFERENCES `shipping_stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `shipping_stores`;
CREATE TABLE `shipping_stores` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `origin_zip` varchar(9) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `origin_street` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `origin_number` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `origin_complement` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `origin_neighborhood` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `origin_city` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `origin_state` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `shipping_stores_tenant_id_index` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `spedy_integration_product`;
CREATE TABLE `spedy_integration_product` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `spedy_integration_id` bigint unsigned NOT NULL,
  `product_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `spedy_int_product_unique` (`spedy_integration_id`,`product_id`),
  KEY `spedy_integration_product_product_id_foreign` (`product_id`),
  CONSTRAINT `spedy_integration_product_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `spedy_integration_product_spedy_integration_id_foreign` FOREIGN KEY (`spedy_integration_id`) REFERENCES `spedy_integrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `spedy_integrations`;
CREATE TABLE `spedy_integrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `api_key` text COLLATE utf8mb4_unicode_ci,
  `environment` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'production',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `spedy_integrations_tenant_id_index` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `subscription_plans`;
CREATE TABLE `subscription_plans` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `interval` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checkout_slug` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checkout_config` json DEFAULT NULL,
  `position` int unsigned NOT NULL DEFAULT '0',
  `gateway_plan_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subscription_plans_checkout_slug_unique` (`checkout_slug`),
  KEY `subscription_plans_product_id_foreign` (`product_id`),
  CONSTRAINT `subscription_plans_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `subscriptions`;
CREATE TABLE `subscriptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subscription_plan_id` bigint unsigned NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `current_period_start` date DEFAULT NULL,
  `current_period_end` date DEFAULT NULL,
  `saved_payment_method_id` bigint unsigned DEFAULT NULL,
  `gateway_subscription_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `renewal_token` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subscriptions_renewal_token_unique` (`renewal_token`),
  KEY `subscriptions_user_id_foreign` (`user_id`),
  KEY `subscriptions_subscription_plan_id_foreign` (`subscription_plan_id`),
  KEY `subscriptions_saved_payment_method_id_foreign` (`saved_payment_method_id`),
  KEY `subscriptions_tenant_id_index` (`tenant_id`),
  KEY `subscriptions_product_id_foreign` (`product_id`),
  CONSTRAINT `subscriptions_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subscriptions_saved_payment_method_id_foreign` FOREIGN KEY (`saved_payment_method_id`) REFERENCES `saved_payment_methods` (`id`) ON DELETE SET NULL,
  CONSTRAINT `subscriptions_subscription_plan_id_foreign` FOREIGN KEY (`subscription_plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subscriptions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `team_audit_logs`;
CREATE TABLE `team_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `actor_user_id` bigint unsigned DEFAULT NULL,
  `action` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `team_audit_logs_tenant_id_created_at_index` (`tenant_id`,`created_at`),
  KEY `team_audit_logs_tenant_id_index` (`tenant_id`),
  KEY `team_audit_logs_actor_user_id_index` (`actor_user_id`),
  KEY `team_audit_logs_action_index` (`action`),
  KEY `team_audit_logs_target_type_index` (`target_type`),
  KEY `team_audit_logs_target_id_index` (`target_id`),
  CONSTRAINT `team_audit_logs_actor_user_id_foreign` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `team_role_product`;
CREATE TABLE `team_role_product` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `team_role_id` bigint unsigned NOT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `team_role_product_team_role_id_product_id_unique` (`team_role_id`,`product_id`),
  KEY `team_role_product_product_id_foreign` (`product_id`),
  CONSTRAINT `team_role_product_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `team_role_product_team_role_id_foreign` FOREIGN KEY (`team_role_id`) REFERENCES `team_roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `team_roles`;
CREATE TABLE `team_roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permissions` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `team_roles_tenant_id_name_unique` (`tenant_id`,`name`),
  KEY `team_roles_tenant_id_index` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `tenant_wallets`;
CREATE TABLE `tenant_wallets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `available_balance` decimal(14,2) NOT NULL DEFAULT '0.00',
  `available_pix` decimal(14,2) NOT NULL DEFAULT '0.00',
  `available_card` decimal(14,2) NOT NULL DEFAULT '0.00',
  `available_boleto` decimal(14,2) NOT NULL DEFAULT '0.00',
  `pending_balance` decimal(14,2) NOT NULL DEFAULT '0.00',
  `pending_pix` decimal(14,2) NOT NULL DEFAULT '0.00',
  `pending_card` decimal(14,2) NOT NULL DEFAULT '0.00',
  `pending_boleto` decimal(14,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BRL',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `admin_withdrawal_blocked` tinyint(1) NOT NULL DEFAULT '0',
  `admin_blocked_amount` decimal(14,2) DEFAULT NULL,
  `admin_block_until` timestamp NULL DEFAULT NULL,
  `admin_block_note` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_wallets_tenant_id_unique` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'aluno',
  `tenant_id` bigint unsigned DEFAULT NULL,
  `team_role_id` bigint unsigned DEFAULT NULL,
  `person_type` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `legal_representative_cpf` varchar(14) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_zip` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_street` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_number` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_complement` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_neighborhood` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_city` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_state` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monthly_revenue_range` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kyc_status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not_submitted',
  `kyc_rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `kyc_reviewed_at` timestamp NULL DEFAULT NULL,
  `kyc_reviewed_by` bigint unsigned DEFAULT NULL,
  `account_status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'approved',
  `merchant_fees` json DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `totp_secret` text COLLATE utf8mb4_unicode_ci,
  `totp_enabled_at` timestamp NULL DEFAULT NULL,
  `seller_onboarded_at` timestamp NULL DEFAULT NULL,
  `privacy_policy_accepted_at` timestamp NULL DEFAULT NULL,
  `terms_accepted_at` timestamp NULL DEFAULT NULL,
  `legal_consent_version` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `merchant_settlement_overrides` json DEFAULT NULL,
  `merchant_gateway_order` json DEFAULT NULL,
  `cajupay_account_id` bigint unsigned DEFAULT NULL,
  `payout_settings` json DEFAULT NULL,
  `kyc_needs_document_review` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_username_unique` (`username`),
  KEY `users_tenant_id_index` (`tenant_id`),
  KEY `users_team_role_id_foreign` (`team_role_id`),
  KEY `users_kyc_reviewed_by_foreign` (`kyc_reviewed_by`),
  KEY `users_cajupay_account_id_index` (`cajupay_account_id`),
  CONSTRAINT `users_kyc_reviewed_by_foreign` FOREIGN KEY (`kyc_reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_team_role_id_foreign` FOREIGN KEY (`team_role_id`) REFERENCES `team_roles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `utmify_integration_product`;
CREATE TABLE `utmify_integration_product` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `utmify_integration_id` bigint unsigned NOT NULL,
  `product_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `utmify_int_product_unique` (`utmify_integration_id`,`product_id`),
  KEY `utmify_integration_product_product_id_foreign` (`product_id`),
  CONSTRAINT `utmify_integration_product_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `utmify_integration_product_utmify_integration_id_foreign` FOREIGN KEY (`utmify_integration_id`) REFERENCES `utmify_integrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `utmify_integrations`;
CREATE TABLE `utmify_integrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UTMfy',
  `api_key` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `utmify_integrations_tenant_id_index` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `utmify_order_dispatches`;
CREATE TABLE `utmify_order_dispatches` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `order_id` bigint unsigned NOT NULL,
  `utmify_integration_id` bigint unsigned NOT NULL,
  `utmify_status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dispatch_status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `attempts` smallint unsigned NOT NULL DEFAULT '0',
  `last_error` text COLLATE utf8mb4_unicode_ci,
  `response_body` text COLLATE utf8mb4_unicode_ci,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `utmify_order_dispatches_unique` (`order_id`,`utmify_integration_id`,`utmify_status`),
  KEY `utmify_order_dispatches_tenant_id_index` (`tenant_id`),
  KEY `utmify_order_dispatches_order_id_index` (`order_id`),
  KEY `utmify_order_dispatches_utmify_integration_id_index` (`utmify_integration_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `wallet_transactions`;
CREATE TABLE `wallet_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `order_id` bigint unsigned DEFAULT NULL,
  `withdrawal_id` bigint unsigned DEFAULT NULL,
  `bucket` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `credit_reference` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount_gross` decimal(14,2) NOT NULL DEFAULT '0.00',
  `amount_fee` decimal(14,2) NOT NULL DEFAULT '0.00',
  `amount_net` decimal(14,2) NOT NULL DEFAULT '0.00',
  `meta` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `wallet_transactions_credit_reference_unique` (`credit_reference`),
  UNIQUE KEY `wallet_tx_withdrawal_complete_unique` (`withdrawal_id`,`type`),
  KEY `wallet_transactions_order_id_foreign` (`order_id`),
  KEY `wallet_transactions_tenant_id_index` (`tenant_id`),
  KEY `wallet_transactions_withdrawal_id_index` (`withdrawal_id`),
  CONSTRAINT `wallet_transactions_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `webhook_logs`;
CREATE TABLE `webhook_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `webhook_id` bigint unsigned NOT NULL,
  `event` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_label` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_payload` json DEFAULT NULL,
  `response_status` smallint unsigned DEFAULT NULL,
  `response_body` text COLLATE utf8mb4_unicode_ci,
  `success` tinyint(1) NOT NULL,
  `error_message` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'job',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `webhook_logs_webhook_id_created_at_index` (`webhook_id`,`created_at`),
  CONSTRAINT `webhook_logs_webhook_id_foreign` FOREIGN KEY (`webhook_id`) REFERENCES `webhooks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `webhooks`;
CREATE TABLE `webhooks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bearer_token` text COLLATE utf8mb4_unicode_ci,
  `events` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `webhooks_tenant_id_index` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `withdrawals`;
CREATE TABLE `withdrawals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `api_application_id` bigint unsigned DEFAULT NULL,
  `api_key_id` bigint unsigned DEFAULT NULL,
  `amount` decimal(14,2) NOT NULL,
  `fee_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `failed_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BRL',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `payout_provider` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payout_external_id` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payout_meta` json DEFAULT NULL,
  `payout_manual` tinyint(1) NOT NULL DEFAULT '0',
  `bucket` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pix',
  PRIMARY KEY (`id`),
  KEY `withdrawals_user_id_foreign` (`user_id`),
  KEY `withdrawals_tenant_id_index` (`tenant_id`),
  KEY `withdrawals_status_index` (`status`),
  KEY `withdrawals_payout_external_id_index` (`payout_external_id`),
  KEY `withdrawals_api_application_id_index` (`api_application_id`),
  KEY `withdrawals_api_key_id_index` (`api_key_id`),
  CONSTRAINT `withdrawals_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;
