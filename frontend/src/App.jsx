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

function Metric({ label, value, subtext }) {
  return (
    <div className="metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      {subtext ? <p>{subtext}</p> : null}
    </div>
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
    let alive = true;

    Promise.all([apiGet("/api/options"), apiGet("/api/summary")])
      .then(([opt, sum]) => {
        if (!alive) return;
        setOptions(opt);
        setSummary(sum);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      });

    return () => {
      alive = false;
    };
  }, []);

  const severityBars = useMemo(() => {
    if (!summary?.severity_counts) return [];
    const total = Object.values(summary.severity_counts).reduce((acc, value) => acc + value, 0) || 1;
    return Object.entries(summary.severity_counts).map(([label, value]) => ({
      label,
      value,
      width: `${Math.max(10, (value / total) * 100)}%`,
    }));
  }, [summary]);

  const topWeather = useMemo(() => Object.entries(summary?.weather_counts || {}).slice(0, 4), [summary]);
  const topRoadTypes = useMemo(() => Object.entries(summary?.road_type_counts || {}).slice(0, 4), [summary]);
  const topVehicles = useMemo(() => Object.entries(summary?.vehicle_type_counts || {}).slice(0, 4), [summary]);

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

  const optionsOrEmpty = (values = []) =>
    values.map((value) => (
      <option key={value} value={value}>
        {value}
      </option>
    ));

  const explanationItems = [
    {
      title: "Road context",
      text: "Assessing speed, road type, and junction design together gives a more realistic view of severity risk.",
    },
    {
      title: "Environment",
      text: "Weather, lighting, and surface condition are often the earliest warning signs before a collision escalates.",
    },
    {
      title: "Traffic complexity",
      text: "Vehicle count and casualty count help distinguish routine incidents from higher-risk scenarios.",
    },
  ];

  const featureBlocks = [
    {
      title: "Risk prediction",
      tone: "amber",
      items: [
        "Real-time accident risk prediction",
        "Visual risk probability meters",
        "Machine learning analytics dashboard",
        "Random Forest classification model",
      ],
    },
    {
      title: "Live monitoring",
      tone: "blue",
      items: [
        "Live weather integration",
        "Simulated live GPS vehicle tracking",
        "Geolocation-based monitoring",
        "Automatic danger zone detection",
      ],
    },
    {
      title: "Safety response",
      tone: "green",
      items: [
        "AI voice alert for drivers",
        "AI-powered safety recommendations",
        "High-risk zone highlighting",
        "Traffic scenario guidance",
      ],
    },
    {
      title: "Mapping and reports",
      tone: "slate",
      items: [
        "Interactive UK accident hotspot maps",
        "Dynamic map visualization with Folium",
        "Automated downloadable reports",
        "Accident zone review workflow",
      ],
    },
  ];

  const downloadReport = () => {
    const lines = [
      "Accident Risk Dashboard Report",
      "--------------------------------",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "Scenario",
      `- Month: ${form.month}`,
      `- Day of week: ${form.day_of_week}`,
      `- Junction control: ${form.junction_control}`,
      `- Junction detail: ${form.junction_detail}`,
      `- Light conditions: ${form.light_conditions}`,
      `- Road surface: ${form.road_surface_conditions}`,
      `- Road type: ${form.road_type}`,
      `- Speed limit: ${form.speed_limit}`,
      `- Urban or rural: ${form.urban_or_rural_area}`,
      `- Weather: ${form.weather_conditions}`,
      `- Vehicle type: ${form.vehicle_type}`,
      `- Casualties: ${form.number_of_casualties}`,
      `- Vehicles: ${form.number_of_vehicles}`,
      `- Time: ${form.accident_time}`,
    ];

    if (result) {
      lines.push("", "Model Output");
      lines.push(`- Predicted severity: ${result.predicted_severity}`);
      lines.push(`- Confidence: ${Math.round(result.confidence * 100)}%`);
      lines.push(`- Safety note: ${result.safety_note}`);
      lines.push("", "Probabilities");
      Object.entries(result.probabilities).forEach(([label, value]) => {
        lines.push(`- ${label}: ${Math.round(value * 100)}%`);
      });
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "accident-risk-report.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const speakAlert = () => {
    if (!result || !window.speechSynthesis) return;
    const message =
      result.predicted_severity === "Slight"
        ? "Current scenario is lower risk. Continue standard driving precautions."
        : `Warning. ${result.predicted_severity} risk detected. Please slow down and review road conditions immediately.`;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">AR</div>
          <div>
            <p>Accident Risk</p>
            <span>Predictive safety dashboard</span>
          </div>
        </div>
        <nav className="topnav">
          <a href="#overview">Overview</a>
          <a href="#features">Features</a>
          <a href="#predict">Predict</a>
          <a href="#insights">Insights</a>
        </nav>
      </header>

      <section className="hero" id="overview">
        <div className="hero-copy">
          <p className="eyebrow">Road safety intelligence</p>
          <h1>Understand severity risk before a crash happens.</h1>
          <p className="lede">
            This dashboard turns road conditions into a clear severity estimate, helping you review
            junctions, weather, and traffic patterns with confidence.
          </p>

          <div className="hero-actions">
            <a href="#predict" className="primary-link">
              Start a scenario
            </a>
            <a href="#insights" className="secondary-link">
              View insights
            </a>
          </div>

          <div className="hero-badges">
            <span>Severity prediction</span>
            <span>Scenario comparison</span>
            <span>Safety guidance</span>
          </div>
        </div>

        <div className="hero-panel">
          <div className="panel-title">Current model snapshot</div>
          {summary?.model?.accuracy ? (
            <div className="metric-stack">
              <div>
                <strong>{summary.model.accuracy}</strong>
                <span>Accuracy</span>
              </div>
              <div>
                <strong>{summary.model.f1_weighted}</strong>
                <span>Weighted F1</span>
              </div>
              <div>
                <strong>{summary.total_accidents?.toLocaleString()}</strong>
                <span>Records analyzed</span>
              </div>
            </div>
          ) : (
            <div className="loading-card">Loading model metrics...</div>
          )}
        </div>
      </section>

      {error ? <div className="alert">{error}</div> : null}

      <section className="stats-grid" aria-label="summary metrics">
        <Metric
          label="Average casualties"
          value={summary?.average_casualties ?? "—"}
          subtext="Across the selected accident dataset"
        />
        <Metric
          label="Average vehicles"
          value={summary?.average_vehicles ?? "—"}
          subtext="A quick view of incident complexity"
        />
        <Metric
          label="Urban / rural mix"
          value={
            summary ? `${summary.urban_rural_counts?.Urban ?? 0} / ${summary.urban_rural_counts?.Rural ?? 0}` : "—"
          }
          subtext="Distribution of accident locations"
        />
      </section>

      <section className="feature-section" id="features">
        <div className="section-heading">
          <p className="section-kicker">Platform capabilities</p>
          <h2>Main features in the application</h2>
          <p>
            A clear view of the monitoring, prediction, mapping, and response layers in the
            experience.
          </p>
        </div>
        <div className="feature-grid">
          {featureBlocks.map((block) => (
            <article key={block.title} className={`feature-card tone-${block.tone}`}>
              <h3>{block.title}</h3>
              <ul>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <main className="content-grid">
        <section className="card form-card" id="predict">
          <div className="section-heading">
            <p className="section-kicker">Scenario builder</p>
            <h2>Prediction workspace</h2>
            <p>
              Adjust road and weather conditions to see how the model changes the severity estimate.
            </p>
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
                  {loading ? "Predicting..." : "Generate severity estimate"}
                </button>
              </>
            ) : (
              <div className="loading-card">Loading options...</div>
            )}
          </form>
        </section>

        <aside className="card result-card">
          <div className="section-heading">
            <p className="section-kicker">Model output</p>
            <h2>Prediction result</h2>
            <p>Confidence, probabilities, and a short safety note.</p>
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
              <div className="result-actions">
                <button type="button" className="ghost-button" onClick={downloadReport}>
                  Download report
                </button>
                <button type="button" className="ghost-button" onClick={speakAlert}>
                  Speak alert
                </button>
              </div>
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
              <p>Run a prediction to see severity probability and safety guidance here.</p>
            </div>
          )}
        </aside>

        <section className="card insights-card" id="insights">
          <div className="section-heading">
            <p className="section-kicker">Dataset lens</p>
            <h2>Operational insights</h2>
            <p>Quick signals from the historical dataset that help explain risk patterns.</p>
          </div>

          {summary ? (
            <>
              <div className="insight-grid">
                <div className="info-tile">
                  <span>Total accidents</span>
                  <strong>{summary.total_accidents.toLocaleString()}</strong>
                </div>
                <div className="info-tile">
                  <span>Fatal / Serious / Slight</span>
                  <strong>
                    {summary.severity_counts.Fatal} / {summary.severity_counts.Serious} / {summary.severity_counts.Slight}
                  </strong>
                </div>
                <div className="info-tile">
                  <span>Urban / rural</span>
                  <strong>
                    {summary.urban_rural_counts?.Urban ?? 0} / {summary.urban_rural_counts?.Rural ?? 0}
                  </strong>
                </div>
                <div className="info-tile">
                  <span>Most common severity</span>
                  <strong>Slight</strong>
                </div>
              </div>

              <div className="insight-columns">
                <div className="mini-panel">
                  <h3>Severity distribution</h3>
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

                <div className="mini-grid">
                  <div className="mini-panel">
                    <h3>Top weather conditions</h3>
                    {topWeather.map(([label, value]) => (
                      <div key={label} className="mini-row">
                        <span>{label}</span>
                        <strong>{value.toLocaleString()}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="mini-panel">
                    <h3>Top road types</h3>
                    {topRoadTypes.map(([label, value]) => (
                      <div key={label} className="mini-row">
                        <span>{label}</span>
                        <strong>{value.toLocaleString()}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="mini-panel">
                    <h3>Top vehicle types</h3>
                    {topVehicles.map(([label, value]) => (
                      <div key={label} className="mini-row">
                        <span>{label}</span>
                        <strong>{value.toLocaleString()}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="mini-panel">
                    <h3>How it reads</h3>
                    {explanationItems.map((item) => (
                      <div key={item.title} className="explain-row">
                        <strong>{item.title}</strong>
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </main>

      <footer className="footer">
        <p>Accident Risk Dashboard</p>
        <span>Built for clear scenario review and safety analysis.</span>
      </footer>
    </div>
  );
}

export default App;
