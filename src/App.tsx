import { useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight,
  Bell, Blocks, BookOpen, Check, ChevronDown, FileText, Globe2,
  Info, LayoutDashboard, Menu,
  MoreHorizontal, Search, Settings2, Shield, ShieldCheck, Smartphone,
  SlidersHorizontal, Users, X,
} from "lucide-react";
import {
  analyzeCandidate, candidates, initialProfile, parseProfileText,
  type BrandProfile, type Finding, type OfficialApp, type Risk,
} from "./detection";

type ProfileDraft = {
  brandName: string;
  logoUrl: string;
  officialAccounts: string;
  officialApps: string;
  identifiers: string;
};

const PROFILE_STORAGE_KEY = "brandshield-ai-brand-profile";
const LEGACY_PROFILE_STORAGE_KEY = "bradshield-brand-profile";

function toDraft(profile: BrandProfile): ProfileDraft {
  return {
    brandName: profile.brandName,
    logoUrl: profile.logoUrl,
    officialAccounts: profile.officialAccounts.join("\n"),
    officialApps: profile.officialApps.map((app) => `${app.store} | ${app.name} | ${app.publisher} | ${app.packageId}`).join("\n"),
    identifiers: profile.identifiers.join("\n"),
  };
}

function loadProfile(): { profile: BrandProfile; warning: string } {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY) ?? localStorage.getItem(LEGACY_PROFILE_STORAGE_KEY);
    if (!stored) return { profile: initialProfile, warning: "" };
    const parsed: unknown = JSON.parse(stored);
    if (!isBrandProfile(parsed)) {
      return { profile: initialProfile, warning: "Saved brand profile could not be read. The sample profile is loaded; review it and save to continue." };
    }
    const migrated = migrateLegacyBrand(parsed);
    return { profile: migrated, warning: "" };
  } catch {
    return { profile: initialProfile, warning: "Saved brand profile could not be read. The sample profile is loaded; review it and save to continue." };
  }
}

function migrateLegacyBrand(profile: BrandProfile): BrandProfile {
  if (profile.brandName !== "BradShield") return profile;
  const replacements: [string, string][] = [
    ["BradShield Inc.", "BrandShield AI"],
    ["BradShield", "BrandShield AI"],
    ["bradshield.com", "brandshield.ai"],
    ["bradshield", "brandshieldai"],
    ["com.bradshield.app", "ai.brandshield.app"],
  ];
  const replace = (value: string) => replacements.reduce(
    (result, [from, to]) => result.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), to),
    value,
  );
  return {
    ...profile,
    brandName: "BrandShield AI",
    officialAccounts: profile.officialAccounts.map(replace),
    officialApps: profile.officialApps.map((app) => ({
      ...app,
      name: replace(app.name),
      publisher: replace(app.publisher),
      packageId: replace(app.packageId),
    })),
    identifiers: profile.identifiers.map(replace),
  };
}

function isBrandProfile(value: unknown): value is BrandProfile {
  if (typeof value !== "object" || value === null) return false;
  const profile = value as Record<string, unknown>;
  return typeof profile.brandName === "string" &&
    typeof profile.logoUrl === "string" &&
    Array.isArray(profile.officialAccounts) && profile.officialAccounts.every((item) => typeof item === "string") &&
    Array.isArray(profile.identifiers) && profile.identifiers.every((item) => typeof item === "string") &&
    Array.isArray(profile.officialApps) && profile.officialApps.every((app: unknown) => {
      if (typeof app !== "object" || app === null) return false;
      const entry = app as Record<string, unknown>;
      return (entry.store === "Google Play" || entry.store === "App Store") &&
        typeof entry.name === "string" && typeof entry.publisher === "string" && typeof entry.packageId === "string";
    });
}

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Threats", icon: Shield },
  { label: "Brand profile", icon: Blocks },
  { label: "Architecture & demo", icon: BookOpen },
];

function App() {
  const [loaded] = useState(loadProfile);
  const [profile, setProfile] = useState(loaded.profile);
  const [draft, setDraft] = useState(() => toDraft(loaded.profile));
  const [activeNav, setActiveNav] = useState("Overview");
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("All risks");
  const [typeFilter, setTypeFilter] = useState("All sources");
  const [showAll, setShowAll] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(true);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [statusMessage, setStatusMessage] = useState(loaded.warning);

  const evaluated = useMemo(() => candidates.map((candidate) => analyzeCandidate(candidate, profile)), [profile]);
  const findings = useMemo(() => evaluated.filter((item) => !item.official && item.score >= 35).sort((left, right) => right.score - left.score), [evaluated]);
  const filteredFindings = useMemo(() => findings.filter((item) => {
    const searchText = `${item.name} ${item.account} ${item.platform} ${item.kind}`.toLowerCase();
    const matchesSearch = !query.trim() || searchText.includes(query.trim().toLowerCase());
    const matchesRisk = riskFilter === "All risks" || item.risk === riskFilter;
    const isApp = item.platform === "Google Play" || item.platform === "App Store";
    const matchesType = typeFilter === "All sources" ||
      (typeFilter === "Social media" ? !isApp : isApp);
    return matchesSearch && matchesRisk && matchesType;
  }), [findings, query, riskFilter, typeFilter]);
  const excludedCount = evaluated.filter((item) => item.official).length;
  const criticalCount = findings.filter((item) => item.risk === "Critical").length;
  const highCount = findings.filter((item) => item.risk === "High").length;
  const appCount = findings.filter((item) => item.platform === "Google Play" || item.platform === "App Store").length;
  const socialCount = findings.length - appCount;
  const platformSummary = ["Instagram", "X", "Facebook", "TikTok", "Google Play", "App Store"].map((platform) => ({
    name: platform,
    count: findings.filter((item) => item.platform === platform).length,
    color: platformColor(platform),
    icon: platformIcon(platform),
  })).filter((platform) => platform.count > 0);
  const visibleFindings = showAll ? filteredFindings : filteredFindings.slice(0, 5);

  function navigate(label: string) {
    setActiveNav(label);
    setMenuOpen(false);
    setSelectedFinding(null);
    if (label === "Threats") setTypeFilter("All sources");
  }

  function updateDraft(field: keyof ProfileDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setStatusMessage("");
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const brandName = draft.brandName.trim();
    if (!brandName) {
      setStatusMessage("Enter a brand name before saving.");
      return;
    }
    if (draft.logoUrl.trim()) {
      try {
        const url = new URL(draft.logoUrl.trim());
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported image URL");
      } catch {
        setStatusMessage("Enter a valid HTTPS or HTTP logo URL, or leave the logo field blank.");
        return;
      }
    }
    const appLines = parseProfileText(draft.officialApps);
    const officialApps: OfficialApp[] = [];
    for (const [index, line] of appLines.entries()) {
      const fields = line.split("|").map((field) => field.trim());
      if (fields.length !== 4 || !["Google Play", "App Store"].includes(fields[0]) || fields.slice(1).some((field) => !field)) {
        setStatusMessage(`Official app line ${index + 1} must use: Store | App name | Publisher | package ID.`);
        return;
      }
      officialApps.push({ store: fields[0] as OfficialApp["store"], name: fields[1], publisher: fields[2], packageId: fields[3] });
    }
    const nextProfile: BrandProfile = {
      brandName,
      logoUrl: draft.logoUrl.trim(),
      officialAccounts: parseProfileText(draft.officialAccounts),
      officialApps,
      identifiers: parseProfileText(draft.identifiers),
    };
    setProfile(nextProfile);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
      setStatusMessage("Brand profile saved. Detection results have been recalculated using these official assets.");
    } catch {
      setStatusMessage("Profile updated for this session, but browser storage is unavailable. It will not persist after you close this page.");
    }
  }

  return (
    <div className="app">
      {menuOpen && <button aria-label="Close navigation" className="scrim" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="#" aria-label="BrandShield AI home">
          <span className="brand-symbol"><ShieldCheck size={20} /></span>
          <span>Brand<span className="brand-light">Shield</span><span className="brand-ai"> AI</span></span>
        </a>
        <div className="workspace">
          <span className="workspace-avatar">B</span>
          <span className="workspace-info"><small>WORKSPACE</small><strong>BrandShield</strong></span>
          <ChevronDown size={15} />
        </div>
        <p className="nav-caption">MONITOR</p>
        <nav aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${activeNav === label ? "selected" : ""}`} onClick={() => navigate(label)}>
              <Icon size={17} /><span>{label}</span>
              {label === "Threats" && <small>{findings.length}</small>}
            </button>
          ))}
        </nav>
        <p className="nav-caption manage-caption">MANAGE</p>
        <nav aria-label="Manage workspace">
          <button className={`nav-item ${activeNav === "Team" ? "selected" : ""}`} onClick={() => navigate("Team")}><Users size={17} /><span>Team</span></button>
          <button className={`nav-item ${activeNav === "Settings" ? "selected" : ""}`} onClick={() => navigate("Settings")}><Settings2 size={17} /><span>Settings</span></button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="plan-card">
          <span className="plan-icon"><Shield size={15} /></span>
          <div className="plan-name"><strong>Prototype</strong><small>DEMO</small></div>
          <p>Official assets are excluded from findings.</p>
          <div className="meter"><i /></div>
          <small className="asset-usage">{profile.officialAccounts.length + profile.officialApps.length} official assets protected</small>
        </div>
        <div className="user-profile"><span className="user-avatar">JD</span><span className="user-copy"><strong>Jordan Davis</strong><small>Admin</small></span><MoreHorizontal size={18} /></div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-button menu-toggle" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={19} /></button>
          <div className="breadcrumb"><span>Workspace</span><i>/</i><strong>{activeNav}</strong></div>
          <div className="top-actions"><span className="monitoring"><i /> Demo monitoring</span><button className="icon-button notification" aria-label="Notifications"><Bell size={18} /><i /></button><span className="top-avatar">JD</span></div>
        </header>

        <div className="content">
          {statusMessage && <div className={`status-message ${statusMessage.includes("saved") ? "success" : ""}`} role="status">{statusMessage}<button aria-label="Dismiss message" onClick={() => setStatusMessage("")}><X size={14} /></button></div>}
          {activeNav === "Brand profile" ? (
            <BrandProfilePage draft={draft} updateDraft={updateDraft} saveProfile={saveProfile} profile={profile} excludedCount={excludedCount} navigate={navigate} />
          ) : activeNav === "Architecture & demo" ? (
            <ArchitecturePage />
          ) : (
            <Dashboard
              activeNav={activeNav}
              brandName={profile.brandName}
              findings={findings}
              filteredFindings={filteredFindings}
              shown={visibleFindings}
              query={query}
              setQuery={setQuery}
              riskFilter={riskFilter}
              setRiskFilter={setRiskFilter}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              showAll={showAll}
              setShowAll={setShowAll}
              noticeVisible={noticeVisible}
              setNoticeVisible={setNoticeVisible}
              criticalCount={criticalCount}
              highCount={highCount}
              socialCount={socialCount}
              appCount={appCount}
              excludedCount={excludedCount}
              platformSummary={platformSummary}
              setSelectedFinding={setSelectedFinding}
              navigate={navigate}
            />
          )}
          <footer className="footer"><span>© 2026 BrandShield AI · Prototype</span><span><i /> Local demo running</span><button onClick={() => navigate("Architecture & demo")}>Architecture</button><button onClick={() => navigate("Brand profile")}>Brand assets</button><small>v0.2.0</small></footer>
        </div>
      </main>
      {selectedFinding && <FindingDialog finding={selectedFinding} onClose={() => setSelectedFinding(null)} />}
    </div>
  );
}

function Dashboard({
  activeNav, brandName, findings, filteredFindings, shown, query, setQuery, riskFilter, setRiskFilter,
  typeFilter, setTypeFilter, showAll, setShowAll, noticeVisible, setNoticeVisible, criticalCount,
  highCount, socialCount, appCount, excludedCount, platformSummary, setSelectedFinding, navigate,
}: {
  activeNav: string;
  brandName: string;
  findings: Finding[];
  filteredFindings: Finding[];
  shown: Finding[];
  query: string;
  setQuery: (value: string) => void;
  riskFilter: string;
  setRiskFilter: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  showAll: boolean;
  setShowAll: (value: boolean | ((current: boolean) => boolean)) => void;
  noticeVisible: boolean;
  setNoticeVisible: (value: boolean) => void;
  criticalCount: number;
  highCount: number;
  socialCount: number;
  appCount: number;
  excludedCount: number;
  platformSummary: { name: string; count: number; color: string; icon: string }[];
  setSelectedFinding: (finding: Finding) => void;
  navigate: (label: string) => void;
}) {
  return <>
    <section className="welcome">
      <div><p className="eyebrow"><i /> DIGITAL RISK PROTECTION</p><h1>{activeNav === "Threats" ? "Threat intelligence" : `Good morning, Jordan`} <span>✳</span></h1><p className="subtitle">{activeNav === "Threats" ? `Review prioritized social and app threats to ${brandName}.` : "A clear view of your brand’s social and app-store risk."}</p></div>
      <span className="demo-indicator"><i /> Sample sources · no live feeds</span>
    </section>
    <section className="metrics" aria-label="Risk overview">
      <Metric title="Potential threats" number={String(findings.length).padStart(2, "0")} delta={`${criticalCount} critical`} note="ranked by signal" tone="red" icon={<AlertTriangle size={17} />} points="2,19 13,12 23,15 34,8 44,12 55,5 67,8 78,2" />
      <Metric title="High risk" number={String(highCount + criticalCount).padStart(2, "0")} delta={`${criticalCount} critical`} note="needs review" tone="amber" icon={<Shield size={17} />} points="2,5 13,11 23,8 34,15 44,10 55,17 67,12 78,19" />
      <Metric title="Social findings" number={String(socialCount).padStart(2, "0")} delta="Social" note="profiles and pages" tone="green" icon={<Users size={17} />} points="2,19 13,14 23,16 34,10 44,13 55,7 67,9 78,2" />
      <Metric title="Suspicious apps" number={String(appCount).padStart(2, "0")} delta="App stores" note="publisher checked" tone="blue" icon={<Smartphone size={17} />} points="2,3 13,9 23,7 34,13 44,10 55,16 67,13 78,19" />
    </section>
    {noticeVisible && <section className="notice">
      <span className="notice-icon"><ShieldCheck size={18} /></span>
      <div className="notice-copy"><strong>{excludedCount} official assets excluded from detection</strong><span>Potential matches are scored for look-alike names, logo claims, descriptions, scam cues, and app publisher differences.</span></div>
      <button className="notice-action" onClick={() => navigate("Brand profile")}>Review brand assets <ArrowRight size={15} /></button>
      <button className="dismiss" aria-label="Dismiss notice" onClick={() => setNoticeVisible(false)}><X size={15} /></button>
    </section>}
    <section className="dashboard-grid">
      <section className="panel detections-panel">
        <div className="panel-heading"><div><div className="heading-title"><h2>{activeNav === "Threats" ? "Prioritized detections" : "Recent detections"}</h2><span className="live-indicator" /></div><p>Potential impersonations matched against your official assets.</p></div><button className="text-button" onClick={() => setShowAll((current) => !current)}>{showAll ? "Show less" : "View all"} <ArrowRight size={14} /></button></div>
        <div className="filters">
          <label className="search"><Search size={15} /><input aria-label="Search detections" placeholder="Search name, handle, platform..." value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button>}</label>
          <label className="select-wrap"><SlidersHorizontal size={14} /><select aria-label="Filter detection source" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option>All sources</option><option>Social media</option><option>Mobile apps</option></select><ChevronDown size={13} /></label>
          <label className="select-wrap risk-select"><select aria-label="Filter risk level" value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}><option>All risks</option><option>Critical</option><option>High</option><option>Medium</option></select><ChevronDown size={13} /></label>
        </div>
        <div className="table-scroll"><table><thead><tr><th>DETECTION</th><th>SOURCE / TYPE</th><th>RISK</th><th>FOUND</th><th><span className="sr-only">Details</span></th></tr></thead>
          <tbody>
            {shown.map((item) => <tr key={item.id}>
              <td><div className="detection"><span className={`platform-mark ${platformColor(item.platform)}`}>{platformIcon(item.platform)}</span><span className="detection-text"><strong>{item.name}</strong><small>{item.account}</small></span></div></td>
              <td><span className="source-label">{item.platform}<small>{item.kind}</small></span></td>
              <td><RiskBadge risk={item.risk} score={item.score} /></td>
              <td className="found">{item.discovered}</td>
              <td><button className="row-action" aria-label={`Inspect ${item.name}`} onClick={() => setSelectedFinding(item)}><Info size={16} /></button></td>
            </tr>)}
            {shown.length === 0 && <tr><td colSpan={5} className="empty">No detections match these filters. Try another search or risk level.</td></tr>}
          </tbody>
        </table></div>
        <div className="table-footer">Showing <strong>{shown.length}</strong> of <strong>{filteredFindings.length}</strong> potential matches <span>ILLUSTRATIVE DATA</span></div>
      </section>
      <div className="right-column">
        <section className="panel platform-panel"><div className="panel-heading compact"><div><h2>Threats by platform</h2><p>Prioritized findings by channel</p></div><button className="icon-button" aria-label="Platform summary"><MoreHorizontal size={18} /></button></div>
          <div className="platform-list">{platformSummary.map((platform) => <div className="platform-row" key={platform.name}><span className={`platform-mark small ${platform.color}`}>{platform.icon}</span><span className="platform-name">{platform.name}</span><strong>{platform.count}</strong><span className="bar"><i style={{ width: `${Math.max(12, platform.count / Math.max(findings.length, 1) * 100)}%` }} /></span></div>)}</div>
          <button className="platform-link" onClick={() => navigate("Threats")}>Review all detections <ArrowRight size={14} /></button>
        </section>
        <section className="coverage-card"><div className="coverage-heading"><span className="globe"><Globe2 size={17} /></span><small><i /> DEMO MODE</small></div><h3>Source availability</h3><p>Sample social and app-store results are available. Live platform APIs are not connected in this prototype.</p><div className="coverage-bottom"><span><Smartphone size={14} /> Social &amp; mobile apps</span><button onClick={() => navigate("Architecture & demo")} aria-label="See source setup"><ArrowRight size={15} /></button></div></section>
        <section className="tip-card"><span className="tip-icon"><ShieldCheck size={16} /></span><span><strong>Official assets protected</strong><small>Matched official handles and apps are excluded before scoring.</small></span><Check size={15} /></section>
      </div>
    </section>
  </>;
}

function BrandProfilePage({ draft, updateDraft, saveProfile, profile, excludedCount, navigate }: {
  draft: ProfileDraft;
  updateDraft: (field: keyof ProfileDraft, value: string) => void;
  saveProfile: (event: FormEvent<HTMLFormElement>) => void;
  profile: BrandProfile;
  excludedCount: number;
  navigate: (label: string) => void;
}) {
  return <section className="subpage">
    <div className="subpage-heading"><div><p className="eyebrow"><i /> SETUP · STEP 1</p><h1>Brand profile</h1><p className="subtitle">Tell BrandShield AI what’s legitimate so monitoring can spot the fakes.</p></div><span className="profile-status"><Check size={14} /> {profile.officialAccounts.length + profile.officialApps.length} official assets protected</span></div>
    <div className="profile-layout">
      <form className="panel profile-form" onSubmit={saveProfile}>
        <div className="form-section-title"><span>01</span><div><h2>Brand identity</h2><p>Core names and visual identifiers used in detection.</p></div></div>
        <label className="field-label">Company or brand name <span>*</span><input required value={draft.brandName} onChange={(event) => updateDraft("brandName", event.target.value)} placeholder="e.g. Acme Corporation" /></label>
        <label className="field-label">Official logo URL <small>Optional</small><input type="url" value={draft.logoUrl} onChange={(event) => updateDraft("logoUrl", event.target.value)} placeholder="https://example.com/brand-logo.png" /><small className="field-help">Used as a reference signal; images are not fetched in this local prototype.</small></label>
        <label className="field-label">Brand identifiers <small>One per line</small><textarea rows={3} value={draft.identifiers} onChange={(event) => updateDraft("identifiers", event.target.value)} placeholder={"Brand slogan\nOfficial domain\nProduct names"} /></label>
        <div className="form-section-title"><span>02</span><div><h2>Official social accounts</h2><p>Accounts matching these handles are excluded from findings.</p></div></div>
        <label className="field-label">Verified handles and page URLs <small>One per line</small><textarea rows={4} value={draft.officialAccounts} onChange={(event) => updateDraft("officialAccounts", event.target.value)} placeholder={"@brand_official\nfacebook.com/brand"} /></label>
        <div className="form-section-title"><span>03</span><div><h2>Official mobile applications</h2><p>Store, app name, publisher, and package ID are used for allowlisting.</p></div></div>
        <label className="field-label">Official apps <small>One app per line</small><textarea rows={4} value={draft.officialApps} onChange={(event) => updateDraft("officialApps", event.target.value)} placeholder="Google Play | Brand App | Brand Inc. | com.brand.app" /><small className="field-help">Format: Store | App name | Publisher | package ID. Store must be Google Play or App Store.</small></label>
        <button type="submit" className="primary-button"><Check size={16} /> Save brand profile</button>
      </form>
      <aside className="profile-side">
        <section className="panel profile-summary"><div className="summary-top"><span className="summary-logo">{draft.brandName.slice(0, 1).toUpperCase() || "B"}</span><span><small>PROTECTED BRAND</small><strong>{draft.brandName || "Your brand"}</strong></span></div><div className="summary-stat"><span>Official social accounts</span><strong>{parseProfileText(draft.officialAccounts).length}</strong></div><div className="summary-stat"><span>Official mobile apps</span><strong>{parseProfileText(draft.officialApps).length}</strong></div><div className="summary-stat"><span>Excluded sample assets</span><strong>{excludedCount}</strong></div><p>Official matches are allowlisted by account handle or app package ID, with app name and publisher as a fallback.</p></section>
        <section className="guide-card"><ShieldCheck size={18} /><strong>Why this matters</strong><p>A verified asset profile reduces false positives and gives the detection engine trusted names, publishers, handles, and identifiers to compare against.</p><button type="button" onClick={() => navigate("Architecture & demo")}>How detection works <ArrowRight size={14} /></button></section>
      </aside>
    </div>
  </section>;
}

function ArchitecturePage() {
  return <section className="subpage architecture-page">
    <div className="subpage-heading"><div><p className="eyebrow"><i /> PROTOTYPE GUIDE</p><h1>Architecture &amp; demo</h1><p className="subtitle">A transparent walkthrough of the prototype, detection signals, and current limits.</p></div><span className="demo-indicator"><i /> No external sources connected</span></div>
    <section className="panel architecture-panel"><div className="panel-heading"><div><h2>Detection architecture</h2><p>Official-asset exclusion happens before a candidate can become a finding.</p></div><FileText size={17} /></div>
      <div className="architecture-flow">
        <ArchitectureNode number="01" title="Brand profile" detail="Brand names · handles · app IDs · publishers · identifiers" />
        <span className="flow-arrow"><ArrowDownRight size={17} /></span>
        <ArchitectureNode number="02" title="Candidate sources" detail="Social profiles & pages · Google Play · Apple App Store" />
        <span className="flow-arrow"><ArrowDownRight size={17} /></span>
        <ArchitectureNode number="03" title="Normalize & allowlist" detail="Canonicalize look-alike characters · exclude official handles & apps" />
        <span className="flow-arrow"><ArrowDownRight size={17} /></span>
        <ArchitectureNode number="04" title="Explainable risk score" detail="Name similarity · logo claim · app publisher · description · scam cues" />
        <span className="flow-arrow"><ArrowDownRight size={17} /></span>
        <ArchitectureNode number="05" title="Prioritized findings" detail="Risk tiers · evidence reasons · searchable review queue" />
      </div>
      <div className="architecture-note"><Info size={15} /><span><strong>Storage in this prototype:</strong> editable brand profile uses browser localStorage. Sample candidates are static TypeScript data; no candidate data is transmitted.</span></div>
    </section>
    <div className="architecture-columns">
      <section className="panel demo-script"><div className="panel-heading"><div><h2>Short demo script</h2><p>Suggested 2-minute judge walkthrough</p></div></div><ol><li><strong>Set the ground truth.</strong><span>Open Brand profile and review official handles plus both official store listings.</span></li><li><strong>Show the queue.</strong><span>Return to Overview; point out social fakes and suspicious store listings alongside risk levels.</span></li><li><strong>Explain a match.</strong><span>Open a finding to see the name, logo, publisher, description, and scam indicators contributing to its score.</span></li><li><strong>Show false-positive control.</strong><span>Confirm the official account and official app do not appear because their handles and package IDs are allowlisted.</span></li><li><strong>Test look-alikes.</strong><span>Edit the brand name or official assets and save; the local sample results recalculate immediately.</span></li></ol></section>
      <section className="panel source-status"><div className="panel-heading"><div><h2>Source connectivity</h2><p>Graceful status for unavailable external sources</p></div></div><SourceStatus name="Social platforms" detail="Sample fixture data only" /><SourceStatus name="Google Play" detail="Sample fixture data only" /><SourceStatus name="Apple App Store" detail="Sample fixture data only" /><div className="source-warning"><AlertTriangle size={15} /><span>Live integrations are not configured. The interface labels all sample findings as illustrative instead of implying live monitoring.</span></div></section>
    </div>
    <section className="method-card"><span><BookOpen size={17} /></span><div><strong>Look-alike matching avoids simple substring-only alerting</strong><p>Names are canonicalized for case, spacing, punctuation, and common digit substitutions (0/o, 1/l, 3/e, 5/s, 8/b), then compared using edit distance. Name similarity is combined with independent logo, publisher, description, and scam signals. Candidates below the minimum score are not promoted to findings.</p></div></section>
  </section>;
}

function ArchitectureNode({ number, title, detail }: { number: string; title: string; detail: string }) {
  return <div className="architecture-node"><span>{number}</span><div><strong>{title}</strong><small>{detail}</small></div></div>;
}

function SourceStatus({ name, detail }: { name: string; detail: string }) {
  return <div className="source-row"><span className="source-unavailable" /><span><strong>{name}</strong><small>{detail}</small></span><em>Not connected</em></div>;
}

function FindingDialog({ finding, onClose }: { finding: Finding; onClose: () => void }) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="finding-dialog" role="dialog" aria-modal="true" aria-labelledby="finding-title">
      <header><div><p className="eyebrow"><i /> FINDING DETAILS</p><h2 id="finding-title">{finding.name}</h2></div><button className="icon-button" aria-label="Close details" onClick={onClose}><X size={18} /></button></header>
      <p className="finding-account">{finding.account} · {finding.platform} · {finding.kind}</p>
      <div className="score-card"><span>Prototype risk score</span><strong>{finding.score}<small>/100</small></strong><RiskBadge risk={finding.risk} score={finding.score} /></div>
      <h3>Signals contributing to this score</h3>
      <ul className="reason-list">{finding.reasons.map((reason) => <li key={reason}><AlertTriangle size={14} />{reason}</li>)}</ul>
      {finding.developer && <div className="detail-field"><small>DEVELOPER / PUBLISHER</small><strong>{finding.developer}</strong><span>{finding.packageId}</span></div>}
      <div className="detail-field"><small>DESCRIPTION</small><p>{finding.description}</p></div>
      <div className="dialog-disclaimer"><Info size={14} /> Demo heuristic only. Treat this as a lead for analyst review, not proof of malicious activity.</div>
      <button className="primary-button close-button" onClick={onClose}>Back to detections</button>
    </section>
  </div>;
}

function Metric({ title, number, delta, note, tone, icon, points }: { title: string; number: string; delta: string; note: string; tone: string; icon: React.ReactNode; points: string }) {
  const isImproving = title === "Avg. response time";
  return <article className="metric"><div className="metric-head"><span className={`metric-icon ${tone}`}>{icon}</span><button className="icon-button" aria-label={`More ${title} options`}><MoreHorizontal size={17} /></button></div><p>{title}</p><div className="metric-bottom"><div><strong>{number}</strong><span className="metric-change"><i className={isImproving ? "good" : ""}>{isImproving ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}{delta}</i>{note}</span></div><svg viewBox="0 0 80 23" aria-hidden="true"><polyline className={tone} points={points} /></svg></div></article>;
}

function RiskBadge({ risk, score }: { risk: Risk; score: number }) {
  return <span className={`risk-badge ${risk.toLowerCase()}`}><i />{risk}<small>{score}</small></span>;
}

function platformColor(platform: string): string {
  const colors: Record<string, string> = { Instagram: "instagram", X: "x", Facebook: "facebook", TikTok: "tiktok", YouTube: "youtube", "Google Play": "google", "App Store": "appstore" };
  return colors[platform] ?? "default";
}

function platformIcon(platform: string): string {
  const icons: Record<string, string> = { Instagram: "◎", X: "𝕏", Facebook: "f", TikTok: "♪", YouTube: "▶", "Google Play": "▶", "App Store": "A" };
  return icons[platform] ?? "•";
}

export default App;
