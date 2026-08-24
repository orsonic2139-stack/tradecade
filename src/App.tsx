import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, BookOpen, CalendarDays,
  ChevronDown, CircleDollarSign, Clock3, LayoutDashboard, LogOut, Menu,
  Moon, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles,
  Target, TrendingUp, X, Zap, Upload, DollarSign, AlertCircle
} from 'lucide-react';

type Trade = {
  id: string;
  user_id?: string;
  trade_date: string;
  symbol: string;
  market: string;
  side: 'Long' | 'Short';
  timeframe: string;
  entry_price: number;
  exit_price: number;
  stop_loss?: number;
  lot_size: number;
  pnl: number;
  pnl_percent: number;
  setup: string;
  status: 'Closed' | 'Open';
  notes: string;
  tags: string[];
  screenshot_url?: string;
  created_at?: string;
};

type UserSettings = {
  initial_capital: number;
};

type View = 'overview' | 'journal' | 'analytics' | 'calendar';

const seedTrades: Trade[] = [
  { id: '1', trade_date: '2024-06-18', symbol: 'NVDA', market: 'Stocks', side: 'Long', timeframe: '4H', entry_price: 118.42, exit_price: 124.86, stop_loss: 115.00, lot_size: 40, pnl: 257.6, pnl_percent: 5.44, setup: 'Breakout', status: 'Closed', notes: 'Clean continuation above weekly resistance.', tags: ['A+ setup', 'AI'] },
  { id: '2', trade_date: '2024-06-17', symbol: 'BTC/USD', market: 'Crypto', side: 'Short', timeframe: '1H', entry_price: 66820, exit_price: 65940, stop_loss: 67200, lot_size: 0.18, pnl: 158.4, pnl_percent: 1.31, setup: 'Reversal', status: 'Closed', notes: 'Waited for liquidity sweep before entry.', tags: ['patience'] },
];

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'journal', label: 'Trade journal', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
];

const money = (value: number) => `${value >= 0 ? '+' : '-'}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const initials = (email: string) => email.slice(0, 2).toUpperCase();

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ initial_capital: 10000 });
  const [view, setView] = useState<View>('overview');
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState('');

  // Load user settings
  useEffect(() => {
    if (!session || !supabase) return;
    supabase
      .from('user_settings')
      .select('initial_capital')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          setSettings(data as UserSettings);
        } else {
          // Create default settings if not exists
          supabase
            .from('user_settings')
            .insert({ user_id: session.user.id, initial_capital: 10000 })
            .then(() => setSettings({ initial_capital: 10000 }));
        }
      });
  }, [session]);

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) return;
    supabase.from('trades').select('*').order('trade_date', { ascending: false }).then(({ data, error }) => {
      if (!error && data) setTrades(data as Trade[]);
    });
  }, [session]);

  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(''), 3000); return () => window.clearTimeout(timer); } }, [toast]);

  if (authLoading) return <div className="loading-screen"><div className="brand-mark"><Activity size={20} /></div><span>Loading your workspace</span></div>;
  if (!session) return <AuthScreen onSignedIn={setSession} />;

  const email = session.user.email ?? 'trader@tradecade.com';

  const saveTrade = async (trade: Omit<Trade, 'id' | 'created_at' | 'user_id'>, id?: string) => {
    if (!supabase) return;
    const payload = { 
      ...trade, 
      pnl: Number(trade.pnl), 
      pnl_percent: Number(trade.pnl_percent), 
      entry_price: Number(trade.entry_price), 
      exit_price: Number(trade.exit_price),
      stop_loss: trade.stop_loss ? Number(trade.stop_loss) : null,
      lot_size: Number(trade.lot_size),
    };
    const result = id 
      ? await supabase.from('trades').update(payload).eq('id', id).select().maybeSingle() 
      : await supabase.from('trades').insert(payload).select().maybeSingle();
    if (result.error || !result.data) { 
      setToast('Could not save this trade. Check your connection.'); 
      console.error(result.error);
      return; 
    }
    setTrades((current) => id 
      ? current.map((item) => item.id === id ? result.data as Trade : item) 
      : [result.data as Trade, ...current]
    );
    setShowForm(false); 
    setEditingTrade(null); 
    setToast(id ? 'Trade updated' : 'Trade logged');
  };

  const deleteTrade = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (error) { setToast('Could not delete this trade.'); return; }
    setTrades((current) => current.filter((item) => item.id !== id)); 
    setToast('Trade removed');
  };

  const updateSettings = async (capital: number) => {
  if (!supabase || !session) return;
  
  // 接受任何數字（包括 0 和負數）
  const { error } = await supabase
    .from('user_settings')
    .update({ initial_capital: capital })
    .eq('user_id', session.user.id);
  
  if (!error) {
    setSettings({ initial_capital: capital });
    setToast('Settings updated successfully');
    setShowSettings(false);
  } else {
    setToast('Failed to update settings');
    console.error(error);
  }
};

  const logout = () => { supabase?.auth.signOut(); setSession(null); };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'is-open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark"><Activity size={19} /></div>
            <span>trade<span>cade</span></span>
          </div>
          <button className="icon-button mobile-close" onClick={() => setMobileNav(false)}><X size={18} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button 
              key={id} 
              className={`nav-item ${view === id ? 'active' : ''}`} 
              onClick={() => { setView(id); setMobileNav(false); }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === 'journal' && <span className="nav-count">{trades.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="pro-card">
            <div className="pro-icon"><Sparkles size={16} /></div>
            <div>
              <strong>Account Capital</strong>
              <span>${settings.initial_capital.toLocaleString()}</span>
            </div>
            <ChevronDown size={15} />
          </div>
          <button className="nav-item" onClick={() => setShowSettings(true)}>
            <Settings size={18} />
            <span>Settings</span>
          </button>
          <button className="profile" onClick={logout}>
            <div className="avatar">{initials(email)}</div>
            <div>
              <strong>{email.split('@')[0]}</strong>
              <span>Sign out</span>
            </div>
            <LogOut size={15} />
          </button>
        </div>
      </aside>
      {mobileNav && <button className="mobile-overlay" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
      <main className="main-content">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{navItems.find((item) => item.id === view)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <button className="icon-button"><Moon size={18} /></button>
            <button className="notification"><span /></button>
            <div className="avatar small">{initials(email)}</div>
          </div>
        </header>
        <div className="page-content">
          {view === 'overview' && <Overview trades={trades} settings={settings} onAdd={() => { setEditingTrade(null); setShowForm(true); }} onViewJournal={() => setView('journal')} />}
          {view === 'journal' && <Journal trades={trades} onAdd={() => { setEditingTrade(null); setShowForm(true); }} onEdit={(trade) => { setEditingTrade(trade); setShowForm(true); }} onDelete={deleteTrade} />}
          {view === 'analytics' && <Analytics trades={trades} settings={settings} />}
          {view === 'calendar' && <CalendarView trades={trades} />}
        </div>
      </main>
      {showForm && <TradeForm trade={editingTrade} onClose={() => { setShowForm(false); setEditingTrade(null); }} onSave={saveTrade} />}
      {showSettings && <SettingsModal settings={settings} onClose={() => setShowSettings(false)} onSave={updateSettings} />}
      {toast && <div className="toast"><ShieldCheck size={17} />{toast}</div>}
    </div>
  );
}

function AuthScreen({ onSignedIn }: { onSignedIn: (session: Session) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    if (!supabase) { setError('Account service is not connected yet.'); setLoading(false); return; }
    const result = mode === 'signin' 
      ? await supabase.auth.signInWithPassword({ email, password }) 
      : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (result.error) setError(result.error.message);
    else if (result.data.session) onSignedIn(result.data.session);
    else setError('Check your inbox to confirm your account.');
  };

  return (
    <div className="auth-screen">
      <div className="auth-visual">
        <div className="auth-grid" />
        <div className="auth-copy">
          <div className="brand light">
            <div className="brand-mark"><Activity size={19} /></div>
            <span>trade<span>cade</span></span>
          </div>
          <div className="hero-copy">
            <div className="eyebrow"><span className="pulse-dot" />THE MODERN TRADING JOURNAL</div>
            <h1>Trade with intention.<br /><em>Review with clarity.</em></h1>
            <p>Turn every position into an advantage. Tradecade gives you the data, discipline, and perspective to build your edge.</p>
          </div>
          <div className="visual-stats">
            <div><strong>+18.42%</strong><span>Monthly return</span></div>
            <div><strong>72.4%</strong><span>Win rate</span></div>
            <div><strong>2.84</strong><span>Profit factor</span></div>
          </div>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand brand">
            <div className="brand-mark"><Activity size={19} /></div>
            <span>trade<span>cade</span></span>
          </div>
          <div className="auth-heading">
            <span className="eyebrow">WELCOME BACK</span>
            <h2>{mode === 'signin' ? 'Your edge starts here.' : 'Create your workspace.'}</h2>
            <p>{mode === 'signin' ? 'Sign in to continue your trading journey.' : 'Start building a repeatable trading process.'}</p>
          </div>
          <form onSubmit={submit}>
            <label>Email address
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
            </label>
            <label>Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" minLength={6} required />
            </label>
            {error && <div className="form-error">{error}</div>}
            <button className="primary-button full" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
              <ArrowUpRight size={17} />
            </button>
          </form>
          <div className="auth-switch">
            {mode === 'signin' ? 'New to Tradecade?' : 'Already have an account?'}
            <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
              {mode === 'signin' ? 'Create an account' : 'Sign in'}
            </button>
          </div>
          <div className="secure-note"><ShieldCheck size={15} /> Your data is private and encrypted</div>
        </div>
      </div>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, change, icon: Icon, tone = 'green' }: { label: string; value: string; change?: string; icon: typeof TrendingUp; tone?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span>{label}</span>
        <div className={`stat-icon ${tone}`}><Icon size={17} /></div>
      </div>
      <strong>{value}</strong>
      {change && <div className={`stat-change ${change.startsWith('-') ? 'negative' : ''}`}>
        {change.startsWith('-') ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
        {change.replace('-', '')}<span>vs last month</span>
      </div>}
    </div>
  );
}

function Overview({ trades, settings, onAdd, onViewJournal }: { trades: Trade[]; settings: UserSettings; onAdd: () => void; onViewJournal: () => void }) {
  const stats = useStats(trades, settings);
  const max = Math.max(...stats.chart.map((item) => Math.abs(item.value)), 1);
  
  return (
    <>
      <PageHeader 
        eyebrow="MONDAY, JUNE 24, 2024" 
        title="Good morning, trader." 
        description={`Account Balance: $${settings.initial_capital.toLocaleString()}`}
        action={<button className="primary-button" onClick={onAdd}><Plus size={17} /> Log a trade</button>} 
      />
      <div className="stats-grid">
        <StatCard label="Net P&L" value={money(stats.net)} change="+12.8%" icon={CircleDollarSign} />
        <StatCard label="Win rate" value={`${stats.winRate.toFixed(1)}%`} change="+4.6%" icon={Target} tone="blue" />
        <StatCard label="Profit factor" value={stats.profitFactor.toFixed(2)} change="+0.32" icon={TrendingUp} tone="orange" />
        <StatCard label="Total trades" value={String(trades.length)} change="+8" icon={Activity} tone="pink" />
      </div>
      <div className="dashboard-grid">
        <section className="panel performance-panel">
          <div className="panel-heading">
            <div>
              <h3>Performance overview</h3>
              <span>Equity curve · Last 30 days</span>
            </div>
            <button className="select-button">Last 30 days <ChevronDown size={14} /></button>
          </div>
          <div className="chart-area">
            <div className="y-labels">
              <span>+$2k</span>
              <span>+$1k</span>
              <span>$0</span>
              <span>-$1k</span>
            </div>
            <div className="chart">
              <div className="grid-line line-1" />
              <div className="grid-line line-2" />
              <div className="grid-line line-3" />
              <div className="grid-line line-4" />
              <div className="zero-line" />
              <div className="bars">
                {stats.chart.map((item, index) => (
                  <div className="bar-wrap" key={index}>
                    <div className={`bar ${item.value < 0 ? 'loss' : ''}`} 
                      style={{ 
                        height: `${Math.max(8, Math.abs(item.value) / max * 72)}%`, 
                        transform: item.value < 0 ? 'translateY(100%)' : undefined 
                      }} 
                    />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="chart-footer">
            <span><i className="legend-dot green" /> Profitable days</span>
            <span><i className="legend-dot red" /> Losing days</span>
            <strong>Net {money(stats.net)}</strong>
          </div>
        </section>
        <section className="panel setup-panel">
          <div className="panel-heading">
            <div>
              <h3>Setup performance</h3>
              <span>Where your edge comes from</span>
            </div>
            <button className="more-button">•••</button>
          </div>
          {stats.setups.map((setup) => (
            <div className="setup-row" key={setup.name}>
              <div className="setup-name">
                <span className="setup-dot" />
                {setup.name}
                <small>{setup.count} trades</small>
              </div>
              <strong className={setup.pnl < 0 ? 'negative-text' : ''}>{money(setup.pnl)}</strong>
              <div className="mini-progress">
                <span style={{ width: `${Math.min(100, Math.max(10, setup.rate))}%` }} />
              </div>
            </div>
          ))}
          <button className="text-button" onClick={onViewJournal}>View all setups <ArrowUpRight size={15} /></button>
        </section>
      </div>
      <section className="panel recent-panel">
        <div className="panel-heading">
          <div>
            <h3>Recent trades</h3>
            <span>Your latest activity</span>
          </div>
          <button className="text-button" onClick={onViewJournal}>View journal <ArrowUpRight size={15} /></button>
        </div>
        <TradeTable trades={trades.slice(0, 4)} compact />
      </section>
    </>
  );
}

function useStats(trades: Trade[], settings: UserSettings) {
  const net = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const wins = trades.filter((trade) => trade.pnl > 0).length;
  const losses = trades.filter((trade) => trade.pnl < 0).length;
  const totalWins = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
  const totalLosses = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
  
  const chart = trades.slice(0, 7).reverse().map((trade, index) => ({ 
    value: trade.pnl, 
    label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][index] 
  }));
  
  const grouped = trades.reduce<Record<string, { pnl: number; count: number }>>((result, trade) => {
    result[trade.setup] ??= { pnl: 0, count: 0 };
    result[trade.setup].pnl += trade.pnl;
    result[trade.setup].count += 1;
    return result;
  }, {});
  
  const setups = Object.entries(grouped).map(([name, item]) => ({ 
    name, 
    ...item, 
    rate: (item.pnl / Math.max(net, 1)) * 100 
  })).sort((a, b) => b.pnl - a.pnl).slice(0, 4);
  
  return { net, winRate: trades.length ? wins / trades.length * 100 : 0, chart, setups, profitFactor, wins, losses };
}

function Journal({ trades, onAdd, onEdit, onDelete }: { trades: Trade[]; onAdd: () => void; onEdit: (trade: Trade) => void; onDelete: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const filtered = trades.filter((trade) => 
    (trade.symbol.toLowerCase().includes(search.toLowerCase()) || 
     trade.setup.toLowerCase().includes(search.toLowerCase())) && 
    (filter === 'All' || (filter === 'Wins' ? trade.pnl > 0 : trade.pnl < 0))
  );
  
  return (
    <>
      <PageHeader 
        eyebrow="YOUR RECORD" 
        title="Trade journal" 
        description="A clear record of every decision, setup, and outcome." 
        action={<button className="primary-button" onClick={onAdd}><Plus size={17} /> Log a trade</button>} 
      />
      <div className="journal-toolbar">
        <div className="search-box">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search symbol or setup" />
        </div>
        <div className="filter-buttons">
          <button className={filter === 'All' ? 'active' : ''} onClick={() => setFilter('All')}>All trades</button>
          <button className={filter === 'Wins' ? 'active' : ''} onClick={() => setFilter('Wins')}>Winners</button>
          <button className={filter === 'Losses' ? 'active' : ''} onClick={() => setFilter('Losses')}>Losers</button>
          <button className="filter-icon"><SlidersHorizontal size={16} /></button>
        </div>
      </div>
      <section className="panel journal-table-panel">
        <TradeTable trades={filtered} onEdit={onEdit} onDelete={onDelete} />
      </section>
    </>
  );
}

function TradeTable({ trades, compact = false, onEdit, onDelete }: { trades: Trade[]; compact?: boolean; onEdit?: (trade: Trade) => void; onDelete?: (id: string) => void }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Trade</th>
            <th>Direction</th>
            <th>Setup</th>
            <th>Entry → Exit</th>
            <th>SL</th>
            <th>Date</th>
            <th>Result</th>
            {!compact && <th />}
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id} onClick={() => onEdit?.(trade)}>
              <td>
                <div className="trade-symbol">
                  <div className={`symbol-icon ${trade.market.toLowerCase()}`}>{trade.symbol.slice(0, 1)}</div>
                  <div>
                    <strong>{trade.symbol}</strong>
                    <small>{trade.market} · {trade.timeframe}</small>
                  </div>
                </div>
              </td>
              <td>
                <span className={`direction ${trade.side.toLowerCase()}`}>
                  {trade.side === 'Long' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {trade.side}
                </span>
              </td>
              <td><span className="setup-label">{trade.setup}</span></td>
              <td className="price-cell">
                ${trade.entry_price.toLocaleString()} <span>→</span> ${trade.exit_price.toLocaleString()}
              </td>
              <td className="price-cell">
                {trade.stop_loss ? `$${trade.stop_loss.toLocaleString()}` : '—'}
              </td>
              <td className="date-cell">{new Date(trade.trade_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
              <td>
                <strong className={trade.pnl >= 0 ? 'positive-text' : 'negative-text'}>{money(trade.pnl)}</strong>
                <small className={trade.pnl >= 0 ? 'positive-text' : 'negative-text'}>
                  {trade.pnl_percent >= 0 ? '+' : ''}{trade.pnl_percent.toFixed(2)}%
                </small>
              </td>
              {!compact && <td>
                <button className="row-menu" onClick={(event) => { 
                  event.stopPropagation(); 
                  if (window.confirm('Remove this trade?')) onDelete?.(trade.id); 
                }}>•••</button>
              </td>}
            </tr>
          ))}
        </tbody>
      </table>
      {!trades.length && (
        <div className="empty-state">
          <BookOpen size={25} />
          <strong>No trades found</strong>
          <span>Log your first trade to start building your record.</span>
        </div>
      )}
    </div>
  );
}

function Analytics({ trades, settings }: { trades: Trade[]; settings: UserSettings }) {
  const stats = useStats(trades, settings);
  const winners = trades.filter((trade) => trade.pnl > 0);
  const losers = trades.filter((trade) => trade.pnl < 0);
  
  return (
    <>
      <PageHeader 
        eyebrow="DEEP DIVE" 
        title="Analytics" 
        description="Understand the patterns behind your performance." 
        action={<button className="select-button"><CalendarDays size={15} /> Jun 2024 <ChevronDown size={14} /></button>} 
      />
      <div className="stats-grid">
        <StatCard label="Average winner" value={money(winners.length ? winners.reduce((a, b) => a + b.pnl, 0) / winners.length : 0)} icon={ArrowUpRight} />
        <StatCard label="Average loser" value={money(losers.length ? losers.reduce((a, b) => a + b.pnl, 0) / losers.length : 0)} icon={ArrowDownRight} tone="pink" />
        <StatCard label="Best trade" value={money(Math.max(...trades.map((trade) => trade.pnl), 0))} icon={Zap} tone="orange" />
        <StatCard label="Expectancy" value={money(trades.length ? stats.net / trades.length : 0)} icon={TrendingUp} tone="blue" />
      </div>
      <div className="analytics-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Win / loss distribution</h3>
              <span>Outcomes by trade count</span>
            </div>
          </div>
          <div className="distribution">
            <div className="donut" style={{ '--win': `${stats.winRate}%` } as React.CSSProperties}>
              <div>
                <strong>{stats.winRate.toFixed(0)}%</strong>
                <span>win rate</span>
              </div>
            </div>
            <div className="distribution-legend">
              <div><i className="legend-dot green" /><span>Winning trades</span><strong>{winners.length}</strong></div>
              <div><i className="legend-dot red" /><span>Losing trades</span><strong>{losers.length}</strong></div>
              <div><i className="legend-dot blue" /><span>Total P&L</span><strong>{money(stats.net)}</strong></div>
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Behavioral scorecard</h3>
              <span>Habits that compound</span>
            </div>
          </div>
          <div className="score-row">
            <div><Target size={16} /> Followed plan</div>
            <strong>86%</strong>
            <div className="score-bar"><span style={{ width: '86%' }} /></div>
          </div>
          <div className="score-row">
            <div><Clock3 size={16} /> Held to target</div>
            <strong>74%</strong>
            <div className="score-bar"><span style={{ width: '74%' }} /></div>
          </div>
          <div className="score-row">
            <div><ShieldCheck size={16} /> Managed risk</div>
            <strong>91%</strong>
            <div className="score-bar"><span style={{ width: '91%' }} /></div>
          </div>
          <div className="score-row" style={{ borderBottom: 'none', paddingBottom: '4px' }}>
            <div><DollarSign size={16} /> Account balance</div>
            <strong>${settings.initial_capital.toLocaleString()}</strong>
            <div className="score-bar"><span style={{ width: '100%' }} /></div>
          </div>
        </section>
      </div>
    </>
  );
}

function CalendarView({ trades }: { trades: Trade[] }) {
  const byDate = useMemo(() => trades.reduce<Record<string, Trade[]>>((result, trade) => {
    (result[trade.trade_date] ??= []).push(trade);
    return result;
  }, {}), [trades]);
  
  const days = Array.from({ length: 30 }, (_, index) => index + 1);
  
  return (
    <>
      <PageHeader 
        eyebrow="CONSISTENCY" 
        title="Trading calendar" 
        description="See your rhythm, one session at a time." 
        action={<button className="select-button">June 2024 <ChevronDown size={14} /></button>} 
      />
      <section className="panel calendar-panel">
        <div className="calendar-weekdays">
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {days.map((day) => {
            const date = `2024-06-${String(day).padStart(2, '0')}`;
            const dayTrades = byDate[date] ?? [];
            const pnl = dayTrades.reduce((sum, trade) => sum + trade.pnl, 0);
            return (
              <div className={`calendar-day ${dayTrades.length ? pnl >= 0 ? 'positive' : 'negative' : ''}`} key={day}>
                <span>{day}</span>
                {dayTrades.length > 0 && (
                  <>
                    <strong>{money(pnl)}</strong>
                    <small>{dayTrades.length} {dayTrades.length === 1 ? 'trade' : 'trades'}</small>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function SettingsModal({ settings, onClose, onSave }: { settings: UserSettings; onClose: () => void; onSave: (capital: number) => void }) {
  const [capital, setCapital] = useState(String(settings.initial_capital ?? ''));
  const [error, setError] = useState('');
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    const trimmedValue = capital.trim();
    
    if (trimmedValue === '') {
      setError('Please enter an amount');
      return;
    }
    
    const value = Number(trimmedValue);
    
    if (isNaN(value)) {
      setError('Please enter a valid number');
      return;
    }
    
    // 接受任何數字
    onSave(value);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };
  
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.currentTarget === e.target && onClose()}>
      <div className="trade-modal" style={{ maxWidth: '420px' }}>
        <div className="modal-heading">
          <div>
            <div className="eyebrow">ACCOUNT SETTINGS</div>
            <h2 style={{ fontSize: '18px' }}>Set initial capital</h2>
          </div>
          <button className="icon-button" onClick={onClose}><X size={19} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'grid', gap: '7px', color: '#93a2ae', fontSize: '10px' }}>
              Initial Account Balance
              <div style={{ position: 'relative' }}>
                <span style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: '#586675',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>$</span>
                <input 
                  type="number" 
                  step="any"
                  value={capital} 
                  onChange={(e) => {
                    setCapital(e.target.value);
                    setError('');
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="10000" 
                  required 
                  style={{ 
                    paddingLeft: '28px',
                    width: '100%',
                    border: error ? '1px solid #ee8077' : '1px solid #2c3945',
                    background: '#0f161d',
                    outline: 'none',
                    color: '#e2ebef',
                    borderRadius: '6px',
                    padding: '10px 11px 10px 28px',
                    fontSize: '14px',
                    transition: '0.2s'
                  }}
                />
              </div>
            </label>
            {error && (
              <div style={{ 
                color: '#ee8077', 
                fontSize: '11px', 
                marginTop: '6px',
                padding: '6px 10px',
                background: '#3a292c',
                borderRadius: '4px'
              }}>
                ⚠️ {error}
              </div>
            )}
            <p style={{ 
              color: '#788795', 
              fontSize: '11px', 
              marginTop: '8px',
              lineHeight: '1.5'
            }}>
              This will be used to track your overall performance.<br />
              You can enter any amount (including 0).
            </p>
          </div>
          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button className="primary-button" type="submit">
              Save settings <ArrowUpRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TradeForm({ trade, onClose, onSave }: { trade: Trade | null; onClose: () => void; onSave: (trade: Omit<Trade, 'id' | 'created_at' | 'user_id'>, id?: string) => void }) {
  const [form, setForm] = useState({
    trade_date: trade?.trade_date ?? new Date().toISOString().slice(0, 10),
    symbol: trade?.symbol ?? '',
    market: trade?.market ?? 'Stocks',
    side: trade?.side ?? 'Long',
    timeframe: trade?.timeframe ?? '1D',
    entry_price: String(trade?.entry_price ?? ''),
    exit_price: String(trade?.exit_price ?? ''),
    stop_loss: String(trade?.stop_loss ?? ''),
    lot_size: String(trade?.lot_size ?? '1'),
    pnl: String(trade?.pnl ?? ''),
    pnl_percent: String(trade?.pnl_percent ?? ''),
    setup: trade?.setup ?? 'Breakout',
    notes: trade?.notes ?? '',
    tags: trade?.tags.join(', ') ?? '',
    screenshot_url: trade?.screenshot_url ?? ''
  });
  const [uploading, setUploading] = useState(false);
  
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `screenshots/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('trade-images')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('trade-images')
        .getPublicUrl(filePath);
      
      update('screenshot_url', publicUrl);
      setToast('Screenshot uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      setToast('Failed to upload screenshot');
    } finally {
      setUploading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...form,
      side: form.side as 'Long' | 'Short',
      entry_price: Number(form.entry_price),
      exit_price: Number(form.exit_price),
      stop_loss: form.stop_loss ? Number(form.stop_loss) : undefined,
      lot_size: Number(form.lot_size),
      pnl: Number(form.pnl),
      pnl_percent: Number(form.pnl_percent),
      status: 'Closed',
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      screenshot_url: form.screenshot_url || undefined
    }, trade?.id);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <div className="trade-modal">
        <div className="modal-heading">
          <div>
            <div className="eyebrow">{trade ? 'EDIT ENTRY' : 'NEW ENTRY'}</div>
            <h2>{trade ? 'Refine your trade.' : 'Log a trade.'}</h2>
          </div>
          <button className="icon-button" onClick={onClose}><X size={19} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label>Symbol
              <input value={form.symbol} onChange={(event) => update('symbol', event.target.value.toUpperCase())} placeholder="e.g. NVDA" required />
            </label>
            <label>Date
              <input type="date" value={form.trade_date} onChange={(event) => update('trade_date', event.target.value)} required />
            </label>
            <label>Market
              <select value={form.market} onChange={(event) => update('market', event.target.value)}>
                <option>Stocks</option>
                <option>Crypto</option>
                <option>Futures</option>
                <option>Forex</option>
                <option>Options</option>
              </select>
            </label>
            <label>Timeframe
              <select value={form.timeframe} onChange={(event) => update('timeframe', event.target.value)}>
                <option>15m</option>
                <option>1H</option>
                <option>4H</option>
                <option>1D</option>
                <option>1W</option>
              </select>
            </label>
            <label>Direction
              <div className="segmented">
                <button type="button" className={form.side === 'Long' ? 'active long' : ''} onClick={() => update('side', 'Long')}>Long</button>
                <button type="button" className={form.side === 'Short' ? 'active short' : ''} onClick={() => update('side', 'Short')}>Short</button>
              </div>
            </label>
            <label>Setup
              <select value={form.setup} onChange={(event) => update('setup', event.target.value)}>
                <option>Breakout</option>
                <option>Pullback</option>
                <option>Reversal</option>
                <option>Opening Range</option>
                <option>Breakdown</option>
                <option>Other</option>
              </select>
            </label>
            <label>Entry price
              <input type="number" step="any" value={form.entry_price} onChange={(event) => update('entry_price', event.target.value)} placeholder="0.00" required />
            </label>
            <label>Exit price
              <input type="number" step="any" value={form.exit_price} onChange={(event) => update('exit_price', event.target.value)} placeholder="0.00" required />
            </label>
            <label>Stop Loss (optional)
              <input type="number" step="any" value={form.stop_loss} onChange={(event) => update('stop_loss', event.target.value)} placeholder="0.00" />
            </label>
            <label>Lot Size
              <input type="number" step="any" value={form.lot_size} onChange={(event) => update('lot_size', event.target.value)} placeholder="1" required />
            </label>
            <label>P&L ($)
              <input type="number" step="any" value={form.pnl} onChange={(event) => update('pnl', event.target.value)} placeholder="0.00" required />
            </label>
            <label>P&L (%)
              <input type="number" step="any" value={form.pnl_percent} onChange={(event) => update('pnl_percent', event.target.value)} placeholder="0.00" required />
            </label>
          </div>
          
          <div className="screenshot-upload">
            <label>Screenshot</label>
            <div className="upload-area">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                disabled={uploading}
                id="screenshot-upload"
              />
              <label htmlFor="screenshot-upload" className="upload-label">
                <Upload size={20} />
                <span>{uploading ? 'Uploading...' : 'Upload screenshot'}</span>
              </label>
              {form.screenshot_url && (
                <div className="screenshot-preview">
                  <img src={form.screenshot_url} alt="Trade screenshot" />
                  <button type="button" onClick={() => update('screenshot_url', '')}>✕</button>
                </div>
              )}
            </div>
          </div>

          <label>Notes
            <textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="What did you see? What will you remember?" rows={3} />
          </label>
          <label>Tags <span className="label-hint">Separate with commas</span>
            <input value={form.tags} onChange={(event) => update('tags', event.target.value)} placeholder="A+ setup, patience" />
          </label>
          
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button className="primary-button" type="submit" disabled={uploading}>
              {trade ? 'Save changes' : 'Save trade'} <ArrowUpRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function setToast(arg0: string) {
  // This is a placeholder - the actual setToast is in App component
  console.log('Toast:', arg0);
}

export default App;
