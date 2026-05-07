-- ============================================================
-- Portfolio Site — Neon PostgreSQL Schema
-- 商品企划 + 设计企划 中台数据库
-- 执行方式: 在 Neon Console → SQL Editor 粘贴执行
-- ============================================================

-- ---------- 维度表 ----------

CREATE TABLE IF NOT EXISTS dim_sku (
    sku_id                  TEXT PRIMARY KEY,
    sku_name                TEXT,
    category_id             TEXT,
    category_name           TEXT,
    season_year             TEXT,
    season                  TEXT,
    price_band              TEXT,
    msrp                    INTEGER,
    lifecycle               TEXT,
    launch_date             DATE,
    color_family            TEXT,
    product_line            TEXT,
    target_age_group        TEXT,
    gender                  TEXT,
    launch_wave             TEXT,
    color                   TEXT,
    target_audience         TEXT,
    category_l1             TEXT,
    category_l2             TEXT,
    dev_season_year         TEXT,
    dev_season              TEXT,
    product_track           TEXT,
    is_carryover            BOOLEAN DEFAULT FALSE,
    carryover_type          TEXT,
    carryover_status        TEXT,
    monitor_mode            TEXT,
    non_main_reason         TEXT,
    carryover_protection_end DATE,
    carryover_entry_source  TEXT
);

CREATE TABLE IF NOT EXISTS dim_wave_plan (
    id              TEXT PRIMARY KEY,
    season          TEXT,
    wave            TEXT,
    launch_date     DATE,
    theme           TEXT,
    temp_zone       TEXT,
    sku_plan        INTEGER,
    sku_actual      INTEGER,
    new_ratio       NUMERIC(5,4),
    old_ratio       NUMERIC(5,4),
    units_plan      INTEGER,
    revenue_plan    INTEGER,
    category_mix    TEXT
);

CREATE TABLE IF NOT EXISTS dim_region (
    province            TEXT PRIMARY KEY,
    region_id           TEXT,
    region_name         TEXT,
    total_stores        INTEGER,
    net_sales           BIGINT,
    plan_sales          BIGINT,
    achievement_rate    NUMERIC(5,4),
    sell_through        NUMERIC(5,4),
    tier_mix            TEXT,
    format_mix          TEXT
);

CREATE TABLE IF NOT EXISTS dim_channel (
    channel_id      TEXT PRIMARY KEY,
    channel_type    TEXT,
    channel_name    TEXT,
    is_online       BOOLEAN DEFAULT FALSE,
    region          TEXT,
    city_tier       TEXT,
    store_format    TEXT
);

CREATE TABLE IF NOT EXISTS dim_competitor (
    id              TEXT PRIMARY KEY,
    name            TEXT,
    position        TEXT,
    market_share    NUMERIC(6,4),
    yoy             NUMERIC(6,4),
    radar           TEXT,
    price_band_mix  TEXT,
    category_mix    TEXT,
    trend_tags      TEXT,
    hot_skus        TEXT
);

-- ---------- 事实表 ----------

CREATE TABLE IF NOT EXISTS fact_sales (
    record_id                   TEXT PRIMARY KEY,
    sku_id                      TEXT REFERENCES dim_sku(sku_id),
    channel_id                  TEXT,
    season_year                 TEXT,
    season                      TEXT,
    wave                        TEXT,
    week_num                    INTEGER,
    unit_sold                   INTEGER,
    gross_sales_amt             INTEGER,
    net_sales_amt               INTEGER,
    discount_amt                INTEGER,
    discount_rate               NUMERIC(6,4),
    cogs_amt                    INTEGER,
    gross_profit_amt            INTEGER,
    gross_margin_rate           NUMERIC(6,4),
    cumulative_sell_through     NUMERIC(6,4),
    on_hand_unit                INTEGER,
    sale_year                   TEXT,
    sale_month                  INTEGER,
    sale_wave                   TEXT,
    sales_season_year           TEXT,
    sales_season                TEXT,
    product_track               TEXT,
    is_carryover                BOOLEAN DEFAULT FALSE,
    carryover_type              TEXT,
    carryover_status            TEXT,
    monitor_mode                TEXT,
    non_main_reason             TEXT,
    carryover_protection_end    DATE,
    carryover_entry_source      TEXT
);

CREATE INDEX IF NOT EXISTS idx_fact_sales_sku     ON fact_sales(sku_id);
CREATE INDEX IF NOT EXISTS idx_fact_sales_season  ON fact_sales(season_year, season);
CREATE INDEX IF NOT EXISTS idx_fact_sales_wave    ON fact_sales(wave);
CREATE INDEX IF NOT EXISTS idx_fact_sales_week    ON fact_sales(week_num);

CREATE TABLE IF NOT EXISTS fact_inventory (
    id              SERIAL PRIMARY KEY,
    date            DATE,
    store_id        TEXT,
    sku_id          TEXT REFERENCES dim_sku(sku_id),
    bop_qty         INTEGER,
    inbound_qty     INTEGER,
    transfer_in     INTEGER,
    transfer_out    INTEGER,
    sales_qty       INTEGER,
    off_shelf_qty   INTEGER,
    damage_qty      INTEGER,
    eop_qty         INTEGER,
    inventory_amount BIGINT
);

CREATE INDEX IF NOT EXISTS idx_fact_inventory_sku  ON fact_inventory(sku_id);
CREATE INDEX IF NOT EXISTS idx_fact_inventory_date ON fact_inventory(date);

CREATE TABLE IF NOT EXISTS fact_ops (
    record_key      TEXT PRIMARY KEY,
    sku_id          TEXT REFERENCES dim_sku(sku_id),
    channel_id      TEXT,
    season_year     TEXT,
    season          TEXT,
    wave            TEXT,
    week_num        INTEGER,
    demand_pairs    NUMERIC(12,2),
    ship_pairs      NUMERIC(12,2),
    reorder_pairs   NUMERIC(12,2),
    fill_rate       NUMERIC(6,4),
    reorder_rate    NUMERIC(6,4),
    source_type     TEXT
);

CREATE INDEX IF NOT EXISTS idx_fact_ops_sku    ON fact_ops(sku_id);
CREATE INDEX IF NOT EXISTS idx_fact_ops_season ON fact_ops(season_year, season);

CREATE TABLE IF NOT EXISTS fact_plan (
    id                      SERIAL PRIMARY KEY,
    year                    INTEGER,
    season                  TEXT,
    wave                    TEXT,
    plan_sku                INTEGER,
    plan_sales              BIGINT,
    plan_gm                 NUMERIC(6,4),
    plan_buy_units          INTEGER,
    plan_otb_budget         BIGINT,
    plan_opening_inventory  BIGINT,
    plan_closing_inventory  BIGINT
);

CREATE TABLE IF NOT EXISTS fact_competitor (
    record_id               TEXT PRIMARY KEY,
    competitor_name         TEXT,
    category_name           TEXT,
    price_band              TEXT,
    price_band_name         TEXT,
    estimated_sales_amt     BIGINT,
    estimated_units         INTEGER,
    market_share_pct        TEXT
);

CREATE TABLE IF NOT EXISTS otb_bridge_inputs (
    bridge_input_id         TEXT PRIMARY KEY,
    otb_structure_id        TEXT,
    brand                   TEXT,
    category_l1             TEXT,
    category_l2             TEXT,
    category_l3             TEXT,
    scene                   TEXT,
    channel_focus           TEXT,
    forecast_sales          BIGINT,
    forecast_units          INTEGER,
    wave_budget_share       NUMERIC(6,4),
    price_band_budget_share NUMERIC(6,4),
    spu_target              INTEGER,
    sku_target              INTEGER,
    average_depth           NUMERIC(6,2),
    role_mix                TEXT,
    development_mix         TEXT,
    platform_mix            TEXT,
    structure_types         TEXT,
    sole_types              TEXT,
    last_types              TEXT,
    lead_category           BOOLEAN DEFAULT FALSE,
    lead_wave               BOOLEAN DEFAULT FALSE,
    lead_price_band         BOOLEAN DEFAULT FALSE,
    recommended_action      TEXT
);

CREATE TABLE IF NOT EXISTS sales_forecasts (
    forecast_id             TEXT PRIMARY KEY,
    year                    TEXT,
    season                  TEXT,
    quarter                 TEXT,
    brand                   TEXT,
    wave_id                 TEXT,
    wave_label              TEXT,
    channel_type            TEXT,
    scenario_type           TEXT,
    forecast_sales          BIGINT,
    forecast_units          INTEGER,
    sell_through_target     NUMERIC(6,4),
    gross_margin_target     NUMERIC(6,4),
    note                    TEXT
);

-- ---------- 设计企划表 ----------

CREATE TABLE IF NOT EXISTS fp_waves (
    wave_id             TEXT PRIMARY KEY,
    wave_name           TEXT,
    launch_window       TEXT,
    theme               TEXT,
    status              TEXT,
    planned_sku_count   INTEGER,
    actual_sku_count    INTEGER
);

CREATE TABLE IF NOT EXISTS fp_design_items (
    item_id                 TEXT PRIMARY KEY,
    series_id               TEXT,
    item_name               TEXT,
    sku_code                TEXT,
    product_role            TEXT,
    category                TEXT,
    occasion                TEXT,
    design_status           TEXT,
    colorway                TEXT,
    material                TEXT,
    price_point             INTEGER,
    target_launch_date      DATE,
    designer                TEXT,
    thumbnail_url           TEXT,
    design_notes            TEXT,
    created_at              TIMESTAMPTZ,
    updated_at              TIMESTAMPTZ,
    source                  TEXT DEFAULT 'manual',
    source_id               TEXT,
    sync_status             TEXT DEFAULT 'synced',
    target_cost_estimate    INTEGER,
    sample_quoted_cost      INTEGER,
    final_locked_cost       INTEGER,
    tech_pack_status        TEXT,
    tooling_status          TEXT,
    tooling_notes           TEXT
);

CREATE TABLE IF NOT EXISTS fp_gate_nodes (
    gate_id         TEXT PRIMARY KEY,
    style_id        TEXT,
    gate_group      TEXT,
    gate_type       TEXT,
    gate_name       TEXT,
    planned_date    DATE,
    actual_date     DATE,
    completed       BOOLEAN DEFAULT FALSE,
    delayed         BOOLEAN DEFAULT FALSE,
    blocked         BOOLEAN DEFAULT FALSE,
    owner           TEXT,
    impact_wave     TEXT,
    note            TEXT
);

CREATE INDEX IF NOT EXISTS idx_gate_nodes_style ON fp_gate_nodes(style_id);
CREATE INDEX IF NOT EXISTS idx_gate_nodes_group ON fp_gate_nodes(gate_group);

CREATE TABLE IF NOT EXISTS fp_review_records (
    review_id           TEXT PRIMARY KEY,
    style_id            TEXT,
    review_date         DATE,
    review_type         TEXT,
    conclusion          TEXT,
    issue_description   TEXT,
    change_request      TEXT,
    owner               TEXT,
    due_date            DATE,
    closed              BOOLEAN DEFAULT FALSE,
    blocked             BOOLEAN DEFAULT FALSE,
    impact_scope        TEXT,
    next_review_date    DATE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_records_style ON fp_review_records(style_id);

CREATE TABLE IF NOT EXISTS fp_action_items (
    action_id       TEXT PRIMARY KEY,
    review_id       TEXT REFERENCES fp_review_records(review_id),
    style_id        TEXT,
    action_type     TEXT,
    action_description TEXT,
    status          TEXT DEFAULT 'in_progress',
    owner           TEXT,
    due_date        DATE,
    completed_at    TIMESTAMPTZ,
    reapproved      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fp_assets (
    asset_id            TEXT PRIMARY KEY,
    asset_type          TEXT,
    series_id           TEXT,
    title               TEXT,
    description         TEXT,
    file_url            TEXT,
    thumbnail_url       TEXT,
    tags                JSONB DEFAULT '[]',
    uploaded_by         TEXT,
    uploaded_at         TIMESTAMPTZ,
    featured_in_report  BOOLEAN DEFAULT FALSE,
    source              TEXT DEFAULT 'manual',
    source_id           TEXT,
    sync_status         TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS fp_category_plans (
    category_plan_id        TEXT PRIMARY KEY,
    project_id              TEXT,
    series_id               TEXT,
    category_name           TEXT,
    style_target            INTEGER,
    sku_target              INTEGER,
    development_level       TEXT,
    shared_outsole_strategy TEXT,
    shared_last_strategy    TEXT,
    target_cost_band        TEXT,
    target_wave             TEXT,
    development_role        TEXT,
    tooling_need            TEXT,
    current_status          TEXT
);

CREATE TABLE IF NOT EXISTS fp_category_breakdowns (
    breakdown_id            TEXT PRIMARY KEY,
    season                  TEXT,
    wave_id                 TEXT,
    series_id               TEXT,
    series_name             TEXT,
    design_concept          TEXT,
    category                TEXT,
    subcategory             TEXT,
    planned_sku_count       INTEGER,
    product_roles           JSONB DEFAULT '[]',
    key_structures          JSONB DEFAULT '[]',
    week_labels             JSONB DEFAULT '[]',
    process_tags            JSONB DEFAULT '[]',
    factory_profile         TEXT,
    line_type               TEXT,
    capacity_band           TEXT,
    technical_risk_level    TEXT,
    lead_time_risk          TEXT,
    material_dependency     JSONB DEFAULT '[]',
    focus_note              TEXT,
    source                  TEXT DEFAULT 'manual',
    source_id               TEXT,
    updated_at              TIMESTAMPTZ,
    updated_by              TEXT,
    sync_status             TEXT DEFAULT 'synced'
);
