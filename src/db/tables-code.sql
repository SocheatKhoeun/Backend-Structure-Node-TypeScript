-- InventoryPOS schema (PostgreSQL)
-- Run with: psql -h localhost -p 5432 -U pinkachu -d uams_db -f inventorypos.sql

BEGIN;

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== Enums =====
CREATE TYPE gender_enum                     AS ENUM ('male','female','other');
CREATE TYPE customer_type_enum              AS ENUM ('individual','company');
CREATE TYPE order_sale_status_enum          AS ENUM ('order','sale','cancel');
CREATE TYPE order_payment_status_enum       AS ENUM ('unpaid','partial','paid');
CREATE TYPE order_sale_type_enum            AS ENUM ('Finished Good','Material');
CREATE TYPE payments_payment_status_enum    AS ENUM ('pending','paid','partially_paid','cancelled');

-- ===== Tables =====
CREATE TABLE settings (
  id             BIGSERIAL PRIMARY KEY,
  global_id      UUID UNIQUE DEFAULT gen_random_uuid(),
  key            VARCHAR UNIQUE,
  value          VARCHAR,
  description    VARCHAR,
  status         smallint DEFAULT 1, -- 1 active, 0 inactive, 2 delete
  created_by     BIGINT,
  updated_by     BIGINT,
  deleted_by     BIGINT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE TABLE roles (
  id             BIGSERIAL PRIMARY KEY,
  global_id      UUID UNIQUE DEFAULT gen_random_uuid(),
  name           VARCHAR,
  description    VARCHAR,
  permissions    jsonb, -- JSONB column for permissions
  status         smallint DEFAULT 1, -- 1 active, 0 inactive, 2 delete
  created_by     BIGINT,
  updated_by     BIGINT,
  deleted_by     BIGINT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE TABLE users (
  id               BIGSERIAL PRIMARY KEY,
  global_id        UUID UNIQUE DEFAULT gen_random_uuid(),
  username         VARCHAR,
  last_name        VARCHAR,
  first_name       VARCHAR,
  email            VARCHAR UNIQUE,
  phone            VARCHAR UNIQUE,
  dob              DATE,
  bio              TEXT,
  gender           gender_enum,
  profile_picture  VARCHAR,
  password         VARCHAR,
  status           smallint DEFAULT 1, -- 1 active, 0 inactive, 2 delete
  role_id          BIGINT NOT NULL,
  created_by       BIGINT,
  updated_by       BIGINT,
  deleted_by       BIGINT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  deleted_at       TIMESTAMPTZ 
);
--------------------------------------------

CREATE TABLE categories (
  id             BIGSERIAL PRIMARY KEY,
  global_id      UUID UNIQUE DEFAULT gen_random_uuid(),
  category       VARCHAR,
  sub_category   TEXT[],
  description    TEXT,
  status           smallint DEFAULT 1, -- 1 active, 0 inactive, 2 delete
  created_by     BIGINT,
  updated_by     BIGINT,
  deleted_by     BIGINT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE TABLE colors (
  id             BIGSERIAL PRIMARY KEY,
  global_id      UUID UNIQUE DEFAULT gen_random_uuid(),
  name           VARCHAR,
  hex            VARCHAR,
  status           smallint DEFAULT 1, -- 1 active, 0 inactive, 2 delete
  created_by     BIGINT,
  updated_by     BIGINT,
  deleted_by     BIGINT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE TABLE products (
  id             BIGSERIAL PRIMARY KEY,
  global_id      UUID UNIQUE DEFAULT gen_random_uuid(),
  product_name   VARCHAR,
  product_code   VARCHAR UNIQUE,
  status           smallint DEFAULT 1, -- 1 active, 0 inactive, 2 delete
  img_url        VARCHAR,
  category_id    BIGINT,
  created_by     BIGINT,
  updated_by     BIGINT,
  deleted_by     BIGINT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE TABLE sub_products (
  id             BIGSERIAL PRIMARY KEY,
  global_id      UUID UNIQUE DEFAULT gen_random_uuid(),
  product_id     BIGINT,
  category_id    BIGINT,
  sub_category   VARCHAR,
  stock_in       NUMERIC(12,3),
  stock_out      NUMERIC(12,3),
  quantity       NUMERIC(12,3),
  stock_type     VARCHAR,
  code           VARCHAR UNIQUE,
  pieces         VARCHAR,
  thickness      VARCHAR,
  length         VARCHAR,
  unit_weight    VARCHAR,
  total_weight   VARCHAR,
  sale_price     NUMERIC(12,2),
  buy_price      NUMERIC(12,2),
  color_id       BIGINT,
  discount       NUMERIC(12,2),
  description    VARCHAR,
  remark         SMALLINT,
  status           smallint DEFAULT 1, -- 1 active, 0 inactive, 2 delete
  created_by     BIGINT,
  updated_by     BIGINT,
  deleted_by     BIGINT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE TABLE customers (
  id             BIGSERIAL PRIMARY KEY,
  global_id      UUID UNIQUE DEFAULT gen_random_uuid(),
  name           VARCHAR,
  email          VARCHAR UNIQUE,
  phone_number   VARCHAR UNIQUE,
  address        VARCHAR,
  type           customer_type_enum DEFAULT 'individual',
  vat_number     VARCHAR,
  gender         gender_enum,
  created_by     BIGINT,
  updated_by     BIGINT,
  deleted_by     BIGINT,
  status           smallint DEFAULT 1, -- 1 active, 0 inactive, 2 delete
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE TABLE projects (
  id             BIGSERIAL PRIMARY KEY,
  global_id      UUID UNIQUE DEFAULT gen_random_uuid(),
  name           VARCHAR,
  customer_id    BIGINT,
  status           smallint DEFAULT 1, -- 1 active, 0 inactive, 2 delete
  created_by     BIGINT,
  updated_by     BIGINT,
  deleted_by     BIGINT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE TABLE orders (
  id               BIGSERIAL PRIMARY KEY,
  global_id        UUID UNIQUE DEFAULT gen_random_uuid(),
  customer_id      BIGINT,
  project_id       BIGINT,
  order_mode       SMALLINT, -- 1 order, 0 add stock
  sale_status      order_sale_status_enum DEFAULT 'order',
  payment_status   order_payment_status_enum DEFAULT 'unpaid',
  order_code       VARCHAR UNIQUE NOT NULL,
  sale_type        order_sale_type_enum DEFAULT 'Finished Good',
  total_price      NUMERIC(12,2) DEFAULT 0.00,
  order_date       DATE DEFAULT current_date,
  delivery_date    DATE DEFAULT current_date,
  title            VARCHAR,
  notes            TEXT,
  status           smallint DEFAULT 1, -- 1 active, 0 inactive, 2 delete
  created_by       BIGINT,
  updated_by       BIGINT,
  deleted_by       BIGINT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE TABLE order_items (
  id             BIGSERIAL PRIMARY KEY,
  global_id      UUID UNIQUE DEFAULT gen_random_uuid(),
  order_id       BIGINT,
  sub_product_id BIGINT,
  quantity       INTEGER,
  unit_price     NUMERIC(12,2),
  total_price    NUMERIC(12,2),
  notes          TEXT,
  status           smallint DEFAULT 1, -- 1 active, 0 inactive, 2 delete
  created_by     BIGINT,
  updated_by     BIGINT,
  deleted_by     BIGINT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE TABLE payments (
  id                 BIGSERIAL PRIMARY KEY,
  global_id          UUID UNIQUE DEFAULT gen_random_uuid(),
  order_id           BIGINT,
  customer_id        BIGINT,
  service_name       VARCHAR,
  amount_paid        NUMERIC(12,2),
  payment_reference  VARCHAR,
  payment_method     VARCHAR,
  payment_status     payments_payment_status_enum,
  notes              VARCHAR,
  payment_date       DATE,
  status           smallint DEFAULT 1, -- 1 active, 0 inactive, 2 delete
  created_by         BIGINT,
  updated_by         BIGINT,
  deleted_by         BIGINT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),
  deleted_at         TIMESTAMPTZ
);

COMMIT;
