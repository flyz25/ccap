import os

from sqlalchemy import create_engine, text


VIEW_SQL = (
    """
    DROP VIEW IF EXISTS public.superset_capacity_audit_summary CASCADE;
    DROP VIEW IF EXISTS public.superset_land_use_summary CASCADE;
    DROP VIEW IF EXISTS public.superset_population_trend CASCADE;
    DROP VIEW IF EXISTS public.superset_executive_kpi CASCADE;
    DROP VIEW IF EXISTS public.superset_executive_area CASCADE;
    """,
    """
    CREATE OR REPLACE VIEW public.superset_executive_area AS
    WITH area_base AS (
        SELECT
            area,
            MAX(kawasan_kajian) AS kawasan_kajian,
            SUM(pcc) AS pcc_total,
            SUM(rcc) AS rcc_total,
            SUM(ecc) AS ecc_total,
            AVG(pcc) AS pcc_average,
            AVG(rcc) AS rcc_average,
            AVG(ecc) AS ecc_average,
            MAX(bil_penduduk) AS population,
            MAX(bil_pengunjung) AS visitors,
            SUM(COALESCE(keluasan_kawasan_ha, 0)) AS developed_area_ha,
            COUNT(*)::integer AS record_count,
            AVG(latitude) AS latitude,
            AVG(longitude) AS longitude
        FROM public.ecc_spk_map
        WHERE area IS NOT NULL
        GROUP BY area
    )
    SELECT
        area,
        kawasan_kajian,
        pcc_total::numeric(18, 2) AS pcc_total,
        rcc_total::numeric(18, 2) AS rcc_total,
        ecc_total::numeric(18, 2) AS ecc_total,
        pcc_average::numeric(18, 2) AS pcc_average,
        rcc_average::numeric(18, 2) AS rcc_average,
        ecc_average::numeric(18, 2) AS ecc_average,
        population::numeric(18, 0) AS population,
        visitors::numeric(18, 0) AS visitors,
        (COALESCE(population, 0) + COALESCE(visitors, 0))::numeric(18, 0) AS capacity_load,
        CASE
            WHEN COALESCE(ecc_total, 0) > 0
            THEN ((COALESCE(population, 0) + COALESCE(visitors, 0)) / ecc_total)::numeric(18, 4)
            ELSE NULL
        END AS saturation_ratio,
        CASE
            WHEN COALESCE(ecc_total, 0) > 0
            THEN (((COALESCE(population, 0) + COALESCE(visitors, 0)) / ecc_total) * 100)::numeric(18, 2)
            ELSE NULL
        END AS saturation_pct,
        (COALESCE(ecc_total, 0) - (COALESCE(population, 0) + COALESCE(visitors, 0)))::numeric(18, 2) AS capacity_balance,
        developed_area_ha::numeric(18, 2) AS developed_area_ha,
        record_count,
        latitude::numeric(12, 8) AS latitude,
        longitude::numeric(12, 8) AS longitude,
        CASE
            WHEN COALESCE(ecc_total, 0) <= 0 AND (COALESCE(population, 0) + COALESCE(visitors, 0)) > 0 THEN 'Kritikal'
            WHEN COALESCE(ecc_total, 0) <= 0 THEN 'Data Tidak Lengkap'
            WHEN ((COALESCE(population, 0) + COALESCE(visitors, 0)) / ecc_total) >= 1 THEN 'Kritikal'
            WHEN ((COALESCE(population, 0) + COALESCE(visitors, 0)) / ecc_total) >= 0.7 THEN 'Sederhana'
            ELSE 'Sesuai'
        END AS status
    FROM area_base
    """,
    """
    CREATE OR REPLACE VIEW public.superset_executive_kpi AS
    SELECT
        (
            SELECT SUM(injected_population_growth)::numeric(18, 0)
            FROM public.overall_population
            WHERE tahun = (SELECT MAX(tahun) FROM public.overall_population)
        ) AS total_population,
        (SELECT SUM(visitors)::numeric(18, 0) FROM public.superset_executive_area) AS total_visitors,
        (SELECT COUNT(*)::integer FROM public.superset_executive_area) AS total_areas,
        (SELECT AVG(pcc)::numeric(18, 2) FROM public.ecc_spk_map) AS average_pcc,
        (SELECT AVG(rcc)::numeric(18, 2) FROM public.ecc_spk_map) AS average_rcc,
        (SELECT AVG(ecc)::numeric(18, 2) FROM public.ecc_spk_map) AS average_ecc,
        (SELECT AVG(saturation_pct)::numeric(18, 2) FROM public.superset_executive_area) AS average_saturation_pct,
        (
            SELECT COUNT(*)::integer
            FROM public.superset_executive_area
            WHERE status = 'Kritikal'
        ) AS critical_areas,
        (
            SELECT COUNT(*)::integer
            FROM public.superset_executive_area
            WHERE status = 'Sederhana'
        ) AS moderate_areas,
        (
            SELECT SUM(developed_area_ha)::numeric(18, 2)
            FROM public.superset_executive_area
        ) AS developed_area_ha
    """,
    """
    CREATE OR REPLACE VIEW public.superset_population_trend AS
    SELECT
        make_date(tahun, 1, 1) AS year_date,
        tahun,
        kawasan_kajian,
        normal_population_growth,
        injected_population_growth
    FROM public.overall_population
    WHERE tahun IS NOT NULL
    """,
    """
    CREATE OR REPLACE VIEW public.superset_land_use_summary AS
    SELECT
        guna_tanah,
        SUM(COALESCE(keluasan_kawasan_ha, 0))::numeric(18, 2) AS area_ha,
        SUM(COALESCE(pcc, 0))::numeric(18, 2) AS pcc_total,
        SUM(COALESCE(rcc, 0))::numeric(18, 2) AS rcc_total,
        SUM(COALESCE(ecc, 0))::numeric(18, 2) AS ecc_total,
        COUNT(*)::integer AS record_count
    FROM public.zoning_map
    WHERE guna_tanah IS NOT NULL
    GROUP BY guna_tanah
    """,
    """
    CREATE OR REPLACE VIEW public.superset_capacity_audit_summary AS
    SELECT
        r.id AS run_id,
        r.started_at,
        r.finished_at,
        r.status AS run_status,
        result.dataset_scope,
        COALESCE(result.record_area, result.record_kawasan_kajian, '-') AS area,
        COUNT(*)::integer AS total_rows,
        COUNT(*) FILTER (WHERE result.status = 'pass')::integer AS passed_rows,
        COUNT(*) FILTER (WHERE result.status = 'warning')::integer AS warning_rows,
        COUNT(*) FILTER (WHERE result.status = 'fail')::integer AS failed_rows,
        COUNT(*) FILTER (WHERE result.status = 'missing_factor')::integer AS missing_factor_rows,
        COUNT(*) FILTER (WHERE result.status = 'missing_input')::integer AS missing_input_rows
    FROM public.capacity_calculation_runs r
    JOIN public.capacity_calculation_results result ON result.run_id = r.id
    GROUP BY
        r.id,
        r.started_at,
        r.finished_at,
        r.status,
        result.dataset_scope,
        COALESCE(result.record_area, result.record_kawasan_kajian, '-')
    """,
)


engine = create_engine(os.environ["CCAP_DATABASE_URI"])

with engine.begin() as connection:
    for statement in VIEW_SQL:
        connection.execute(text(statement))

print("Created CCAP analytical views for Superset.")
