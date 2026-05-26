import { useCallback, useEffect, useState, useReducer } from "react";
import { Server, Lock, Activity } from "lucide-react";
import { api } from "./api.js";

// Components
import { Sidebar } from "./components/Sidebar.jsx";
import { Topbar } from "./components/Topbar.jsx";

// Views
import { OverviewView } from "./views/OverviewView.jsx";
import { ServersView } from "./views/ServersView.jsx";
import { ServicesView } from "./views/ServicesView.jsx";
import { AlertsView } from "./views/AlertsView.jsx";
import { LogsView } from "./views/LogsView.jsx";
import { SecurityView } from "./views/SecurityView.jsx";
import { SmtpView } from "./views/SmtpView.jsx";
import { SettingsView } from "./views/SettingsView.jsx";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api.login({ username, password });
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <div className="brand-mark">
            <Server size={26} />
          </div>
          <div>
            <h1>GrafOps Node</h1>
            <p>Windows Server 2016 dashboard</p>
          </div>
        </div>

        <form onSubmit={submit} className="login-form">
          <label htmlFor="login-username">
            Username
            <input id="login-username" aria-label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </label>
          <label htmlFor="login-password">
            Password
            <input id="login-password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" />
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          <button disabled={loading} type="submit">
            <Lock size={16} />
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

const initialDashboardState = {
  activeTab: "overview",
  overview: null,
  selectedAlertId: null,
  loading: true,
  notice: "",
  sntp: null,
  smtp: null,
  telegram: null,
  monitoring: null,
  security: null,
};

function dashboardReducer(state, action) {
  switch (action.type) {
    case "SET_TAB": return { ...state, activeTab: action.payload };
    case "SET_OVERVIEW": return { ...state, overview: action.payload, loading: false };
    case "SET_LOADING": return { ...state, loading: action.payload };
    case "SET_ALERT": return { ...state, selectedAlertId: action.payload };
    case "SET_NOTICE": return { ...state, notice: action.payload };
    case "SET_SETTINGS": return { ...state, ...action.payload };
    case "UPDATE_SNTP": return { ...state, sntp: action.payload };
    case "UPDATE_SMTP": return { ...state, smtp: action.payload };
    case "UPDATE_TELEGRAM": return { ...state, telegram: action.payload };
    case "UPDATE_MONITORING": return { ...state, monitoring: action.payload.monitoring, security: action.payload.security };
    default: return state;
  }
}

function ActiveView({ 
  activeTab, overview, selectedAlertId, notice, sntp, smtp, telegram, monitoring, security, 
  user, load, onSelectAlert,
  onSaveSntp, onSyncSntp, onSaveSmtp, onTestSmtp, onSaveTelegram, onTestTelegram, onFetchTelegramChatId, onSaveMonitoring, onRunAlertLabScenario
}) {
  switch (activeTab) {
    case "servers":
      return <ServersView overview={overview} />;
    case "services":
      return <ServicesView overview={overview} />;
    case "alerts":
      return <AlertsView overview={overview} selectedAlertId={selectedAlertId} onSelectAlert={onSelectAlert} api={api} user={user} load={load} />;
    case "logs":
      return <LogsView overview={overview} />;
    case "security":
      return <SecurityView overview={overview} security={security} />;
    case "smtp":
      return (
        <SmtpView
          key="smtp-view"
          user={user}
          smtp={smtp}
          telegram={telegram}
          onSaveSmtp={onSaveSmtp}
          onTestSmtp={onTestSmtp}
          onSaveTelegram={onSaveTelegram}
          onTestTelegram={onTestTelegram}
        />
      );
    case "settings":
      return (
        <SettingsView
          user={user}
          overview={overview}
          sntp={sntp}
          telegram={telegram}
          monitoring={monitoring}
          onSaveSntp={onSaveSntp}
          onSyncSntp={onSyncSntp}
          onSaveTelegram={onSaveTelegram}
          onTestTelegram={onTestTelegram}
          onFetchTelegramChatId={onFetchTelegramChatId}
          onSaveMonitoring={onSaveMonitoring}
          onRunAlertLabScenario={onRunAlertLabScenario}
        />
      );
    case "overview":
    default:
      return <OverviewView overview={overview} onSelectAlert={onSelectAlert} />;
  }
}

function Dashboard({ user, onLogout }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialDashboardState);

  const load = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await api.overview();
      dispatch({ type: "SET_OVERVIEW", payload: data });
    } catch (err) {
      if (err.message.includes("Authentication required") || err.message.includes("Session user is inactive")) {
        onLogout();
      }
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [onLogout]);

  const loadSettings = useCallback(async () => {
    try {
      const [sntpData, smtpData, telegramData, monitoringData] = await Promise.all([
        api.sntpSettings(),
        api.smtpSettings(),
        user.role === "admin" ? api.telegramSettings() : Promise.resolve({ telegram: null }),
        api.monitoringSettings()
      ]);
      dispatch({ 
        type: "SET_SETTINGS", 
        payload: {
          sntp: sntpData.sntp,
          smtp: smtpData.smtp,
          telegram: telegramData.telegram,
          monitoring: monitoringData.monitoring,
          security: monitoringData.security
        }
      });
    } catch (err) {
      if (err.message.includes("Authentication required") || err.message.includes("Session user is inactive")) {
        onLogout();
      }
    }
  }, [user.role, onLogout]);

  useEffect(() => {
    load();
    loadSettings().catch(() => undefined);
  }, [load, loadSettings]);

  useEffect(() => {
    const intervalSeconds = state.monitoring?.pollingIntervalSeconds ?? 3;
    const timer = window.setInterval(load, intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [load, state.monitoring?.pollingIntervalSeconds]);

  async function logout() {
    await api.logout();
    onLogout();
  }

  if (state.loading && !state.overview) {
    return (
      <main className="loading-screen">
        <Activity size={28} />
        Loading dashboard
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Sidebar activeTab={state.activeTab} onTabChange={(tab) => dispatch({ type: "SET_TAB", payload: tab })} />
      <section className="main-panel">
        <Topbar 
          server={state.overview.server} 
          openAlerts={state.overview.alerts.filter((a) => a.status !== "resolved")} 
          monitoring={state.monitoring} 
          user={user} 
          loading={state.loading} 
          onRefresh={load} 
          onLogout={logout} 
        />
        <ActiveView 
          activeTab={state.activeTab}
          overview={state.overview}
          selectedAlertId={state.selectedAlertId}
          notice={state.notice}
          sntp={state.sntp}
          smtp={state.smtp}
          telegram={state.telegram}
          monitoring={state.monitoring}
          security={state.security}
          user={user}
          load={load}
          onSelectAlert={(id) => {
            dispatch({ type: "SET_ALERT", payload: id });
            dispatch({ type: "SET_TAB", payload: "alerts" });
          }}
          onSaveSntp={async (payload) => {
            const data = await api.saveSntpSettings(payload);
            dispatch({ type: "UPDATE_SNTP", payload: data.sntp });
          }}
          onSyncSntp={async () => {
            const data = await api.syncSntp();
            dispatch({ type: "UPDATE_SNTP", payload: data.sntp });
          }}
          onSaveSmtp={async (payload) => {
            const data = await api.saveSmtpSettings(payload);
            dispatch({ type: "UPDATE_SMTP", payload: data.smtp });
          }}
          onTestSmtp={async (payload) => {
            return await api.testSmtpSettings(payload);
          }}
          onSaveTelegram={async (payload) => {
            const data = await api.saveTelegramSettings(payload);
            dispatch({ type: "UPDATE_TELEGRAM", payload: data.telegram });
          }}
          onTestTelegram={() => api.testTelegram()}
          onFetchTelegramChatId={async (payload) => {
            const data = await api.fetchTelegramChatId(payload);
            return data;
          }}
          onSaveMonitoring={async (payload) => {
            const data = await api.saveMonitoringSettings(payload);
            dispatch({ type: "UPDATE_MONITORING", payload: data });
          }}
          onRunAlertLabScenario={async (scenario) => {
            await api.runAlertLabScenario(scenario);
            const [, data] = await Promise.all([load(), api.monitoringSettings()]);
            dispatch({ type: "UPDATE_MONITORING", payload: data });
          }}
        />
      </section>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <main className="loading-screen">
        <Activity size={28} />
        Checking session
      </main>
    );
  }

  return user ? <Dashboard user={user} onLogout={() => setUser(null)} /> : <Login onLogin={setUser} />;
}
