import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, BookOpen, CalendarDays,
  ChevronDown, CircleDollarSign, Clock3, LayoutDashboard, LogOut, Menu,
  Moon, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles,
  Target, TrendingUp, X, Zap, Upload, DollarSign, Award, Trophy, Star,
  Flame, Crown, Shield, Brain, TrendingDown, GitBranch, Medal, Gem,
  Gift, CheckCircle, Lock, AlertCircle, Bell, ListChecks
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

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
  account_balance?: number;
  ranking_enabled?: boolean;
};

type UserStats = {
  total_xp: number;
  level: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_pnl: number;
  max_drawdown: number;
  current_streak: number;
  best_streak: number;
  profit_factor: number;
  avg_win: number;
  avg_loss: number;
  profitability_score: number;
  risk_score: number;
  discipline_score: number;
  consistency_score: number;
  experience_score: number;
  achievements: string[];
  claimed_xp: number;
  unclaimed_achievements: number;
};

type UserAchievement = {
  id: string;
  user_id: string;
  achievement_id: string;
  claimed: boolean;
  claimed_at?: string;
  created_at: string;
};

type View = 'overview' | 'journal' | 'analytics' | 'calendar' | 'achievements';

// ============================================
// LEVEL CONFIG - 更困難的升級系統 (28段位)
// ============================================

const LEVEL_CONFIG = [
  { level: 1, title: 'Rookie I', icon: '🥉', xpRequired: 0 },
  { level: 2, title: 'Rookie II', icon: '🥉', xpRequired: 50 },
  { level: 3, title: 'Rookie III', icon: '🥉', xpRequired: 120 },
  { level: 4, title: 'Hunter I', icon: '🎯', xpRequired: 220 },
  { level: 5, title: 'Hunter II', icon: '🎯', xpRequired: 350 },
  { level: 6, title: 'Hunter III', icon: '🎯', xpRequired: 520 },
  { level: 7, title: 'Trader I', icon: '📊', xpRequired: 740 },
  { level: 8, title: 'Trader II', icon: '📊', xpRequired: 1020 },
  { level: 9, title: 'Trader III', icon: '📊', xpRequired: 1380 },
  { level: 10, title: 'Elite Trader I', icon: '⚡', xpRequired: 1840 },
  { level: 11, title: 'Elite Trader II', icon: '⚡', xpRequired: 2420 },
  { level: 12, title: 'Elite Trader III', icon: '⚡', xpRequired: 3160 },
  { level: 13, title: 'Diamond Hands I', icon: '💎', xpRequired: 4100 },
  { level: 14, title: 'Diamond Hands II', icon: '💎', xpRequired: 5300 },
  { level: 15, title: 'Diamond Hands III', icon: '💎', xpRequired: 6800 },
  { level: 16, title: 'Trading Legend I', icon: '🏆', xpRequired: 8700 },
  { level: 17, title: 'Trading Legend II', icon: '🏆', xpRequired: 11100 },
  { level: 18, title: 'Trading Legend III', icon: '🏆', xpRequired: 14100 },
  { level: 19, title: 'Market Master I', icon: '👑', xpRequired: 17900 },
  { level: 20, title: 'Market Master II', icon: '👑', xpRequired: 22700 },
  { level: 21, title: 'Market Master III', icon: '👑', xpRequired: 28700 },
  { level: 22, title: 'Alpha Hunter I', icon: '🚀', xpRequired: 36300 },
  { level: 23, title: 'Alpha Hunter II', icon: '🚀', xpRequired: 45900 },
  { level: 24, title: 'Alpha Hunter III', icon: '🚀', xpRequired: 58000 },
  { level: 25, title: 'Trading God ⭐', icon: '🌟', xpRequired: 73300 },
  { level: 26, title: 'Trading God ⭐⭐', icon: '🌟', xpRequired: 92600 },
  { level: 27, title: 'Trading God ⭐⭐⭐', icon: '🌟', xpRequired: 117000 },
  { level: 28, title: 'Trading God ∞', icon: '👑🌟', xpRequired: 147800 },
];

// ============================================
// ACHIEVEMENTS HELPERS
// ============================================

function hasStreak(trades: Trade[], count: number, type: 'win' | 'loss'): boolean {
  let streak = 0;
  const sorted = [...trades].sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
  for (const trade of sorted) {
    if ((type === 'win' && trade.pnl > 0) || (type === 'loss' && trade.pnl < 0)) {
      streak++;
      if (streak >= count) return true;
    } else {
      streak = 0;
    }
  }
  return false;
}

function getProfitFactor(trades: Trade[]): number {
  const totalWins = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
  const totalLosses = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
  return totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
}

function getSLRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  return trades.filter(t => t.stop_loss && t.stop_loss > 0).length / trades.length;
}

function getNotesRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  return trades.filter(t => t.notes && t.notes.length > 10).length / trades.length;
}

function getScreenshotRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  return trades.filter(t => t.screenshot_url && t.screenshot_url.length > 0).length / trades.length;
}

function getTagRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  return trades.filter(t => t.tags && t.tags.length > 0).length / trades.length;
}

function getWinRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  return trades.filter(t => t.pnl > 0).length / trades.length * 100;
}

function getRiskReward(trades: Trade[]): number {
  const winners = trades.filter(t => t.pnl > 0);
  const losers = trades.filter(t => t.pnl < 0);
  const avgWin = winners.reduce((sum, t) => sum + t.pnl, 0) / (winners.length || 1);
  const avgLoss = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0)) / (losers.length || 1);
  return avgLoss > 0 ? avgWin / avgLoss : 0;
}

function getTotalPnL(trades: Trade[]): number {
  return trades.reduce((sum, t) => sum + t.pnl, 0);
}

function hasPerfectMonth(trades: Trade[]): boolean {
  if (trades.length < 10) return false;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recent = trades.filter(t => new Date(t.trade_date) >= thirtyDaysAgo);
  return recent.length >= 10 && recent.every(t => t.pnl > 0);
}

function hasBounceBack(trades: Trade[]): boolean {
  const sorted = [...trades].sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
  let lossStreak = 0;
  let winStreak = 0;
  let hasLossStreak = false;
  for (const trade of sorted) {
    if (trade.pnl < 0) {
      lossStreak++;
      if (lossStreak >= 5) hasLossStreak = true;
      winStreak = 0;
    } else if (trade.pnl > 0) {
      winStreak++;
      if (hasLossStreak && winStreak >= 5) return true;
      lossStreak = 0;
    }
  }
  return false;
}

// ============================================
// 54 ACHIEVEMENTS CONFIG
// ============================================

const ACHIEVEMENTS_CONFIG: AchievementDef[] = [
  // ===== 交易數量成就 (12個) =====
  { id: 'first_trade', name: 'First Trade', description: 'Log your first trade', icon: '🎯', category: 'trades', rewardXp: 10, requirement: (t) => t.length >= 1 },
  { id: 'five_trades', name: 'Getting Started', description: 'Complete 5 trades', icon: '📊', category: 'trades', rewardXp: 20, requirement: (t) => t.length >= 5 },
  { id: 'ten_trades', name: 'Double Digits', description: 'Complete 10 trades', icon: '📈', category: 'trades', rewardXp: 30, requirement: (t) => t.length >= 10 },
  { id: 'twenty_trades', name: 'Twenty Club', description: 'Complete 20 trades', icon: '💪', category: 'trades', rewardXp: 40, requirement: (t) => t.length >= 20 },
  { id: 'fifty_trades', name: 'Half Century', description: 'Complete 50 trades', icon: '🏅', category: 'trades', rewardXp: 60, requirement: (t) => t.length >= 50 },
  { id: 'hundred_trades', name: 'Century Club', description: 'Complete 100 trades', icon: '🌟', category: 'trades', rewardXp: 80, requirement: (t) => t.length >= 100 },
  { id: 'two_hundred_trades', name: 'Double Century', description: 'Complete 200 trades', icon: '🔥', category: 'trades', rewardXp: 100, requirement: (t) => t.length >= 200 },
  { id: 'five_hundred_trades', name: 'Half Thousand', description: 'Complete 500 trades', icon: '💎', category: 'trades', rewardXp: 150, requirement: (t) => t.length >= 500 },
  { id: 'thousand_trades', name: 'Thousand Club', description: 'Complete 1000 trades', icon: '👑', category: 'trades', rewardXp: 200, requirement: (t) => t.length >= 1000 },
  { id: 'daily_trader', name: 'Daily Trader', description: 'Trade on 10 different days', icon: '📅', category: 'trades', rewardXp: 25, requirement: (t) => new Set(t.map(trade => trade.trade_date)).size >= 10 },
  { id: 'weekly_warrior', name: 'Weekly Warrior', description: 'Trade on 30 different days', icon: '🗓️', category: 'trades', rewardXp: 50, requirement: (t) => new Set(t.map(trade => trade.trade_date)).size >= 30 },
  { id: 'monthly_marathon', name: 'Monthly Marathon', description: 'Trade on 60 different days', icon: '📆', category: 'trades', rewardXp: 80, requirement: (t) => new Set(t.map(trade => trade.trade_date)).size >= 60 },

  // ===== 盈利成就 (11個) =====
  { id: 'first_profit', name: 'First Profit', description: 'Make your first profitable trade', icon: '💰', category: 'pnl', rewardXp: 15, requirement: (t) => t.some(trade => trade.pnl > 0) },
  { id: 'profit_streak_3', name: '3 Wins in a Row', description: 'Win 3 consecutive trades', icon: '📈', category: 'streak', rewardXp: 20, requirement: (t) => hasStreak(t, 3, 'win') },
  { id: 'profit_streak_5', name: 'Hot Streak', description: 'Win 5 consecutive trades', icon: '🔥', category: 'streak', rewardXp: 35, requirement: (t) => hasStreak(t, 5, 'win') },
  { id: 'profit_streak_8', name: 'On Fire', description: 'Win 8 consecutive trades', icon: '⚡', category: 'streak', rewardXp: 50, requirement: (t) => hasStreak(t, 8, 'win') },
  { id: 'profit_streak_10', name: 'Unstoppable', description: 'Win 10 consecutive trades', icon: '🚀', category: 'streak', rewardXp: 75, requirement: (t) => hasStreak(t, 10, 'win') },
  { id: 'big_winner', name: 'Big Winner', description: 'Make $100+ on a single trade', icon: '🐋', category: 'pnl', rewardXp: 30, requirement: (t) => t.some(trade => trade.pnl >= 100) },
  { id: 'huge_winner', name: 'Huge Winner', description: 'Make $500+ on a single trade', icon: '🦈', category: 'pnl', rewardXp: 50, requirement: (t) => t.some(trade => trade.pnl >= 500) },
  { id: 'massive_winner', name: 'Massive Winner', description: 'Make $1000+ on a single trade', icon: '🐳', category: 'pnl', rewardXp: 80, requirement: (t) => t.some(trade => trade.pnl >= 1000) },
  { id: 'legendary_trade', name: 'Legendary Trade', description: 'Make $5000+ on a single trade', icon: '🌟', category: 'pnl', rewardXp: 150, requirement: (t) => t.some(trade => trade.pnl >= 5000) },
  { id: 'profit_factor_2', name: '2x Profit Factor', description: 'Achieve profit factor of 2.0+', icon: '📊', category: 'pnl', rewardXp: 60, requirement: (t) => getProfitFactor(t) >= 2 },
  { id: 'profit_factor_3', name: 'Elite Profit Factor', description: 'Achieve profit factor of 3.0+', icon: '🚀', category: 'pnl', rewardXp: 100, requirement: (t) => getProfitFactor(t) >= 3 },

  // ===== 風險管理成就 (8個) =====
  { id: 'sl_user', name: 'Risk Manager', description: 'Use stop loss on 30%+ of trades', icon: '🛡️', category: 'risk', rewardXp: 20, requirement: (t) => getSLRate(t) >= 0.3 },
  { id: 'sl_pro', name: 'SL Pro', description: 'Use stop loss on 50%+ of trades', icon: '🛡️', category: 'risk', rewardXp: 35, requirement: (t) => getSLRate(t) >= 0.5 },
  { id: 'sl_master', name: 'SL Master', description: 'Use stop loss on 70%+ of trades', icon: '💎', category: 'risk', rewardXp: 50, requirement: (t) => getSLRate(t) >= 0.7 },
  { id: 'always_protected', name: 'Always Protected', description: 'Use stop loss on 90%+ of trades', icon: '🛡️', category: 'risk', rewardXp: 80, requirement: (t) => getSLRate(t) >= 0.9 },
  { id: 'perfect_risk', name: 'Perfect Risk', description: 'Use stop loss on 100% of trades (min 10 trades)', icon: '💎', category: 'risk', rewardXp: 120, requirement: (t) => getSLRate(t) >= 1.0 && t.length >= 10 },
  { id: 'risk_reward_2', name: '2:1 Risk-Reward', description: 'Maintain 2:1 risk-reward ratio', icon: '📈', category: 'risk', rewardXp: 30, requirement: (t) => getRiskReward(t) >= 2 },
  { id: 'risk_reward_3', name: '3:1 Risk-Reward', description: 'Maintain 3:1 risk-reward ratio', icon: '🚀', category: 'risk', rewardXp: 50, requirement: (t) => getRiskReward(t) >= 3 },
  { id: 'risk_reward_5', name: '5:1 Risk-Reward', description: 'Maintain 5:1 risk-reward ratio', icon: '🌟', category: 'risk', rewardXp: 80, requirement: (t) => getRiskReward(t) >= 5 },

  // ===== 紀律成就 (8個) =====
  { id: 'journal_keeper', name: 'Journal Keeper', description: 'Write notes on 50%+ of trades', icon: '📝', category: 'discipline', rewardXp: 20, requirement: (t) => getNotesRate(t) >= 0.5 },
  { id: 'journal_pro', name: 'Journal Pro', description: 'Write notes on 70%+ of trades', icon: '📝', category: 'discipline', rewardXp: 35, requirement: (t) => getNotesRate(t) >= 0.7 },
  { id: 'journal_master', name: 'Journal Master', description: 'Write notes on 90%+ of trades', icon: '📚', category: 'discipline', rewardXp: 50, requirement: (t) => getNotesRate(t) >= 0.9 },
  { id: 'screenshot_user', name: 'Screenshot User', description: 'Upload screenshots on 30%+ of trades', icon: '📸', category: 'discipline', rewardXp: 20, requirement: (t) => getScreenshotRate(t) >= 0.3 },
  { id: 'screenshot_pro', name: 'Screenshot Pro', description: 'Upload screenshots on 50%+ of trades', icon: '📸', category: 'discipline', rewardXp: 35, requirement: (t) => getScreenshotRate(t) >= 0.5 },
  { id: 'screenshot_master', name: 'Screenshot Master', description: 'Upload screenshots on 70%+ of trades', icon: '🎬', category: 'discipline', rewardXp: 50, requirement: (t) => getScreenshotRate(t) >= 0.7 },
  { id: 'tag_user', name: 'Tag User', description: 'Use tags on 50%+ of trades', icon: '🏷️', category: 'discipline', rewardXp: 20, requirement: (t) => getTagRate(t) >= 0.5 },
  { id: 'tag_master', name: 'Tag Master', description: 'Use tags on 80%+ of trades', icon: '🏷️', category: 'discipline', rewardXp: 40, requirement: (t) => getTagRate(t) >= 0.8 },

  // ===== 特殊成就 (15個) =====
  { id: 'win_rate_50', name: '50% Win Rate', description: 'Maintain 50%+ win rate', icon: '🎯', category: 'special', rewardXp: 30, requirement: (t) => getWinRate(t) >= 50 },
  { id: 'win_rate_60', name: '60% Win Rate', description: 'Maintain 60%+ win rate', icon: '🎯', category: 'special', rewardXp: 45, requirement: (t) => getWinRate(t) >= 60 },
  { id: 'win_rate_70', name: 'Sharpshooter', description: 'Maintain 70%+ win rate', icon: '🎯', category: 'special', rewardXp: 60, requirement: (t) => getWinRate(t) >= 70 },
  { id: 'win_rate_80', name: 'Elite Sharpshooter', description: 'Maintain 80%+ win rate', icon: '🏹', category: 'special', rewardXp: 80, requirement: (t) => getWinRate(t) >= 80 },
  { id: 'perfect_month', name: 'Perfect Month', description: 'Have a month with 10+ trades and 100% win rate', icon: '📅', category: 'special', rewardXp: 100, requirement: (t) => hasPerfectMonth(t) },
  { id: 'million_dollar', name: 'Million Dollar Club', description: 'Reach $100,000+ total P&L', icon: '💎', category: 'special', rewardXp: 200, requirement: (t) => getTotalPnL(t) >= 100000 },
  { id: 'negative_emotion', name: 'Lesson Learned', description: 'Have a losing streak of 5+ trades', icon: '📉', category: 'special', rewardXp: 20, requirement: (t) => hasStreak(t, 5, 'loss') },
  { id: 'bounce_back', name: 'Bounce Back', description: 'Recover from 5+ losing streak with 5+ wins', icon: '🔄', category: 'special', rewardXp: 40, requirement: (t) => hasBounceBack(t) },
  { id: 'diverse_trader', name: 'Diverse Trader', description: 'Trade 5+ different symbols', icon: '🌐', category: 'special', rewardXp: 25, requirement: (t) => new Set(t.map(trade => trade.symbol)).size >= 5 },
  { id: 'market_explorer', name: 'Market Explorer', description: 'Trade 3+ different markets', icon: '🌍', category: 'special', rewardXp: 30, requirement: (t) => new Set(t.map(trade => trade.market)).size >= 3 },
  { id: 'timeframe_expert', name: 'Timeframe Expert', description: 'Trade 4+ different timeframes', icon: '⏰', category: 'special', rewardXp: 30, requirement: (t) => new Set(t.map(trade => trade.timeframe)).size >= 4 },
  { id: 'setup_master', name: 'Setup Master', description: 'Trade 5+ different setups', icon: '🎨', category: 'special', rewardXp: 30, requirement: (t) => new Set(t.map(trade => trade.setup)).size >= 5 },
];

// ============================================
// NAVIGATION
// ============================================

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'journal', label: 'Trade journal', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'achievements', label: 'Achievements', icon: Award },
];

const money = (value: number) => `${value >= 0 ? '+' : '-'}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const initials = (email: string) => email.slice(0, 2).toUpperCase();

// ============================================
// APP COMPONENT
// ============================================

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ initial_capital: 10000 });
  const [stats, setStats] = useState<UserStats | null>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [view, setView] = useState<View>('overview');
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState('');
  const [claiming, setClaiming] = useState<string | null>(null);

  // Load user settings
  useEffect(() => {
    if (!session || !supabase) return;
    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          setSettings(data as UserSettings);
        } else {
          supabase
            .from('user_settings')
            .insert({ user_id: session.user.id, initial_capital: 10000 })
            .then(() => setSettings({ initial_capital: 10000 }));
        }
      });
  }, [session]);

  // Load user stats
  useEffect(() => {
    if (!session || !supabase) return;
    supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          setStats(data as UserStats);
        } else {
          supabase
            .from('user_stats')
            .insert({ user_id: session.user.id })
            .then(() => setStats({
              total_xp: 0,
              level: 1,
              total_trades: 0,
              winning_trades: 0,
              losing_trades: 0,
              total_pnl: 0,
              max_drawdown: 0,
              current_streak: 0,
              best_streak: 0,
              profit_factor: 0,
              avg_win: 0,
              avg_loss: 0,
              profitability_score: 0,
              risk_score: 0,
              discipline_score: 0,
              consistency_score: 0,
              experience_score: 0,
              achievements: [],
              claimed_xp: 0,
              unclaimed_achievements: 0,
            }));
        }
      });
  }, [session]);

  // Load user achievements
  useEffect(() => {
    if (!session || !supabase) return;
    supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', session.user.id)
      .then(({ data, error }) => {
        if (!error && data) {
          setUserAchievements(data as UserAchievement[]);
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
  const unclaimedCount = stats?.unclaimed_achievements || 0;

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

    // Refresh stats and achievements
    setTimeout(() => {
      if (session) {
        supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setStats(data as UserStats);
          });
        supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', session.user.id)
          .then(({ data }) => {
            if (data) setUserAchievements(data as UserAchievement[]);
          });
      }
    }, 500);
  };

  const deleteTrade = async (id: string) => {
  if (!supabase) return;
  
  // 先獲取要刪除的交易信息（用於確認）
  const { data: tradeToDelete } = await supabase
    .from('trades')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();
  
  if (!tradeToDelete) {
    setToast('Trade not found');
    return;
  }
  
  // 刪除交易
  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', id);
    
  if (error) { 
    setToast('Could not delete this trade.'); 
    console.error(error);
    return; 
  }
  
  // 從本地狀態移除
  setTrades((current) => current.filter((item) => item.id !== id)); 
  setToast('Trade removed');
  
  // 等待觸發器完成後刷新數據
  setTimeout(async () => {
    if (session) {
      // 刷新統計
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      if (statsData) {
        setStats(statsData as UserStats);
      } else {
        // 如果沒有數據，重置為默認值
        setStats({
          total_xp: 0,
          level: 1,
          total_trades: 0,
          winning_trades: 0,
          losing_trades: 0,
          total_pnl: 0,
          max_drawdown: 0,
          current_streak: 0,
          best_streak: 0,
          profit_factor: 0,
          avg_win: 0,
          avg_loss: 0,
          profitability_score: 0,
          risk_score: 0,
          discipline_score: 0,
          consistency_score: 0,
          experience_score: 0,
          achievements: [],
          claimed_xp: 0,
          unclaimed_achievements: 0,
        });
      }
      
      // 刷新成就
      const { data: achData } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', session.user.id);
      
      if (achData) {
        setUserAchievements(achData as UserAchievement[]);
      }
    }
  }, 1000);
};

const claimAchievement = async (achievementId: string) => {
  if (!supabase || !session) return;
  setClaiming(achievementId);

  try {
    // 更新成就為已領取
    const { error } = await supabase
      .from('user_achievements')
      .update({ claimed: true, claimed_at: new Date().toISOString() })
      .eq('user_id', session.user.id)
      .eq('achievement_id', achievementId);

    if (error) throw error;

    // 找到成就的 XP 獎勵
    const ach = ACHIEVEMENTS_CONFIG.find(a => a.id === achievementId);
    if (ach) {
      setToast(`+${ach.rewardXp} XP claimed for "${ach.name}"!`);
    } else {
      setToast('Achievement claimed!');
    }

    // 刷新數據
    setTimeout(() => {
      if (session) {
        supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setStats(data as UserStats);
          });
        supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', session.user.id)
          .then(({ data }) => {
            if (data) setUserAchievements(data as UserAchievement[]);
          });
      }
    }, 500);

  } catch (error) {
    console.error('Claim error:', error);
    setToast('Failed to claim achievement');
  } finally {
    setClaiming(null);
  }
};

const updateSettings = async (capital: number) => {
  if (!supabase || !session) return;
  
  // 獲取當前的 account_balance 或使用初始資金
  const currentBalance = settings.account_balance ?? capital;
  
  const { error } = await supabase
    .from('user_settings')
    .update({ 
      initial_capital: capital,
      account_balance: currentBalance  // 保持當前餘額不變
    })
    .eq('user_id', session.user.id);
    
  if (!error) {
    setSettings({ 
      initial_capital: capital,
      account_balance: currentBalance 
    });
    setToast('Settings updated successfully');
    setShowSettings(false);
  } else {
    setToast('Failed to update settings');
    console.error(error);
  }
};

const logout = () => { 
  supabase?.auth.signOut(); 
  setSession(null); 
};

  // Get unclaimed achievements
  const getUnclaimedAchievements = () => {
    return ACHIEVEMENTS_CONFIG.filter(ach => {
      const userAch = userAchievements.find(ua => ua.achievement_id === ach.id);
      return userAch && !userAch.claimed;
    });
  };

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

        <div className="sidebar-nav-wrapper">
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
                {id === 'achievements' && unclaimedCount > 0 && (
                  <span className="nav-badge">{unclaimedCount}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="pro-card" onClick={() => setShowSettings(true)} style={{ cursor: 'pointer' }}>
  <div className="pro-icon">{stats ? LEVEL_CONFIG[stats.level - 1]?.icon || '📊' : '📊'}</div>
  <div>
    <strong>Level {stats?.level || 1}</strong>
    <span className="capital-amount">${(settings.account_balance ?? settings.initial_capital).toLocaleString()}</span>
  </div>
  <ChevronDown size={15} />
</div>
          {unclaimedCount > 0 && (
            <div className="unclaimed-banner" onClick={() => setView('achievements')}>
              <Gift size={14} />
              <span>{unclaimedCount} achievement{unclaimedCount > 1 ? 's' : ''} ready to claim!</span>
            </div>
          )}
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
          {view === 'overview' && (
            <Overview
              trades={trades}
              settings={settings}
              stats={stats}
              onAdd={() => { setEditingTrade(null); setShowForm(true); }}
              onViewJournal={() => setView('journal')}
            />
          )}
          {view === 'journal' && (
            <Journal
              trades={trades}
              onAdd={() => { setEditingTrade(null); setShowForm(true); }}
              onEdit={(trade) => { setEditingTrade(trade); setShowForm(true); }}
              onDelete={deleteTrade}
            />
          )}
          {view === 'analytics' && (
            <Analytics
              trades={trades}
              settings={settings}
              stats={stats}
            />
          )}
          {view === 'calendar' && <CalendarView trades={trades} />}
          {view === 'achievements' && (
            <AchievementsView
              trades={trades}
              userAchievements={userAchievements}
              onClaim={claimAchievement}
              claiming={claiming}
            />
          )}
        </div>
      </main>

      {showForm && (
        <TradeForm
          trade={editingTrade}
          onClose={() => { setShowForm(false); setEditingTrade(null); }}
          onSave={saveTrade}
          settings={settings}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={updateSettings}
        />
      )}

      {toast && (
        <div className="toast">
          <ShieldCheck size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}

// ============================================
// AUTH SCREEN
// ============================================

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

// ============================================
// PAGE HEADER
// ============================================

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

// ============================================
// STAT CARD
// ============================================

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

// ============================================
// RANKING DISPLAY
// ============================================

function RankingDisplay({ stats, trades }: { stats: UserStats | null; trades: Trade[] }) {
  if (!stats) return null;

  const levelInfo = LEVEL_CONFIG[stats.level - 1] || LEVEL_CONFIG[0];
  const nextLevel = LEVEL_CONFIG[stats.level] || null;
  const xpProgress = nextLevel ? (stats.total_xp - levelInfo.xpRequired) / (nextLevel.xpRequired - levelInfo.xpRequired) * 100 : 100;
  const xpToNext = nextLevel ? nextLevel.xpRequired - stats.total_xp : 0;

  let bestStreak = 0;
  let streak = 0;
  const sortedTrades = [...trades].sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
  for (const trade of sortedTrades) {
    if (trade.pnl > 0) { streak++; if (streak > bestStreak) bestStreak = streak; }
    else { streak = 0; }
  }

  const unlockedAchievements = stats.achievements || [];
  const totalAchievements = ACHIEVEMENTS_CONFIG.length;

  return (
    <div className="ranking-panel">
      <div className="ranking-header">
        <div className="level-display">
          <div className="level-badge">
            <span className="level-icon">{levelInfo.icon}</span>
            <span className="level-number">{stats.level}</span>
          </div>
          <div className="level-info">
            <h3>{levelInfo.title}</h3>
            <span className="level-xp">{stats.total_xp.toLocaleString()} XP</span>
          </div>
        </div>
        <div className="xp-progress">
          <div className="xp-bar">
            <div className="xp-fill" style={{ width: `${Math.min(100, xpProgress)}%` }} />
          </div>
          <span className="xp-text">
            {nextLevel ? `${xpToNext.toLocaleString()} XP to ${nextLevel.title}` : 'MAX LEVEL'}
          </span>
        </div>
      </div>

      <div className="ranking-stats">
        <div className="ranking-stat">
          <span className="stat-label">Win Rate</span>
          <strong>{stats.total_trades > 0 ? ((stats.winning_trades / stats.total_trades) * 100).toFixed(1) : 0}%</strong>
        </div>
        <div className="ranking-stat">
          <span className="stat-label">Profit Factor</span>
          <strong>{stats.profit_factor.toFixed(2)}</strong>
        </div>
        <div className="ranking-stat">
          <span className="stat-label">Best Streak</span>
          <strong>{bestStreak}🔥</strong>
        </div>
        <div className="ranking-stat">
          <span className="stat-label">Achievements</span>
          <strong>{unlockedAchievements.length}/{totalAchievements}</strong>
        </div>
      </div>

      <div className="ranking-radar">
        <div className="radar-grid">
          {[
            { label: 'Profit', score: stats.profitability_score },
            { label: 'Risk', score: stats.risk_score },
            { label: 'Discipline', score: stats.discipline_score },
            { label: 'Consistency', score: stats.consistency_score },
            { label: 'Experience', score: stats.experience_score },
          ].map((item) => (
            <div className="radar-item" key={item.label}>
              <div className="radar-circle" style={{ '--score': `${item.score}%` } as React.CSSProperties}>
                <span>{item.score}</span>
              </div>
              <label>{item.label}</label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// OVERVIEW
// ============================================

function Overview({ trades, settings, stats, onAdd, onViewJournal }: { trades: Trade[]; settings: UserSettings; stats: UserStats | null; onAdd: () => void; onViewJournal: () => void }) {
  const statsData = useStats(trades, settings);
  const max = Math.max(...statsData.chart.map((item) => Math.abs(item.value)), 1);

  return (
    <>
      <PageHeader 
  eyebrow="MONDAY, JUNE 24, 2024" 
  title="Good morning, trader." 
  description={`Account Balance: $${(settings.account_balance ?? settings.initial_capital).toLocaleString()}`}
  action={<button className="primary-button" onClick={onAdd}><Plus size={17} /> Log a trade</button>} 
/>

      <RankingDisplay stats={stats} trades={trades} />

      <div className="stats-grid">
        <StatCard label="Net P&L" value={money(statsData.net)} change="+12.8%" icon={CircleDollarSign} />
        <StatCard label="Win rate" value={`${statsData.winRate.toFixed(1)}%`} change="+4.6%" icon={Target} tone="blue" />
        <StatCard label="Profit factor" value={statsData.profitFactor.toFixed(2)} change="+0.32" icon={TrendingUp} tone="orange" />
        <StatCard label="Total trades" value={String(trades.length)} change="+8" icon={Activity} tone="pink" />
      </div>

      <div className="dashboard-grid">
        <section className="panel performance-panel">
          <div className="panel-heading">
            <div><h3>Performance overview</h3><span>Equity curve · Last 30 days</span></div>
            <button className="select-button">Last 30 days <ChevronDown size={14} /></button>
          </div>
          <div className="chart-area">
            <div className="y-labels"><span>+$2k</span><span>+$1k</span><span>$0</span><span>-$1k</span></div>
            <div className="chart">
              <div className="grid-line line-1" /><div className="grid-line line-2" />
              <div className="grid-line line-3" /><div className="grid-line line-4" />
              <div className="zero-line" />
              <div className="bars">
                {statsData.chart.map((item, index) => (
                  <div className="bar-wrap" key={index}>
                    <div className={`bar ${item.value < 0 ? 'loss' : ''}`}
                      style={{ height: `${Math.max(8, Math.abs(item.value) / max * 72)}%`, transform: item.value < 0 ? 'translateY(100%)' : undefined }} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="chart-footer">
            <span><i className="legend-dot green" /> Profitable days</span>
            <span><i className="legend-dot red" /> Losing days</span>
            <strong>Net {money(statsData.net)}</strong>
          </div>
        </section>
        <section className="panel setup-panel">
          <div className="panel-heading">
            <div><h3>Setup performance</h3><span>Where your edge comes from</span></div>
            <button className="more-button">•••</button>
          </div>
          {statsData.setups.map((setup) => (
            <div className="setup-row" key={setup.name}>
              <div className="setup-name"><span className="setup-dot" />{setup.name}<small>{setup.count} trades</small></div>
              <strong className={setup.pnl < 0 ? 'negative-text' : ''}>{money(setup.pnl)}</strong>
              <div className="mini-progress"><span style={{ width: `${Math.min(100, Math.max(10, setup.rate))}%` }} /></div>
            </div>
          ))}
          <button className="text-button" onClick={onViewJournal}>View all setups <ArrowUpRight size={15} /></button>
        </section>
      </div>
      <section className="panel recent-panel">
        <div className="panel-heading">
          <div><h3>Recent trades</h3><span>Your latest activity</span></div>
          <button className="text-button" onClick={onViewJournal}>View journal <ArrowUpRight size={15} /></button>
        </div>
        <TradeTable trades={trades.slice(0, 4)} compact />
      </section>
    </>
  );
}

// ============================================
// USE STATS
// ============================================

function useStats(trades: Trade[], settings: UserSettings) {
  const net = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const wins = trades.filter((trade) => trade.pnl > 0).length;
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

  return { net, winRate: trades.length ? wins / trades.length * 100 : 0, chart, setups, profitFactor };
}

// ============================================
// JOURNAL
// ============================================

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

// ============================================
// TRADE TABLE
// ============================================

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

// ============================================
// ANALYTICS
// ============================================

function Analytics({ trades, settings, stats }: { trades: Trade[]; settings: UserSettings; stats: UserStats | null }) {
  const statsData = useStats(trades, settings);
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

      {stats && (
        <div className="analytics-rank-summary">
          <div className="rank-summary-item"><span>Level</span><strong>{stats.level}</strong></div>
          <div className="rank-summary-item"><span>XP</span><strong>{stats.total_xp.toLocaleString()}</strong></div>
          <div className="rank-summary-item">
            <span>Profitability</span>
            <div className="mini-score-bar"><div style={{ width: `${stats.profitability_score}%` }} /></div>
            <strong>{stats.profitability_score}</strong>
          </div>
          <div className="rank-summary-item">
            <span>Risk Management</span>
            <div className="mini-score-bar"><div style={{ width: `${stats.risk_score}%` }} /></div>
            <strong>{stats.risk_score}</strong>
          </div>
          <div className="rank-summary-item">
            <span>Discipline</span>
            <div className="mini-score-bar"><div style={{ width: `${stats.discipline_score}%` }} /></div>
            <strong>{stats.discipline_score}</strong>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <StatCard label="Average winner" value={money(winners.length ? winners.reduce((a, b) => a + b.pnl, 0) / winners.length : 0)} icon={ArrowUpRight} />
        <StatCard label="Average loser" value={money(losers.length ? losers.reduce((a, b) => a + b.pnl, 0) / losers.length : 0)} icon={ArrowDownRight} tone="pink" />
        <StatCard label="Best trade" value={money(Math.max(...trades.map((trade) => trade.pnl), 0))} icon={Zap} tone="orange" />
        <StatCard label="Expectancy" value={money(trades.length ? statsData.net / trades.length : 0)} icon={TrendingUp} tone="blue" />
      </div>

      <div className="analytics-grid">
        <section className="panel">
          <div className="panel-heading">
            <div><h3>Win / loss distribution</h3><span>Outcomes by trade count</span></div>
          </div>
          <div className="distribution">
            <div className="donut" style={{ '--win': `${statsData.winRate}%` } as React.CSSProperties}>
              <div><strong>{statsData.winRate.toFixed(0)}%</strong><span>win rate</span></div>
            </div>
            <div className="distribution-legend">
              <div><i className="legend-dot green" /><span>Winning trades</span><strong>{winners.length}</strong></div>
              <div><i className="legend-dot red" /><span>Losing trades</span><strong>{losers.length}</strong></div>
              <div><i className="legend-dot blue" /><span>Total P&L</span><strong>{money(statsData.net)}</strong></div>
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div><h3>Behavioral scorecard</h3><span>Habits that compound</span></div>
          </div>
          <div className="score-row">
            <div><Target size={16} /> Followed plan</div>
            <strong>{stats?.discipline_score || 0}%</strong>
            <div className="score-bar"><span style={{ width: `${stats?.discipline_score || 0}%` }} /></div>
          </div>
          <div className="score-row">
            <div><ShieldCheck size={16} /> Risk management</div>
            <strong>{stats?.risk_score || 0}%</strong>
            <div className="score-bar"><span style={{ width: `${stats?.risk_score || 0}%` }} /></div>
          </div>
          <div className="score-row">
            <div><TrendingUp size={16} /> Consistency</div>
            <strong>{stats?.consistency_score || 0}%</strong>
            <div className="score-bar"><span style={{ width: `${stats?.consistency_score || 0}%` }} /></div>
          </div>
          <div className="score-row" style={{ borderBottom: 'none', paddingBottom: '4px' }}>
  <div><DollarSign size={16} /> Account balance</div>
  <strong>${(settings.account_balance ?? settings.initial_capital).toLocaleString()}</strong>
  <div className="score-bar"><span style={{ width: '100%' }} /></div>
</div>
        </section>
      </div>
    </>
  );
}

// ============================================
// CALENDAR VIEW
// ============================================

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
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => <span key={day}>{day}</span>)}
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

// ============================================
// ACHIEVEMENTS VIEW
// ============================================

function AchievementsView({
  trades,
  userAchievements,
  onClaim,
  claiming,
}: {
  trades: Trade[];
  userAchievements: UserAchievement[];
  onClaim: (id: string) => void;
  claiming: string | null;
}) {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked' | 'unclaimed'>('all');

  const achievementsWithStatus = ACHIEVEMENTS_CONFIG.map(ach => {
    const userAch = userAchievements.find(ua => ua.achievement_id === ach.id);
    const isUnlocked = !!userAch;
    const isClaimed = userAch?.claimed || false;
    const isUnclaimed = isUnlocked && !isClaimed;
    const isCompleted = ach.requirement(trades);
    // 如果成就已解鎖但尚未領取，保持解鎖狀態
    const isActuallyUnlocked = isUnlocked || isCompleted;

    return {
      ...ach,
      isUnlocked: isActuallyUnlocked,
      isClaimed: isClaimed,
      isUnclaimed: isUnclaimed,
      isCompleted: isCompleted,
    };
  });

  const filteredAchievements = achievementsWithStatus.filter(ach => {
    if (filter === 'all') return true;
    if (filter === 'unlocked') return ach.isUnlocked;
    if (filter === 'locked') return !ach.isUnlocked;
    if (filter === 'unclaimed') return ach.isUnclaimed;
    return true;
  });

  const categories = {
    trades: { label: 'Trading Volume', icon: '📊' },
    pnl: { label: 'Profit & Loss', icon: '💰' },
    streak: { label: 'Streaks', icon: '🔥' },
    risk: { label: 'Risk Management', icon: '🛡️' },
    discipline: { label: 'Discipline', icon: '📝' },
    special: { label: 'Special', icon: '🌟' },
  };

  const totalUnclaimed = achievementsWithStatus.filter(a => a.isUnclaimed).length;

  return (
    <>
      <PageHeader
        eyebrow="ACHIEVEMENTS"
        title="Your Trading Achievements"
        description={`${totalUnclaimed} achievements ready to claim!`}
        action={
          <div className="achievement-stats">
            <span className="achievement-count">
              <Award size={16} />
              {achievementsWithStatus.filter(a => a.isUnlocked).length}/{ACHIEVEMENTS_CONFIG.length}
            </span>
            {totalUnclaimed > 0 && (
              <span className="unclaimed-count">
                <Gift size={14} />
                {totalUnclaimed} to claim
              </span>
            )}
          </div>
        }
      />

      <div className="achievement-filters">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
        <button className={filter === 'unlocked' ? 'active' : ''} onClick={() => setFilter('unlocked')}>Unlocked</button>
        <button className={filter === 'unclaimed' ? 'active' : ''} onClick={() => setFilter('unclaimed')}>
          To Claim {totalUnclaimed > 0 && `(${totalUnclaimed})`}
        </button>
        <button className={filter === 'locked' ? 'active' : ''} onClick={() => setFilter('locked')}>Locked</button>
      </div>

      <div className="achievements-grid">
        {filteredAchievements.map((ach) => (
          <div
            key={ach.id}
            className={`achievement-card ${ach.isUnlocked ? 'unlocked' : 'locked'} ${ach.isUnclaimed ? 'unclaimed' : ''}`}
          >
            <div className="achievement-icon">{ach.icon}</div>
            <div className="achievement-info">
              <div className="achievement-header">
                <h4>{ach.name}</h4>
                <span className="achievement-xp">+{ach.rewardXp} XP</span>
              </div>
              <p>{ach.description}</p>
              <div className="achievement-meta">
                <span className="achievement-category">{categories[ach.category]?.label || ach.category}</span>
                {ach.isUnlocked && ach.isClaimed && <span className="achievement-status claimed">✓ Claimed</span>}
                {ach.isUnclaimed && (
                  <button
                    className="claim-button"
                    onClick={() => onClaim(ach.id)}
                    disabled={claiming === ach.id}
                  >
                    {claiming === ach.id ? 'Claiming...' : 'Claim Reward'}
                  </button>
                )}
                {!ach.isUnlocked && <span className="achievement-status locked">🔒 Locked</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="empty-state">
          <Award size={32} />
          <strong>No achievements found</strong>
          <span>Keep trading to unlock more achievements!</span>
        </div>
      )}
    </>
  );
}

// ============================================
// SETTINGS MODAL
// ============================================

function SettingsModal({ settings, onClose, onSave }: { settings: UserSettings; onClose: () => void; onSave: (capital: number) => void }) {
  const [capital, setCapital] = useState(String(settings.initial_capital || 0));
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedValue = capital.trim();
    if (trimmedValue === '') { setError('Please enter an amount'); return; }
    const value = Number(trimmedValue);
    if (isNaN(value)) { setError('Please enter a valid number'); return; }
    onSave(value);
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
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                  color: '#586675', fontSize: '14px', fontWeight: '600'
                }}>$</span>
                <input
                  type="number" step="any"
                  value={capital}
                  onChange={(e) => { setCapital(e.target.value); setError(''); }}
                  placeholder="10000" required
                  style={{
                    paddingLeft: '28px', width: '100%',
                    border: error ? '1px solid #ee8077' : '1px solid #2c3945',
                    background: '#0f161d', outline: 'none', color: '#e2ebef',
                    borderRadius: '6px', padding: '10px 11px 10px 28px',
                    fontSize: '14px', transition: '0.2s'
                  }}
                />
              </div>
            </label>
            {error && (
              <div style={{
                color: '#ee8077', fontSize: '11px', marginTop: '6px',
                padding: '6px 10px', background: '#3a292c', borderRadius: '4px'
              }}>
                ⚠️ {error}
              </div>
            )}
            <p style={{ color: '#788795', fontSize: '11px', marginTop: '8px', lineHeight: '1.5' }}>
              This will be used to track your overall performance.
            </p>
          </div>
          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button className="primary-button" type="submit">Save settings <ArrowUpRight size={16} /></button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// TRADE FORM
// ============================================

function TradeForm({
  trade,
  onClose,
  onSave,
  settings
}: {
  trade: Trade | null;
  onClose: () => void;
  onSave: (trade: Omit<Trade, 'id' | 'created_at' | 'user_id'>, id?: string) => void;
  settings: UserSettings;
}) {
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
    setup: trade?.setup ?? 'Breakout',
    notes: trade?.notes ?? '',
    tags: trade?.tags.join(', ') ?? '',
    screenshot_url: trade?.screenshot_url ?? ''
  });
  const [uploading, setUploading] = useState(false);

  const calculatePnLPercent = () => {
  const pnlValue = Number(form.pnl);
  // 使用 account_balance 而不是 initial_capital
  const capital = settings.account_balance ?? settings.initial_capital ?? 1000;
  if (!pnlValue || capital === 0) return 0;
  return (pnlValue / capital) * 100;
};

  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `screenshots/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('trade-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('trade-images').getPublicUrl(filePath);
      update('screenshot_url', publicUrl);
      alert('Screenshot uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload screenshot');
    } finally { setUploading(false); }
  };

  const displayPnLPercent = calculatePnLPercent();
  const displayCapital = settings?.initial_capital ?? 1000;

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
      pnl_percent: displayPnLPercent,
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
                <option>Stocks</option><option>Crypto</option><option>Futures</option><option>Forex</option><option>Options</option>
              </select>
            </label>
            <label>Timeframe
              <select value={form.timeframe} onChange={(event) => update('timeframe', event.target.value)}>
                <option>15m</option><option>1H</option><option>4H</option><option>1D</option><option>1W</option>
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
                <option>Breakout</option><option>Pullback</option><option>Reversal</option>
                <option>Opening Range</option><option>Breakdown</option><option>Other</option>
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
          </div>

          <div className={`calculated-result ${displayPnLPercent < 0 ? 'loss' : ''}`}>
            <span>P&L (% of Account)</span>
            <strong>{displayPnLPercent >= 0 ? '+' : ''}{displayPnLPercent.toFixed(2)}%</strong>
            <small>Balance: ${displayCapital.toLocaleString()}</small>
          </div>

          <div className="screenshot-upload">
            <label>Screenshot</label>
            <div className="upload-area">
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} id="screenshot-upload" />
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

export default App;