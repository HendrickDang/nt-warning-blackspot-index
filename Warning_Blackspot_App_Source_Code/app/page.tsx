"use client";

import { useEffect, useState } from "react";

type IconProps = { size?: number; strokeWidth?: number; className?: string };

const Icon = ({ name, size = 22, strokeWidth = 1.8, className = "" }: IconProps & { name: string }) => {
  const paths: Record<string, React.ReactNode> = {
    alert: <><path d="M12 3 2.8 19a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L12 3Z"/><path d="M12 9v5"/><path d="M12 18h.01"/></>,
    map: <><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z"/><path d="M8 3v15M16 6v15"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    locate: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    fire: <path d="M12 22c4 0 7-3 7-7 0-3.5-2-6.5-5-9 .2 2-1 3.5-2 4.5C11 8 9 5.5 8 2 4.5 5.5 3 9 4 14c.7 4.6 4 8 8 8Z"/>,
    signal: <><path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><path d="M12 20h.01"/></>,
    camera: <><path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z"/><circle cx="12" cy="13" r="3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    grassDry: <><path d="M4 21c1-6 1-10-1-14 4 3 6 8 6 14M9 21c0-8 1-14 4-18 1 6 1 12 0 18M13 21c2-6 5-10 9-12-1 5-2 9-4 12"/><circle cx="19" cy="4" r="2"/></>,
    grassTall: <><path d="M5 21V7M5 12 2 9M5 15l4-4M12 21V3M12 10 8 6M12 14l5-5M19 21V8M19 14l3-3M19 17l-4-4"/></>,
    flood: <><path d="M4 14V8l8-5 8 5v6M8 14v-3h4v3"/><path d="M2 16c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 8 0M2 20c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 8 0"/></>,
    language: <><path d="M4 5h7M7.5 3v2c0 4-1.5 7-4.5 9M5 10c1 2 3 3.5 6 4"/><path d="m13 21 4-10 4 10M14.5 17h5"/></>,
    speaker: <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></>,
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
};

const risks = [
  { id: 1, label: "Very high", color: "#F15A2B", x: "57%", y: "31%", size: 98 },
  { id: 2, label: "High", color: "#F59D32", x: "28%", y: "56%", size: 72 },
  { id: 3, label: "Moderate", color: "#E9B949", x: "69%", y: "68%", size: 54 },
];

export default function Home() {
  const [layer, setLayer] = useState<"risk" | "coverage">("risk");
  const [active, setActive] = useState("home");
  const [online, setOnline] = useState(false);
  const [category, setCategory] = useState("Dry grass");
  const [severity, setSeverity] = useState("High");
  const [notes, setNotes] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [saved, setSaved] = useState(false);
  const [language, setLanguage] = useState("English");
  const [reports, setReports] = useState([
    { id: 1, category: "Tall dry grass", severity: "High", location: "-14.2418, 129.5216", time: "Today, 8:16 AM", status: "queued" },
    { id: 2, category: "Blocked firebreak", severity: "Medium", location: "-14.2371, 129.5262", time: "Yesterday, 4:38 PM", status: "queued" },
  ]);

  useEffect(() => {
    const stored = window.localStorage.getItem("warning-blackspot-reports");
    if (stored) setReports(JSON.parse(stored));
  }, []);

  useEffect(() => {
    window.localStorage.setItem("warning-blackspot-reports", JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    if (!online || !reports.some((report) => report.status === "queued")) return;
    setReports((current) => current.map((report) => report.status === "queued" ? { ...report, status: "syncing" } : report));
    const timer = window.setTimeout(() => setReports((current) => current.map((report) => report.status === "syncing" ? { ...report, status: "synced" } : report)), 1300);
    return () => window.clearTimeout(timer);
  }, [online]);

  const submitReport = () => {
    const newReport = { id: Date.now(), category, severity, location: "-14.2407, 129.5211", time: "Just now", status: online ? "synced" : "queued" };
    setReports((current) => [newReport, ...current]);
    setSaved(true); setNotes(""); setPhotoName("");
    window.setTimeout(() => { setSaved(false); setActive("queue"); }, 900);
  };

  return (
    <main className="site-shell">
      <aside className="project-rail">
        <div className="brand-lockup"><span className="brand-mark"><Icon name="fire" size={19}/></span><span>WARNING<br/>BLACKSPOT</span></div>
        <div className="rail-copy">
          <span className="eyebrow">CDU DATA INNOVATION CHALLENGE 2026</span>
          <h1>See the risk.<br/>Even without signal.</h1>
          <p>An offline-first field reporting concept that helps remote communities document bushfire hazards and share them with NT Government when connectivity returns.</p>
          <div className="principles">
            <div><b>01</b><span>Community-led reporting</span></div>
            <div><b>02</b><span>Offline by design</span></div>
            <div><b>03</b><span>Data-backed action</span></div>
          </div>
        </div>
        <p className="demo-note">Interactive prototype · Demonstration data only</p>
      </aside>

      <section className="phone-stage" aria-label="Warning Blackspot mobile prototype">
        <div className="phone">
          <header className="topbar">
            <div><p className="greeting">GOOD MORNING</p><h2>Wadeye Community</h2></div>
            <button className="avatar" aria-label="Open profile" onClick={() => setActive("profile")}>MH</button>
          </header>

          <button className={`offline-banner ${online ? "online" : ""}`} onClick={() => setOnline((value) => !value)} aria-label="Toggle demo connectivity">
            <span><Icon name="signal" size={17}/> {online ? "Connected — syncing" : "Offline mode"}</span><small>{online ? "Tap to test offline" : "Last updated 8:42 AM"}</small>
          </button>

          {active === "home" && <div className="screen-content">
            <section className="risk-summary">
              <div className="risk-icon"><Icon name="fire" size={28}/></div>
              <div><p>CURRENT FIRE DANGER</p><h3>High</h3><span>Take extra care today</span></div>
              <span className="trend">↑</span>
            </section>

            <div className="section-heading"><div><p>COMMUNITY MAP</p><h3>Nearby risk areas</h3></div><button aria-label="Use my location"><Icon name="locate" size={20}/></button></div>
            <div className="map-card">
              <div className="map-grid"/><div className="river"/>
              <span className="map-label label-one">Wadeye</span>
              {risks.map((risk) => <button key={risk.id} className="risk-spot" aria-label={`${risk.label} risk area`} style={{ left: risk.x, top: risk.y, width: risk.size, height: risk.size, background: `${risk.color}22`, borderColor: `${risk.color}70` }}><span style={{background:risk.color}}/></button>)}
              <button className="my-location" aria-label="Your location"><span/></button>
              <div className="map-toggle">
                <button className={layer === "risk" ? "active" : ""} onClick={() => setLayer("risk")}>Fire risk</button>
                <button className={layer === "coverage" ? "active" : ""} onClick={() => setLayer("coverage")}>Coverage</button>
              </div>
              {layer === "coverage" && <div className="coverage-overlay"><div/><div/><div/><span>Limited coverage</span></div>}
            </div>

            <section className="action-card">
              <span className="action-icon"><Icon name="plus" size={22}/></span>
              <div><b>Seen a hazard?</b><p>Capture it now. Your report will save offline.</p></div>
              <button onClick={() => setActive("report")} aria-label="Create report"><Icon name="chevron" size={20}/></button>
            </section>
          </div>}

          {active === "report" && <div className="form-screen">
            <div className="screen-title"><div><p>FIELD OBSERVATION</p><h3>Report a hazard</h3></div><span className="save-state"><i/> Saves offline</span></div>
            <label>What did you notice?</label>
            <div className="category-grid">
              {["Dry grass","Tall grass","Floodwater","Fire / smoke"].map((item) => <button key={item} className={`hazard-${item.toLowerCase().replaceAll(" ", "-").replace("/", "")} ${category === item ? "selected" : ""}`} onClick={() => setCategory(item)}><Icon name={item === "Fire / smoke" ? "fire" : item === "Floodwater" ? "flood" : item === "Tall grass" ? "grassTall" : "grassDry"} size={28}/><span>{item}</span></button>)}
            </div>
            <label>Risk level</label>
            <div className="severity-row">
              {["Low","Medium","High","Urgent"].map((item) => <button key={item} className={`${item.toLowerCase()} ${severity === item ? "selected" : ""}`} onClick={() => setSeverity(item)}>{item}</button>)}
            </div>
            <label className="photo-box">
              <input type="file" accept="image/*" capture="environment" onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? "")}/>
              <span><Icon name={photoName ? "check" : "camera"} size={25}/></span>
              <b>{photoName || "Add a photo"}</b><small>{photoName ? "Photo ready — stored on this device" : "Camera works without connectivity"}</small>
            </label>
            <div className="gps-card"><Icon name="locate" size={20}/><div><b>GPS location captured</b><span>-14.2407, 129.5211 · ± 8 m</span></div><Icon name="check" size={18}/></div>
            <label htmlFor="notes">Notes (optional)</label>
            <textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Describe what you can see…"/>
            <button className="primary-button" onClick={submitReport}><Icon name={saved ? "check" : online ? "cloud" : "clock"} size={19}/>{saved ? "Saved" : online ? "Send report" : "Save to offline queue"}</button>
            <p className="privacy-line"><Icon name="shield" size={14}/> Shared only with authorised community and NTG responders.</p>
          </div>}

          {active === "queue" && <div className="queue-screen">
            <div className="screen-title"><div><p>OFFLINE STORAGE</p><h3>Saved reports</h3></div><span className="queue-count">{reports.filter((r) => r.status !== "synced").length} waiting</span></div>
            <div className={`sync-card ${online ? "connected" : ""}`}><span><Icon name={online ? "cloud" : "signal"} size={23}/></span><div><b>{online ? "Connection available" : "Waiting for connectivity"}</b><p>{online ? "Reports are being sent securely." : "Reports will sync automatically when a network is found."}</p></div></div>
            <div className="report-list">
              {reports.map((report) => <article key={report.id}>
                <span className={`report-thumb ${report.severity.toLowerCase()}`}><Icon name={report.category.toLowerCase().includes("grass") ? "grassTall" : report.category.toLowerCase().includes("flood") ? "flood" : report.category.toLowerCase().includes("fire") || report.category.toLowerCase().includes("smoke") ? "fire" : "alert"} size={23}/></span>
                <div><div className="report-line"><b>{report.category}</b><em className={report.severity.toLowerCase()}>{report.severity}</em></div><p>{report.location}</p><small>{report.time}</small></div>
                <span className={`status-dot ${report.status}`}><Icon name={report.status === "synced" ? "check" : report.status === "syncing" ? "cloud" : "clock"} size={15}/></span>
              </article>)}
            </div>
            <button className="outline-button" onClick={() => setActive("report")}><Icon name="plus" size={17}/> Add another report</button>
            <p className="demo-hint"><Icon name="info" size={14}/> Tap the connection bar above to test automatic sync.</p>
          </div>}

          {active === "profile" && <div className="profile-screen">
            <div className="profile-avatar">MH</div><h3>MinhHoang</h3><p>Authorised community reporter</p>
            <section><span><Icon name="map"/></span><div><small>COMMUNITY</small><b>Wadeye, NT</b></div></section>
            <section><span><Icon name="shield"/></span><div><small>REPORT ACCESS</small><b>Community leaders + NTG</b></div></section>
            <section><span><Icon name="cloud"/></span><div><small>LAST SUCCESSFUL SYNC</small><b>Yesterday, 5:04 PM</b></div></section>
            <div className="language-panel">
              <div className="language-heading"><span><Icon name="language" size={22}/></span><div><small>LANGUAGE & ACCESSIBILITY</small><b>Choose how information is shown</b></div></div>
              <div className="language-options">
                {["English", "Murrinh Patha"].map((item) => <button key={item} className={language === item ? "selected" : ""} onClick={() => setLanguage(item)}><span>{item === "English" ? "EN" : "MP"}</span><b>{item}</b>{language === item && <Icon name="check" size={16}/>}</button>)}
              </div>
              <button className="listen-button"><span><Icon name="speaker" size={24}/></span><div><b>Listen to instructions</b><small>Play spoken safety information</small></div><Icon name="chevron" size={18}/></button>
              {language === "Murrinh Patha" && <p className="translation-note">Prototype option — final wording and audio should be reviewed by Wadeye community speakers.</p>}
            </div>
            <div className="profile-note"><Icon name="info" size={18}/><p>This prototype centres trusted local representatives. Reporter roles and data-sharing rules would be agreed with each community before rollout.</p></div>
          </div>}

          <nav className="bottom-nav" aria-label="Primary navigation">
            <button className={active === "home" ? "active" : ""} onClick={() => setActive("home")}><Icon name="map"/><span>Map</span></button>
            <button className={active === "report" ? "active create" : "create"} onClick={() => setActive("report")}><span className="plus-wrap"><Icon name="plus" size={24}/></span><span>Report</span></button>
            <button className={active === "queue" ? "active" : ""} onClick={() => setActive("queue")}><span className="nav-icon"><Icon name="list"/>{reports.some((r) => r.status !== "synced") && <i>{reports.filter((r) => r.status !== "synced").length}</i>}</span><span>Queue</span></button>
            <button className={active === "profile" ? "active" : ""} onClick={() => setActive("profile")}><Icon name="user"/><span>Profile</span></button>
          </nav>
        </div>
      </section>
    </main>
  );
}
