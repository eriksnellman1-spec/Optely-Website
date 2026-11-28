-- Optely Admin – databasschema (MySQL 5.7+ / MariaDB 10.3+)
-- Kör en gång, t.ex. via phpMyAdmin → Importera.

SET NAMES utf8mb4;

-- Månadsdata för Optely (företagets ekonomi)
CREATE TABLE IF NOT EXISTS months (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  month                 CHAR(7)       NOT NULL,              -- "2026-05"
  revenue               DECIMAL(12,2) NOT NULL DEFAULT 0,    -- Fakturerat totalt (får vara negativt)
  mrr                   DECIMAL(12,2) NOT NULL DEFAULT 0,    -- Löpande intäkter / MRR
  one_off               DECIMAL(12,2) NOT NULL DEFAULT 0,    -- Engångsintäkter
  costs                 DECIMAL(12,2) NOT NULL DEFAULT 0,
  customers             INT UNSIGNED  NOT NULL DEFAULT 0,    -- Betalande kunder
  leads                 INT UNSIGNED  NOT NULL DEFAULT 0,
  hours                 DECIMAL(8,1)  NOT NULL DEFAULT 0,
  note                  TEXT          NULL,
  cum_revenue_override  DECIMAL(12,2) NULL,                  -- Fast kumulativ omsättning från och med månaden
  cum_net_override      DECIMAL(12,2) NULL,                  -- Fast kumulativt resultat från och med månaden
  created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_months_month (month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fakturor
CREATE TABLE IF NOT EXISTS invoices (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  number       VARCHAR(50)   NULL,
  customer     VARCHAR(190)  NOT NULL,
  description  VARCHAR(500)  NOT NULL DEFAULT '',
  amount       DECIMAL(12,2) NOT NULL DEFAULT 0,    -- Belopp exkl. moms
  vat          DECIMAL(5,2)  NOT NULL DEFAULT 25.5, -- Moms i %
  issued       DATE          NULL,
  due          DATE          NULL,
  status       VARCHAR(20)   NOT NULL DEFAULT 'Utkast', -- Utkast / Skickad / Betald / Krediterad
  paid_at      DATE          NULL,
  source       VARCHAR(20)   NOT NULL DEFAULT 'manuell', -- manuell / api / stripe / import
  external_id  VARCHAR(120)  NULL,                       -- t.ex. Stripe-fakturans id
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_invoices_external (external_id),
  KEY ix_invoices_status (status),
  KEY ix_invoices_issued (issued)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Investeringar: innehav
CREATE TABLE IF NOT EXISTS holdings (
  id                   INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name                 VARCHAR(190)  NOT NULL,
  type                 VARCHAR(20)   NOT NULL DEFAULT 'Aktie', -- Aktie / Fond / Fastighet
  value                DECIMAL(14,2) NOT NULL DEFAULT 0,       -- Nuvarande värde
  purchase_value       DECIMAL(14,2) NOT NULL DEFAULT 0,       -- Köpvärde (startköp)
  purchase_date        DATE          NULL,
  monthly_saving       DECIMAL(12,2) NOT NULL DEFAULT 0,
  illiquid             TINYINT(1)    NOT NULL DEFAULT 0,       -- Exit-position i onoterat bolag
  return_pct_override  DECIMAL(8,2)  NULL,                     -- Manuellt satt avkastning i %
  updated              DATE          NULL,
  created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_holdings_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Investeringar: portföljvärde per månad (med ögonblicksbild per innehav)
CREATE TABLE IF NOT EXISTS invest_months (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  month     CHAR(7)       NOT NULL,
  total     DECIMAL(14,2) NOT NULL DEFAULT 0,
  snapshot  TEXT          NULL, -- JSON: [{"name": "...", "value": 123}]
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_invest_months_month (month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Logg över allt som kommer in via API och webhooks
CREATE TABLE IF NOT EXISTS events (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  source      VARCHAR(30)  NOT NULL,  -- api / stripe / import
  type        VARCHAR(80)  NOT NULL,
  summary     VARCHAR(500) NOT NULL DEFAULT '',
  ok          TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_events_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inloggningsförsök (skydd mot lösenordsgissning)
CREATE TABLE IF NOT EXISTS login_attempts (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ip            VARCHAR(45)  NOT NULL,
  attempted_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_login_attempts_ip (ip, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
