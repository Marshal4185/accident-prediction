import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const defaultForm = {
  month: "Jan",
  day_of_week: "Monday",
  junction_control: "Give way or uncontrolled",
  junction_detail: "T or staggered junction",
  light_conditions: "Daylight",
  road_surface_conditions: "Dry",
  road_type: "Single carriageway",
  speed_limit: 30,
  urban_or_rural_area: "Urban",
  weather_conditions: "Fine no high winds",
  vehicle_type: "Car",
  number_of_casualties: 1,
  number_of_vehicles: 2,
  accident_time: "12:00",
};

async function apiGet(path) {
  const response = await fetch(`${API_BASE}${path}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Request failed");
  return data;
}

async function apiPost(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Request failed");
  return data;
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function App() {
  const [options, setOptions] = useState(null);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.all([apiGet("/api/options"), apiGet("/api/summary")])
      .then(([opt, sum]) => {
        if (!mounted) return;
        setOptions(opt);
        setSummary(sum);
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        if (mounted) {
          return;
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const severityBars = useMemo(() => {
    if (!summary?.severity_counts) return [];
    const total = Object.values(summary.severity_counts).reduce((acc, value) => acc + value, 0) || 1;
    return Object.entries(summary.severity_counts).map(([label, value]) => ({
      label,
      value,
      width: `${Math.max(8, (value / total) * 100)}%`,
    }));
  }, [summary]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]:
        name === "speed_limit" || name === "number_of_casualties" || name === "number_of_vehicles"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await apiPost("/api/predict", form);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const optionsOrEmpty = (values = []) => values.map((value) => (
    <option key={value} value={value}>
      {value}
    </option>
  ));

  return (
    <div className="shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Road safety intelligence</p>
          <h1>Predict accident severity with a real web stack.</h1>
          <p className="lede">
            React handles the dashboard, FastAPI handles the model, and the whole project is
            structured for GitHub and Vercel deployment.
          </p>
          <div className="hero-badges">
            <span>React</span>
            <span>FastAPI</span>
            <span>Vercel-ready</span>
          </div>
        </div>
        <div className="hero-panel">
          <div className="panel-title">Model snapshot</div>
          {summary?.model?.accuracy ? (
            <div className="metric-stack">
              <div>
                <strong>{summary.model.accuracy}</strong>
                <span>accuracy</span>
              </div>
              <div>
                <strong>{summary.model.f1_weighted}</strong>
                <span>weighted F1</span>
              </div>
              <div>
                <strong>{summary.total_accidents?.toLocaleString()}</strong>
                <span>records</span>
              </div>
            </div>
          ) : (
            <div className="loading-card">Loading model metrics...</div>
          )}
        </div>
      </header>

      {error ? <div className="alert">{error}</div> : null}

      <main className="content-grid">
        <section className="card form-card">
          <div className="section-heading">
            <h2>Prediction form</h2>
            <p>Edit the conditions and get severity probabilities.</p>
          </div>

          <form className="prediction-form" onSubmit={handleSubmit}>
            {options ? (
              <>
                <Field label="Month">
                  <select name="month" value={form.month} onChange={handleChange}>
                    {optionsOrEmpty(options.months)}
                  </select>
                </Field>
                <Field label="Day of week">
                  <select name="day_of_week" value={form.day_of_week} onChange={handleChange}>
                    {optionsOrEmpty(options.days_of_week)}
                  </select>
                </Field>
                <Field label="Junction control">
                  <select name="junction_control" value={form.junction_control} onChange={handleChange}>
                    {optionsOrEmpty(options.junction_control)}
                  </select>
                </Field>
                <Field label="Junction detail">
                  <select name="junction_detail" value={form.junction_detail} onChange={handleChange}>
                    {optionsOrEmpty(options.junction_detail)}
                  </select>
                </Field>
                <Field label="Light conditions">
                  <select name="light_conditions" value={form.light_conditions} onChange={handleChange}>
                    {optionsOrEmpty(options.light_conditions)}
                  </select>
                </Field>
                <Field label="Road surface">
                  <select
                    name="road_surface_conditions"
                    value={form.road_surface_conditions}
                    onChange={handleChange}
                  >
                    {optionsOrEmpty(options.road_surface_conditions)}
                  </select>
                </Field>
                <Field label="Road type">
                  <select name="road_type" value={form.road_type} onChange={handleChange}>
                    {optionsOrEmpty(options.road_types)}
                  </select>
                </Field>
                <Field label="Urban or rural">
                  <select
                    name="urban_or_rural_area"
                    value={form.urban_or_rural_area}
                    onChange={handleChange}
                  >
                    {optionsOrEmpty(options.urban_or_rural_area)}
                  </select>
                </Field>
                <Field label="Weather conditions">
                  <select
                    name="weather_conditions"
                    value={form.weather_conditions}
                    onChange={handleChange}
                  >
                    {optionsOrEmpty(options.weather_conditions)}
                  </select>
                </Field>
                <Field label="Vehicle type">
                  <select name="vehicle_type" value={form.vehicle_type} onChange={handleChange}>
                    {optionsOrEmpty(options.vehicle_types)}
                  </select>
                </Field>
                <Field label="Speed limit">
                  <select name="speed_limit" value={form.speed_limit} onChange={handleChange}>
                    {optionsOrEmpty((options.speed_limits || []).map(String))}
                  </select>
                </Field>
                <Field label="Number of casualties">
                  <input
                    type="number"
                    name="number_of_casualties"
                    min="0"
                    max="20"
                    value={form.number_of_casualties}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="Number of vehicles">
                  <input
                    type="number"
                    name="number_of_vehicles"
                    min="1"
                    max="20"
                    value={form.number_of_vehicles}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="Accident time">
                  <input type="time" name="accident_time" value={form.accident_time} onChange={handleChange} />
                </Field>
                <button className="primary-button span-2" type="submit" disabled={loading}>
                  {loading ? "Predicting..." : "Predict severity"}
                </button>
              </>
            ) : (
              <div className="loading-card">Loading options...</div>
            )}
          </form>
        </section>

        <aside className="card result-card">
          <div className="section-heading">
            <h2>Prediction result</h2>
            <p>Model output and confidence.</p>
          </div>
          {result ? (
            <div className="result-stack">
              <div className={`severity-pill ${result.predicted_severity.toLowerCase()}`}>
                {result.predicted_severity}
              </div>
              <div className="confidence">
                <span>Confidence</span>
                <strong>{Math.round(result.confidence * 100)}%</strong>
              </div>
              <p className="safety-note">{result.safety_note}</p>
              <div className="probability-list">
                {Object.entries(result.probabilities).map(([label, value]) => (
                  <div key={label} className="probability-row">
                    <div className="probability-label">
                      <span>{label}</span>
                      <strong>{Math.round(value * 100)}%</strong>
                    </div>
                    <div className="probability-track">
                      <div className={`probability-fill ${label.toLowerCase()}`} style={{ width: `${value * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>Run a prediction to see probability and safety guidance here.</p>
            </div>
          )}
        </aside>

        <section className="card insights-card">
          <div className="section-heading">
            <h2>Dataset insights</h2>
            <p>Context from the historical accident records.</p>
          </div>
          {summary ? (
            <>
              <div className="insight-grid">
                <div className="info-tile">
                  <span>Total accidents</span>
                  <strong>{summary.total_accidents.toLocaleString()}</strong>
                </div>
                <div className="info-tile">
                  <span>Average casualties</span>
                  <strong>{summary.average_casualties}</strong>
                </div>
                <div className="info-tile">
                  <span>Average vehicles</span>
                  <strong>{summary.average_vehicles}</strong>
                </div>
                <div className="info-tile">
                  <span>Urban / rural</span>
                  <strong>
                    {summary.urban_rural_counts?.Urban ?? 0} / {summary.urban_rural_counts?.Rural ?? 0}
                  </strong>
                </div>
              </div>

              <div className="mini-panel">
                <h3>Severity mix</h3>
                {severityBars.map((bar) => (
                  <div key={bar.label} className="chart-row">
                    <div className="chart-row-label">
                      <span>{bar.label}</span>
                      <strong>{bar.value.toLocaleString()}</strong>
                    </div>
                    <div className="chart-track">
                      <div className={`chart-fill ${bar.label.toLowerCase()}`} style={{ width: bar.width }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default App;

