import { startTransition, useEffect, useState } from "react";
import { downloadWorkbook } from "./exportWorkbook";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const ALL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const initialMeta = {
  subject: "ENGLISH",
  grade: "10",
  schoolYear: "2025 - 2026",
};

const initialSig = {
  preparedBy: "",
  preparedPosition: "",
  notedBy: "",
  notedPosition: "",
  approvedBy: "",
  approvedPosition: "",
};

function createWeek() {
  return ["dates", "competencies", "activities", "mlid", "remarks"].reduce(
    (week, section) => {
      week[section] = DAYS.reduce((days, day) => {
        days[day] = "";
        return days;
      }, {});
      return week;
    },
    {},
  );
}

function createMonth(name) {
  return {
    name,
    schoolDays: "",
    weeks: Array.from({ length: 5 }, createWeek),
  };
}

function cloneMonths(months) {
  return months.map((month) => ({
    ...month,
    weeks: month.weeks.map((week) => ({
      dates: { ...week.dates },
      competencies: { ...week.competencies },
      activities: { ...week.activities },
      mlid: { ...week.mlid },
      remarks: { ...week.remarks },
    })),
  }));
}

function Toast({ toast }) {
  if (!toast) {
    return null;
  }

  return <div id="toast" className={toast.type}>{toast.message}</div>;
}

function Topbar({ step, onStepChange, onDownload, downloading }) {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-icon">📋</div>
        <div>
          <div className="brand-name">BCO GENERATOR</div>
          <div className="brand-sub">AI-POWERED LESSON PLANNER</div>
        </div>
      </div>
      <div className="topbar-right">
        <button
          className={`btn btn-outline${step === "setup" ? " active" : ""}`}
          onClick={() => onStepChange("setup")}
          type="button"
        >
          ① Setup
        </button>
        <button
          className={`btn btn-outline${step === "fill" ? " active" : ""}`}
          onClick={() => onStepChange("fill")}
          type="button"
        >
          ② Fill Lessons
        </button>
        <button
          className="btn btn-gold"
          onClick={onDownload}
          disabled={downloading}
          type="button"
        >
          {downloading ? "⏳ Generating..." : "⬇ Download XLSX"}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [step, setStep] = useState("setup");
  const [meta, setMeta] = useState(initialMeta);
  const [sig, setSig] = useState(initialSig);
  const [months, setMonths] = useState(() =>
    ["June", "July", "August"].map(createMonth),
  );
  const [activeMonth, setActiveMonth] = useState(0);
  const [activeWeek, setActiveWeek] = useState(0);
  const [toast, setToast] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [generatedWeekKey, setGeneratedWeekKey] = useState("");
  const [downloading, setDownloading] = useState(false);

  const currentMonth = months[activeMonth];
  const currentWeek = currentMonth?.weeks[activeWeek];

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!generatedWeekKey) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setGeneratedWeekKey(""), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [generatedWeekKey]);

  const weekStatusKey = `${activeMonth}-${activeWeek}`;

  function showToast(message, type = "ok") {
    setToast({ message, type });
  }

  function updateMonth(monthIndex, updater) {
    setMonths((previous) => {
      const next = cloneMonths(previous);
      updater(next[monthIndex], next);
      return next;
    });
  }

  function updateWeekCell(monthIndex, weekIndex, section, day, value) {
    updateMonth(monthIndex, (month) => {
      month.weeks[weekIndex][section][day] = value;
    });
  }

  function handleMonthMetaChange(monthIndex, field, value) {
    updateMonth(monthIndex, (month) => {
      month[field] = value;
    });
  }

  function handleAddMonth() {
    const usedMonths = months.map((month) => month.name);
    const nextMonth =
      ALL_MONTHS.find((month) => !usedMonths.includes(month)) || "January";

    setMonths((previous) => [...cloneMonths(previous), createMonth(nextMonth)]);
  }

  function handleRemoveMonth(monthIndex) {
    if (months.length === 1) {
      return;
    }

    setMonths((previous) => previous.filter((_, index) => index !== monthIndex));
    setActiveMonth((previous) => {
      if (monthIndex < previous) {
        return previous - 1;
      }

      if (monthIndex === previous) {
        return Math.max(0, Math.min(previous, months.length - 2));
      }

      return previous;
    });
    setActiveWeek(0);
  }

  function handleAddWeek() {
    updateMonth(activeMonth, (month) => {
      month.weeks.push(createWeek());
    });
    setActiveWeek(currentMonth.weeks.length);
  }

  function handleRemoveWeek() {
    if (currentMonth.weeks.length === 1) {
      return;
    }

    updateMonth(activeMonth, (month) => {
      month.weeks.splice(activeWeek, 1);
    });
    setActiveWeek((previous) => Math.max(0, previous - 1));
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadWorkbook({ months, meta, sig });
      showToast("✅ BCO downloaded successfully!");
    } catch (error) {
      console.error(error);
      showToast(`❌ Export error: ${error.message}`, "err");
    } finally {
      setDownloading(false);
    }
  }

  async function handleGenerateAI(monthIndex, weekIndex) {
    const week = months[monthIndex].weeks[weekIndex];
    const competencies = DAYS.map((day) => week.competencies[day]).filter(Boolean);

    if (competencies.length === 0) {
      showToast("⚠ Please enter at least one competency first.", "err");
      return;
    }

    setGenerating({
      monthIndex,
      weekIndex,
      message:
        "Crafting a 5-day lesson structure based on your competencies...",
    });

    try {
      const response = await fetch("/api/generate-lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta: {
            subject: meta.subject || "English",
            grade: meta.grade || "10",
            month: months[monthIndex].name,
          },
          competencies: DAYS.reduce((accumulator, day) => {
            accumulator[day] = week.competencies[day] || "";
            return accumulator;
          }, {}),
        }),
      });

      if (!response.ok) {
        let message = `Request failed with status ${response.status}`;
        try {
          const errorPayload = await response.json();
          if (errorPayload?.error) {
            message = errorPayload.error;
          }
        } catch {
          // Keep the generic error if the response was not JSON.
        }
        throw new Error(message);
      }

      const parsed = await response.json();

      startTransition(() => {
        setMonths((previous) => {
          const next = cloneMonths(previous);
          ["activities", "mlid", "remarks"].forEach((section) => {
            DAYS.forEach((day) => {
              if (parsed[section]?.[day] !== undefined) {
                next[monthIndex].weeks[weekIndex][section][day] =
                  parsed[section][day];
              }
            });
          });
          return next;
        });
        setGeneratedWeekKey(`${monthIndex}-${weekIndex}`);
      });

      showToast("✨ Activities generated successfully!");
    } catch (error) {
      console.error(error);
      showToast(`❌ AI error: ${error.message}`, "err");
    } finally {
      setGenerating(null);
    }
  }

  return (
    <>
      {generating ? (
        <div className="gen-overlay">
          <div className="gen-box">
            <div className="gen-title">✨ AI is generating activities...</div>
            <div className="gen-sub">{generating.message}</div>
            <div className="spinner" />
          </div>
        </div>
      ) : null}

      <Toast toast={toast} />

      <Topbar
        step={step}
        onStepChange={setStep}
        onDownload={handleDownload}
        downloading={downloading}
      />

      <main className="main">
        {step === "setup" ? (
          <section className="step-panel">
            <div className="page-header">
              <div className="page-title">DOCUMENT SETUP</div>
              <div className="page-sub">
                Configure header information for your BCO document.
              </div>
            </div>

            <div className="card">
              <div className="card-title gold">📚 COURSE INFORMATION</div>
              <div className="g3">
                <label>
                  <span className="field-label">SUBJECT</span>
                  <input
                    value={meta.subject}
                    onChange={(event) =>
                      setMeta((previous) => ({
                        ...previous,
                        subject: event.target.value,
                      }))
                    }
                    placeholder="e.g. ENGLISH"
                  />
                </label>
                <label>
                  <span className="field-label">GRADE LEVEL</span>
                  <input
                    value={meta.grade}
                    onChange={(event) =>
                      setMeta((previous) => ({
                        ...previous,
                        grade: event.target.value,
                      }))
                    }
                    placeholder="e.g. 10"
                  />
                </label>
                <label>
                  <span className="field-label">SCHOOL YEAR</span>
                  <input
                    value={meta.schoolYear}
                    onChange={(event) =>
                      setMeta((previous) => ({
                        ...previous,
                        schoolYear: event.target.value,
                      }))
                    }
                    placeholder="e.g. 2025 - 2026"
                  />
                </label>
              </div>
            </div>

            <div className="card">
              <div className="card-title blue">
                ✍️ SIGNATORIES
                <span className="card-title-note">applied to all months</span>
              </div>
              <div className="g3 gap-bottom">
                <label>
                  <span className="field-label">PREPARED BY</span>
                  <input
                    value={sig.preparedBy}
                    onChange={(event) =>
                      setSig((previous) => ({
                        ...previous,
                        preparedBy: event.target.value,
                      }))
                    }
                    placeholder="Teacher's full name"
                  />
                </label>
                <label>
                  <span className="field-label">POSITION / DESIGNATION</span>
                  <input
                    value={sig.preparedPosition}
                    onChange={(event) =>
                      setSig((previous) => ({
                        ...previous,
                        preparedPosition: event.target.value,
                      }))
                    }
                    placeholder="e.g. Teacher II"
                  />
                </label>
                <div />
              </div>
              <div className="g3">
                <label>
                  <span className="field-label">NOTED BY</span>
                  <input
                    value={sig.notedBy}
                    onChange={(event) =>
                      setSig((previous) => ({
                        ...previous,
                        notedBy: event.target.value,
                      }))
                    }
                    placeholder="Department Head / Coordinator"
                  />
                </label>
                <label>
                  <span className="field-label">POSITION / DESIGNATION</span>
                  <input
                    value={sig.notedPosition}
                    onChange={(event) =>
                      setSig((previous) => ({
                        ...previous,
                        notedPosition: event.target.value,
                      }))
                    }
                    placeholder="e.g. Head Teacher III"
                  />
                </label>
                <label>
                  <span className="field-label">APPROVED BY</span>
                  <input
                    value={sig.approvedBy}
                    onChange={(event) =>
                      setSig((previous) => ({
                        ...previous,
                        approvedBy: event.target.value,
                      }))
                    }
                    placeholder="School Principal"
                  />
                </label>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title gold">📅 MONTHS</div>
                <button className="add-btn gold" onClick={handleAddMonth} type="button">
                  + Add Month
                </button>
              </div>
              <div className="g-months">
                {months.map((month, monthIndex) => (
                  <div className="month-card" key={`${month.name}-${monthIndex}`}>
                    <div className="month-card-hd">
                      <span className="month-label">
                        {month.name || `Month ${monthIndex + 1}`}
                      </span>
                      {months.length > 1 ? (
                        <button
                          className="rm-btn"
                          onClick={() => handleRemoveMonth(monthIndex)}
                          type="button"
                        >
                          ✕
                        </button>
                      ) : null}
                    </div>
                    <div className="g2">
                      <label>
                        <span className="field-label">MONTH NAME</span>
                        <select
                          value={month.name}
                          onChange={(event) =>
                            handleMonthMetaChange(
                              monthIndex,
                              "name",
                              event.target.value,
                            )
                          }
                        >
                          {ALL_MONTHS.map((monthName) => (
                            <option key={monthName} value={monthName}>
                              {monthName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className="field-label">SCHOOL DAYS</span>
                        <input
                          value={month.schoolDays}
                          onChange={(event) =>
                            handleMonthMetaChange(
                              monthIndex,
                              "schoolDays",
                              event.target.value,
                            )
                          }
                          placeholder="e.g. 21"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="btn btn-gold next-btn"
              onClick={() => setStep("fill")}
              type="button"
            >
              Next: Fill Lessons →
            </button>
          </section>
        ) : null}

        {step === "fill" && currentMonth && currentWeek ? (
          <section className="step-panel">
            <div className="page-header">
              <div className="page-title">LESSON CONTENT</div>
              <div className="page-sub">
                Enter competencies, then let AI generate the full 5-day
                activity plan for you.
              </div>
            </div>

            <div className="month-tabs">
              {months.map((month, monthIndex) => (
                <button
                  key={`${month.name}-${monthIndex}`}
                  className={`mtab${monthIndex === activeMonth ? " active" : ""}`}
                  onClick={() => {
                    startTransition(() => {
                      setActiveMonth(monthIndex);
                      setActiveWeek(0);
                    });
                  }}
                  type="button"
                >
                  {month.name}
                </button>
              ))}
            </div>

            <div className="week-tabs">
              {currentMonth.weeks.map((_, weekIndex) => (
                <button
                  key={`week-${weekIndex + 1}`}
                  className={`wtab${weekIndex === activeWeek ? " active" : ""}`}
                  onClick={() => setActiveWeek(weekIndex)}
                  type="button"
                >
                  {`Week ${weekIndex + 1}`}
                </button>
              ))}
              <button className="add-btn muted" onClick={handleAddWeek} type="button">
                + Week
              </button>
              {currentMonth.weeks.length > 1 ? (
                <button className="add-btn red" onClick={handleRemoveWeek} type="button">
                  {`− Week ${activeWeek + 1}`}
                </button>
              ) : null}
            </div>

            <div className="card">
              <div className="card-title">📅 TARGET DATES</div>
              <div className="day-grid">
                {DAYS.map((day) => (
                  <label key={`date-${day}`}>
                    <span className="field-label">{day.toUpperCase()}</span>
                    <input
                      value={currentWeek.dates[day]}
                      onChange={(event) =>
                        updateWeekCell(
                          activeMonth,
                          activeWeek,
                          "dates",
                          day,
                          event.target.value,
                        )
                      }
                      placeholder="e.g. June 2"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="comp-row">
              <div className="comp-header">
                <span className="comp-title">🎯 COMPETENCIES</span>
                <div className="comp-actions">
                  <span className="ai-status">
                    {generatedWeekKey === weekStatusKey ? "✅ Generated!" : ""}
                  </span>
                  <button
                    className="btn-ai"
                    onClick={() => handleGenerateAI(activeMonth, activeWeek)}
                    disabled={
                      generating?.monthIndex === activeMonth &&
                      generating?.weekIndex === activeWeek
                    }
                    type="button"
                  >
                    ✨ Generate Activities with AI
                  </button>
                </div>
              </div>
              <div className="day-grid">
                {DAYS.map((day) => (
                  <label key={`competency-${day}`}>
                    <span className="field-label">{day.toUpperCase()}</span>
                    <textarea
                      rows={3}
                      value={currentWeek.competencies[day]}
                      onChange={(event) =>
                        updateWeekCell(
                          activeMonth,
                          activeWeek,
                          "competencies",
                          day,
                          event.target.value,
                        )
                      }
                      placeholder="Enter learning competency..."
                    />
                  </label>
                ))}
              </div>
            </div>

            {[
              {
                key: "activities",
                label: "ACTIVITIES",
                icon: "📝",
                colorClass: "blue",
              },
              {
                key: "mlid",
                label: "MASTERY LEVEL & INSTRUCTIONAL DECISION (MLID)",
                icon: "📊",
                colorClass: "gold",
              },
              {
                key: "remarks",
                label: "REMARKS",
                icon: "💬",
                colorClass: "orange",
              },
            ].map((section) => (
              <div className="card" key={section.key}>
                <div className={`card-title ${section.colorClass}`}>
                  {section.icon} {section.label}
                </div>
                <div className="day-grid">
                  {DAYS.map((day) => (
                    <label key={`${section.key}-${day}`}>
                      <span className="field-label">{day.toUpperCase()}</span>
                      <textarea
                        rows={5}
                        value={currentWeek[section.key][day]}
                        onChange={(event) =>
                          updateWeekCell(
                            activeMonth,
                            activeWeek,
                            section.key,
                            day,
                            event.target.value,
                          )
                        }
                        placeholder="..."
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="fill-actions">
              <button
                className="btn btn-gold next-btn"
                onClick={handleDownload}
                disabled={downloading}
                type="button"
              >
                {downloading ? "⏳ Generating..." : "⬇ Download BCO as XLSX"}
              </button>
              <span className="fill-note">
                All months exported as separate sheets.
              </span>
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}

export default App;
