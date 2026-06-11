import os

from sqlalchemy import create_engine, text


VIEW_SQL = (
    """
    CREATE OR REPLACE VIEW public.superset_executive_area AS
    SELECT
        area,
        MAX(kawasan_kajian) AS kawasan_kajian,
        SUM(pcc)::numeric(18, 2) AS pcc_total,
        SUM(rcc)::numeric(18, 2) AS rcc_total,
        SUM(ecc)::numeric(18, 2) AS ecc_total,
        AVG(pcc)::numeric(18, 2) AS pcc_average,
        AVG(rcc)::numeric(18, 2) AS rcc_average,
        AVG(ecc)::numeric(18, 2) AS ecc_average,
        MAX(bil_penduduk)::numeric(18, 0) AS population,
        MAX(bil_pengunjung)::numeric(18, 0) AS visitors,
        SUM(COALESCE(keluasan_kawasan_ha, 0))::numeric(18, 2) AS developed_area_ha,
        COUNT(*)::integer AS record_count,
        AVG(latitude)::numeric(12, 8) AS latitude,
        AVG(longitude)::numeric(12, 8) AS longitude,
        CASE
            WHEN AVG(ecc) >= 1800 THEN 'Kritikal'
            WHEN AVG(ecc) >= 900 THEN 'Sederhana'
            ELSE 'Sesuai'
        END AS status
    FROM public.ecc_spk_map
    WHERE area IS NOT NULL
    GROUP BY area
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
        (
            SELECT COUNT(*)::integer
            FROM public.superset_executive_area
            WHERE status = 'Kritikal'
        ) AS critical_areas,
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
)


engine = create_engine(os.environ["CCAP_DATABASE_URI"])

with engine.begin() as connection:
    for statement in VIEW_SQL:
        connection.execute(text(statement))

print("Created CCAP analytical views for Superset.")
