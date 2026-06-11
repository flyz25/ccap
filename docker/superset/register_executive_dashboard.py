from __future__ import annotations

from typing import Any

from superset.app import create_app
from superset.utils import json
from superset.utils.core import DatasourceType


def metric(column_name: str, aggregate: str, label: str) -> dict[str, Any]:
    return {
        "expressionType": "SIMPLE",
        "column": {"column_name": column_name},
        "aggregate": aggregate,
        "sqlExpression": None,
        "hasCustomLabel": True,
        "label": label,
    }


def chart_params(dataset_id: int, viz_type: str, **kwargs: Any) -> str:
    params = {
        "datasource": f"{dataset_id}__table",
        "viz_type": viz_type,
        "adhoc_filters": [],
        "row_limit": 10000,
        "color_scheme": "supersetColors",
        "show_legend": True,
        "legendType": "scroll",
        "legendOrientation": "top",
        "extra_form_data": {},
    }
    params.update(kwargs)
    return json.dumps(params)


def position_for(charts: list[Any]) -> dict[str, Any]:
    position: dict[str, Any] = {
        "DASHBOARD_VERSION_KEY": "v2",
        "HEADER_ID": {
            "id": "HEADER_ID",
            "meta": {"text": "CCAP Executive Overview"},
            "type": "HEADER",
        },
        "ROOT_ID": {"children": ["GRID_ID"], "id": "ROOT_ID", "type": "ROOT"},
        "GRID_ID": {
            "children": ["ROW-KPI", "ROW-CAPACITY", "ROW-ANALYTICS"],
            "id": "GRID_ID",
            "parents": ["ROOT_ID"],
            "type": "GRID",
        },
    }
    rows = {
        "ROW-KPI": charts[:5],
        "ROW-CAPACITY": charts[5:7],
        "ROW-ANALYTICS": charts[7:],
    }
    widths = {
        "ROW-KPI": [3, 2, 2, 2, 3],
        "ROW-CAPACITY": [6, 6],
        "ROW-ANALYTICS": [6, 3, 3],
    }
    heights = {"ROW-KPI": 22, "ROW-CAPACITY": 54, "ROW-ANALYTICS": 54}

    for row_id, row_charts in rows.items():
        children = []
        position[row_id] = {
            "children": children,
            "id": row_id,
            "meta": {"background": "BACKGROUND_TRANSPARENT"},
            "parents": ["ROOT_ID", "GRID_ID"],
            "type": "ROW",
        }
        for index, chart in enumerate(row_charts):
            chart_id = f"CHART-{chart.id}"
            children.append(chart_id)
            position[chart_id] = {
                "children": [],
                "id": chart_id,
                "meta": {
                    "chartId": chart.id,
                    "height": heights[row_id],
                    "sliceName": chart.slice_name,
                    "uuid": str(chart.uuid),
                    "width": widths[row_id][index],
                },
                "parents": ["ROOT_ID", "GRID_ID", row_id],
                "type": "CHART",
            }
    return position


app = create_app()

with app.app_context():
    from superset import db
    from superset.connectors.sqla.models import SqlaTable
    from superset.models.dashboard import Dashboard
    from superset.models.slice import Slice

    owner = app.appbuilder.sm.find_user(username="admin")
    datasets = {
        dataset.table_name: dataset
        for dataset in db.session.query(SqlaTable)
        .filter(
            SqlaTable.schema == "public",
            SqlaTable.table_name.in_(
                (
                    "superset_executive_kpi",
                    "superset_executive_area",
                    "superset_population_trend",
                    "superset_land_use_summary",
                )
            ),
        )
        .all()
    }

    kpi = datasets["superset_executive_kpi"]
    area = datasets["superset_executive_area"]
    population = datasets["superset_population_trend"]
    land_use = datasets["superset_land_use_summary"]

    definitions = (
        (
            "Jumlah Penduduk",
            kpi,
            "big_number_total",
            chart_params(kpi.id, "big_number_total", metric=metric("total_population", "MAX", "Jumlah Penduduk"), y_axis_format="SMART_NUMBER"),
        ),
        (
            "Jumlah Kawasan",
            kpi,
            "big_number_total",
            chart_params(kpi.id, "big_number_total", metric=metric("total_areas", "MAX", "Jumlah Kawasan"), y_axis_format="SMART_NUMBER"),
        ),
        (
            "Purata PCC",
            kpi,
            "big_number_total",
            chart_params(kpi.id, "big_number_total", metric=metric("average_pcc", "MAX", "Purata PCC"), y_axis_format=",.2f"),
        ),
        (
            "Purata RCC",
            kpi,
            "big_number_total",
            chart_params(kpi.id, "big_number_total", metric=metric("average_rcc", "MAX", "Purata RCC"), y_axis_format=",.2f"),
        ),
        (
            "Purata ECC",
            kpi,
            "big_number_total",
            chart_params(kpi.id, "big_number_total", metric=metric("average_ecc", "MAX", "Purata ECC"), y_axis_format=",.2f"),
        ),
        (
            "PCC vs RCC vs ECC Mengikut Kawasan",
            area,
            "echarts_timeseries_bar",
            chart_params(
                area.id,
                "echarts_timeseries_bar",
                x_axis="area",
                metrics=[
                    metric("pcc_total", "SUM", "PCC"),
                    metric("rcc_total", "SUM", "RCC"),
                    metric("ecc_total", "SUM", "ECC"),
                ],
                groupby=[],
                orientation="vertical",
                x_axis_sort_asc=False,
                x_axis_sort_series="PCC",
                y_axis_format="SMART_NUMBER",
                rich_tooltip=True,
            ),
        ),
        (
            "Kedudukan Kawasan Mengikut ECC",
            area,
            "echarts_timeseries_bar",
            chart_params(
                area.id,
                "echarts_timeseries_bar",
                x_axis="area",
                metrics=[metric("ecc_total", "SUM", "Jumlah ECC")],
                groupby=[],
                orientation="vertical",
                x_axis_sort_asc=False,
                x_axis_sort_series="Jumlah ECC",
                y_axis_format="SMART_NUMBER",
                rich_tooltip=True,
            ),
        ),
        (
            "Trend Penduduk",
            population,
            "echarts_timeseries_line",
            chart_params(
                population.id,
                "echarts_timeseries_line",
                x_axis="year_date",
                time_grain_sqla="P1Y",
                time_range="No filter",
                metrics=[
                    metric("normal_population_growth", "SUM", "Pertumbuhan Penduduk"),
                    metric("injected_population_growth", "SUM", "Suntikan Penduduk"),
                ],
                groupby=[],
                y_axis_format="SMART_NUMBER",
                rich_tooltip=True,
            ),
        ),
        (
            "Status Kapasiti Kawasan",
            area,
            "pie",
            chart_params(
                area.id,
                "pie",
                groupby=["status"],
                metric=metric("area", "COUNT_DISTINCT", "Bilangan Kawasan"),
                sort_by_metric=True,
                label_type="key_value_percent",
                number_format="SMART_NUMBER",
                show_labels=True,
                labels_outside=True,
                outerRadius=70,
                innerRadius=35,
            ),
        ),
        (
            "Agihan Guna Tanah",
            land_use,
            "pie",
            chart_params(
                land_use.id,
                "pie",
                groupby=["guna_tanah"],
                metric=metric("area_ha", "SUM", "Luas (ha)"),
                sort_by_metric=True,
                label_type="key",
                number_format="SMART_NUMBER",
                show_labels=True,
                labels_outside=True,
                outerRadius=70,
                innerRadius=35,
            ),
        ),
    )

    charts = []
    for name, dataset, viz_type, params in definitions:
        chart = db.session.query(Slice).filter_by(slice_name=name).one_or_none()
        if chart is None:
            chart = Slice(slice_name=name)
            db.session.add(chart)
        chart.datasource_id = dataset.id
        chart.datasource_type = DatasourceType.TABLE
        chart.viz_type = viz_type
        chart.params = params
        chart.owners = [owner] if owner else []
        charts.append(chart)

    db.session.flush()

    dashboard = db.session.query(Dashboard).filter_by(slug="ccap-executive-overview").one_or_none()
    if dashboard is None:
        dashboard = Dashboard(slug="ccap-executive-overview")
        db.session.add(dashboard)
    dashboard.dashboard_title = "CCAP Executive Overview"
    dashboard.description = "Ringkasan eksekutif populasi, kapasiti dan guna tanah CCAP."
    dashboard.published = True
    dashboard.owners = [owner] if owner else []
    dashboard.slices = charts
    dashboard.position_json = json.dumps(position_for(charts))
    dashboard.json_metadata = json.dumps(
        {
            "color_scheme": "supersetColors",
            "refresh_frequency": 0,
            "timed_refresh_immune_slices": [],
            "default_filters": "{}",
        }
    )

    db.session.commit()
    print(f"Registered Superset dashboard: {dashboard.dashboard_title} ({dashboard.slug})")
