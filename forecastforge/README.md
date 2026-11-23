# ForecastForge

A dependency-free browser workspace for baseline time-series forecasts. Import a CSV, compare four transparent methods on a held-out tail, inspect a percentage scenario, and export future values. All calculations run locally in the browser; no API, account, paid service, or model download is needed.

## Run

Open the GitHub Pages project or run `node forecastforge/server.mjs` from the repository root, then visit http://127.0.0.1:4173. Requires Node 20 or later for the local server and tests. Run `node --test forecastforge/tests/*.test.mjs` for numerical and validation checks.

## Input

Plain unquoted two-column CSV with header `date,value`, ISO dates (YYYY-MM-DD), and finite numeric values. 12–5,000 rows, at most 1 MB in the browser. Dates must be unique, ascending, and equally spaced. Daily and weekly observations work; calendar months of differing lengths do not. Missing observations must be resolved before import. Negative values are supported. Data is not persisted; reloading clears imports. The built-in shop-demand data is synthetic, not a real business dataset.

## Methods and evaluation

- Last value repeats the latest training observation.
- Recent mean averages the last seven training observations (or all available if fewer).
- Linear trend uses ordinary least squares against observation index.
- Seasonal repeat cycles the last user-specified season; evaluation requires at least two complete training cycles.

The final floor(20%) of observations, with a minimum of three, is held out. Each model makes a fixed-origin multi-step forecast from the earlier observations. MAE is mean absolute error; RMSE is root mean squared error, both in the input units. Automatic selection chooses the smallest holdout MAE, with stable method order breaking ties. It then refits that method on all observations to forecast 1–90 future periods. A manual selection is also available.

The scenario multiplies each baseline prediction by 1 + adjustment/100. It is a user assumption, not causal inference. The chart and CSV preserve negative values and unrounded export precision. CSV columns are date,baseline,scenario. The values table provides an accessible alternative to the chart.

## Limits

One validation split is not robust model selection and is not an unbiased test of the selected winner. This version has no rolling validation, uncertainty intervals, automatic season detection, exogenous variables, missing-value imputation, or learned AI models. Forecasts can be poor when the process changes or the linear trend extrapolates too far. The shaded chart area denotes future dates, not uncertainty. Review data quality and holdout errors before using a result.
