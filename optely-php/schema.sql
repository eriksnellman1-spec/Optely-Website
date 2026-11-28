-- Optely O.R. (PHP) – databasschema för MySQL 8 / MariaDB 10.6+.
-- Importera i phpMyAdmin på Hostinger (Databaser → phpMyAdmin → Importera).
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS companies (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  org_nr        VARCHAR(32)  NULL,
  city          VARCHAR(120) NULL,
  industry      VARCHAR(255) NULL,
  website       VARCHAR(255) NULL,
  contact_name  VARCHAR(160) NULL,
  contact_role  VARCHAR(120) NULL,
  phone         VARCHAR(60)  NULL,
  email         VARCHAR(190) NULL,
  notes         TEXT         NULL,
  -- ny: ej släppt i kön · ko: i ringkön · ring_senare · mote_bokat · kund · nej · inget_svar · ring_ej
  status        VARCHAR(20)  NOT NULL DEFAULT 'ny',
  next_call_at  DATETIME     NULL,
  meeting_at    DATETIME     NULL,
  attempts      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  released_on   DATE         NULL,
  source        VARCHAR(120) NULL,
  created_at    DATETIME     NOT NULL,
  updated_at    DATETIME     NOT NULL,
  INDEX idx_status_next (status, next_call_at),
  INDEX idx_released (released_on),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_swedish_ci;

CREATE TABLE IF NOT EXISTS calls (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id  INT UNSIGNED NOT NULL,
  outcome     VARCHAR(30)  NOT NULL,
  note        TEXT         NULL,
  created_at  DATETIME     NOT NULL,
  INDEX idx_company (company_id, created_at),
  INDEX idx_created (created_at),
  CONSTRAINT fk_calls_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_swedish_ci;

CREATE TABLE IF NOT EXISTS customers (
  company_id   INT UNSIGNED PRIMARY KEY,
  project      VARCHAR(255) NULL,
  value_eur    INT UNSIGNED NULL,
  monthly_eur  INT UNSIGNED NULL,
  invoiced     TINYINT(1)   NOT NULL DEFAULT 0,
  maintenance  TINYINT(1)   NOT NULL DEFAULT 0,
  active       TINYINT(1)   NOT NULL DEFAULT 1,
  started_on   DATE         NULL,
  note         TEXT         NULL,
  updated_at   DATETIME     NOT NULL,
  CONSTRAINT fk_customers_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_swedish_ci;
