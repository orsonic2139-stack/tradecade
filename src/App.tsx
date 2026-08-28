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
  Gift, CheckCircle, Lock, AlertCircle, Bell, ListChecks,
  // ✅ 加入 Sun 圖標
  Sun,
  // ✅ 成就圖標
  BarChart,
  Calendar,
  Clock,
  Globe,
  Layers,
  PenTool,
  Gamepad2,
  RefreshCw,
  Hash,
  Rocket,
  Bitcoin,
  Sunrise,
  Coffee,
  Ruler,
  Camera,
} from 'lucide-react';

// ✅ 加入 useTheme
import { useTheme } from './context/ThemeContext';
// ✅ 新增骨架屏導入
import { SkeletonCard, SkeletonStats, SkeletonTable, SkeletonRanking } from './components/Skeleton';

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

type AchievementDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'trades' | 'pnl' | 'streak' | 'risk' | 'discipline' | 'special' | 'monthly' | 'time' | 'market' | 'mindset' | 'fun';
  rewardXp: number;
  isMonthly?: boolean;
  requirement?: (trades: Trade[]) => boolean;
  monthlyRequirement?: (monthlyTrades: Trade[], settings?: UserSettings) => boolean; // ✅ 加入 settings?
};

type LotSizeCalculatorInputs = {
  instrument: string;
  openPrice: number | null;
  stopLossPrice: number | null;
  accountBalance: number;
  riskPercent: number;
  contractSize: number;
};

type LotSizeCalculatorResult = {
  tradeSize: number;
  moneyAtRisk: number;
  riskAmount: number;
  stopLossDistance: number;
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
  { level: 2, title: 'Rookie II', icon: '🥉', xpRequired: 250 },
  { level: 3, title: 'Rookie III', icon: '🥉', xpRequired: 600 },
  { level: 4, title: 'Hunter I', icon: '🎯', xpRequired: 1100 },
  { level: 5, title: 'Hunter II', icon: '🎯', xpRequired: 1750 },
  { level: 6, title: 'Hunter III', icon: '🎯', xpRequired: 2600 },
  { level: 7, title: 'Trader I', icon: '📊', xpRequired: 3700 },
  { level: 8, title: 'Trader II', icon: '📊', xpRequired: 5100 },
  { level: 9, title: 'Trader III', icon: '📊', xpRequired: 6900 },
  { level: 10, title: 'Elite Trader I', icon: '⚡', xpRequired: 9200 },
  { level: 11, title: 'Elite Trader II', icon: '⚡', xpRequired: 12100 },
  { level: 12, title: 'Elite Trader III', icon: '⚡', xpRequired: 15800 },
  { level: 13, title: 'Diamond Hands I', icon: '💎', xpRequired: 20500 },
  { level: 14, title: 'Diamond Hands II', icon: '💎', xpRequired: 26500 },
  { level: 15, title: 'Diamond Hands III', icon: '💎', xpRequired: 34000 },
  { level: 16, title: 'Trading Legend I', icon: '🏆', xpRequired: 43500 },
  { level: 17, title: 'Trading Legend II', icon: '🏆', xpRequired: 55500 },
  { level: 18, title: 'Trading Legend III', icon: '🏆', xpRequired: 70500 },
  { level: 19, title: 'Market Master I', icon: '👑', xpRequired: 89500 },
  { level: 20, title: 'Market Master II', icon: '👑', xpRequired: 113500 },
  { level: 21, title: 'Market Master III', icon: '👑', xpRequired: 143500 },
  { level: 22, title: 'Alpha Hunter I', icon: '🚀', xpRequired: 181500 },
  { level: 23, title: 'Alpha Hunter II', icon: '🚀', xpRequired: 229500 },
  { level: 24, title: 'Alpha Hunter III', icon: '🚀', xpRequired: 290000 },
  { level: 25, title: 'Trading God ⭐', icon: '🌟', xpRequired: 366500 },
  { level: 26, title: 'Trading God ⭐⭐', icon: '🌟', xpRequired: 463000 },
  { level: 27, title: 'Trading God ⭐⭐⭐', icon: '🌟', xpRequired: 585000 },
  { level: 28, title: 'Trading God ∞', icon: '👑🌟', xpRequired: 739000 },
];

// ============================================
// ACHIEVEMENTS HELPERS (必須在 ACHIEVEMENTS_CONFIG 之前)
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
// ✅ 月度相關輔助函數 (必須在 ACHIEVEMENTS_CONFIG 之前)
// ============================================

const getMonthlyTrades = (trades: Trade[]): Trade[] => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return trades.filter(t => new Date(t.trade_date) >= startOfMonth);
};

const isLastDayOfMonth = (): boolean => {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return today.getDate() === lastDay.getDate();
};

const getMonthlyProfitFactor = (trades: Trade[]): number => {
  const totalWins = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
  const totalLosses = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
  return totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
};

const getMonthlyRiskReward = (trades: Trade[]): number => {
  const winners = trades.filter(t => t.pnl > 0);
  const losers = trades.filter(t => t.pnl < 0);
  const avgWin = winners.reduce((sum, t) => sum + t.pnl, 0) / (winners.length || 1);
  const avgLoss = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0)) / (losers.length || 1);
  return avgLoss > 0 ? avgWin / avgLoss : 0;
};

const getMonthlyTotalStopLoss = (trades: Trade[]): number => {
  return trades.reduce((sum, t) => sum + Math.abs(t.stop_loss || 0), 0);
};

const getMonthlyWinRate = (trades: Trade[]): number => {
  if (trades.length === 0) return 0;
  return trades.filter(t => t.pnl > 0).length / trades.length * 100;
};

const getMonthlyNotesRate = (trades: Trade[]): number => {
  if (trades.length === 0) return 0;
  return trades.filter(t => t.notes && t.notes.length > 10).length / trades.length;
};

const getMonthlyScreenshotRate = (trades: Trade[]): number => {
  if (trades.length === 0) return 0;
  return trades.filter(t => t.screenshot_url && t.screenshot_url.length > 0).length / trades.length;
};

const getMonthlyTagRate = (trades: Trade[]): number => {
  if (trades.length === 0) return 0;
  return trades.filter(t => t.tags && t.tags.length > 0).length / trades.length;
};

const getMonthlyMaxStreak = (trades: Trade[]): number => {
  let streak = 0, maxStreak = 0;
  for (const trade of trades) {
    if (trade.pnl > 0) { streak++; if (streak > maxStreak) maxStreak = streak; }
    else { streak = 0; }
  }
  return maxStreak;
};

const getMonthlyAvgWin = (trades: Trade[]): number => {
  const winners = trades.filter(t => t.pnl > 0);
  if (winners.length === 0) return 0;
  return winners.reduce((sum, t) => sum + t.pnl, 0) / winners.length;
};

// ============================================
// ✅ 累計成就輔助函數 (必須在 ACHIEVEMENTS_CONFIG 之前)
// ============================================

const getAvgWin = (trades: Trade[]): number => {
  const winners = trades.filter(t => t.pnl > 0);
  if (winners.length === 0) return 0;
  return winners.reduce((sum, t) => sum + t.pnl, 0) / winners.length;
};

const getMaxDrawdown = (trades: Trade[]): number => {
  if (trades.length === 0) return 0;
  let peak = 0, maxDrawdown = 0;
  let cumulative = 0;
  for (const trade of trades) {
    cumulative += trade.pnl;
    if (cumulative > peak) peak = cumulative;
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  return maxDrawdown;
};

const getTradingSpan = (trades: Trade[]): number => {
  if (trades.length < 2) return 0;
  const dates = trades.map(t => new Date(t.trade_date).getTime());
  const first = Math.min(...dates);
  const last = Math.max(...dates);
  return Math.floor((last - first) / (1000 * 60 * 60 * 24));
};

// ============================================
// ACHIEVEMENTS_CONFIG (108個成就)
// ============================================

const ACHIEVEMENTS_CONFIG: AchievementDef[] = [
  // ============================================
  // 1. 交易數量成就 (12個) - 累計
  // ============================================
  { id: 'first_trade', name: 'First Trade', description: 'Log your first trade', icon: 'Target', category: 'trades', rewardXp: 10, isMonthly: false, requirement: (t) => t.length >= 1 },
  { id: 'five_trades', name: 'Getting Started', description: 'Complete 5 trades', icon: 'BarChart', category: 'trades', rewardXp: 20, isMonthly: false, requirement: (t) => t.length >= 5 },
  { id: 'ten_trades', name: 'Double Digits', description: 'Complete 10 trades', icon: 'TrendingUp', category: 'trades', rewardXp: 30, isMonthly: false, requirement: (t) => t.length >= 10 },
  { id: 'twenty_trades', name: 'Twenty Club', description: 'Complete 20 trades', icon: 'Activity', category: 'trades', rewardXp: 40, isMonthly: false, requirement: (t) => t.length >= 20 },
  { id: 'fifty_trades', name: 'Half Century', description: 'Complete 50 trades', icon: 'Medal', category: 'trades', rewardXp: 60, isMonthly: false, requirement: (t) => t.length >= 50 },
  { id: 'hundred_trades', name: 'Century Club', description: 'Complete 100 trades', icon: 'Star', category: 'trades', rewardXp: 80, isMonthly: false, requirement: (t) => t.length >= 100 },
  { id: 'two_hundred_trades', name: 'Double Century', description: 'Complete 200 trades', icon: 'Flame', category: 'trades', rewardXp: 100, isMonthly: false, requirement: (t) => t.length >= 200 },
  { id: 'five_hundred_trades', name: 'Half Thousand', description: 'Complete 500 trades', icon: 'Gem', category: 'trades', rewardXp: 150, isMonthly: false, requirement: (t) => t.length >= 500 },
  { id: 'thousand_trades', name: 'Thousand Club', description: 'Complete 1000 trades', icon: 'Crown', category: 'trades', rewardXp: 200, isMonthly: false, requirement: (t) => t.length >= 1000 },
  { id: 'daily_trader', name: 'Daily Trader', description: 'Trade on 10 different days', icon: 'CalendarDays', category: 'trades', rewardXp: 25, isMonthly: false, requirement: (t) => new Set(t.map(trade => trade.trade_date)).size >= 10 },
  { id: 'weekly_warrior', name: 'Weekly Warrior', description: 'Trade on 30 different days', icon: 'Calendar', category: 'trades', rewardXp: 50, isMonthly: false, requirement: (t) => new Set(t.map(trade => trade.trade_date)).size >= 30 },
  { id: 'monthly_marathon', name: 'Monthly Marathon', description: 'Trade on 60 different days', icon: 'Calendar', category: 'trades', rewardXp: 80, isMonthly: false, requirement: (t) => new Set(t.map(trade => trade.trade_date)).size >= 60 },

  // ============================================
  // 2. 盈利成就 (9個累計)
  // ============================================
  { id: 'first_profit', name: 'First Profit', description: 'Make your first profitable trade', icon: 'DollarSign', category: 'pnl', rewardXp: 15, isMonthly: false, requirement: (t) => t.some(trade => trade.pnl > 0) },
  { id: 'profit_streak_3', name: '3 Wins in a Row', description: 'Win 3 consecutive trades', icon: 'TrendingUp', category: 'pnl', rewardXp: 20, isMonthly: false, requirement: (t) => hasStreak(t, 3, 'win') },
  { id: 'profit_streak_5', name: 'Hot Streak', description: 'Win 5 consecutive trades', icon: 'Flame', category: 'pnl', rewardXp: 35, isMonthly: false, requirement: (t) => hasStreak(t, 5, 'win') },
  { id: 'profit_streak_8', name: 'On Fire', description: 'Win 8 consecutive trades', icon: 'Zap', category: 'pnl', rewardXp: 50, isMonthly: false, requirement: (t) => hasStreak(t, 8, 'win') },
  { id: 'profit_streak_10', name: 'Unstoppable', description: 'Win 10 consecutive trades', icon: 'Rocket', category: 'pnl', rewardXp: 75, isMonthly: false, requirement: (t) => hasStreak(t, 10, 'win') },
  { id: 'big_winner', name: 'Big Winner', description: 'Make $100+ on a single trade', icon: 'DollarSign', category: 'pnl', rewardXp: 30, isMonthly: false, requirement: (t) => t.some(trade => trade.pnl >= 100) },
  { id: 'huge_winner', name: 'Huge Winner', description: 'Make $500+ on a single trade', icon: 'DollarSign', category: 'pnl', rewardXp: 50, isMonthly: false, requirement: (t) => t.some(trade => trade.pnl >= 500) },
  { id: 'massive_winner', name: 'Massive Winner', description: 'Make $1000+ on a single trade', icon: 'DollarSign', category: 'pnl', rewardXp: 80, isMonthly: false, requirement: (t) => t.some(trade => trade.pnl >= 1000) },
  { id: 'legendary_trade', name: 'Legendary Trade', description: 'Make $5000+ on a single trade', icon: 'Star', category: 'pnl', rewardXp: 150, isMonthly: false, requirement: (t) => t.some(trade => trade.pnl >= 5000) },

  // ============================================
  // 3. 盈利月度成就 (2個)
  // ============================================
  { id: 'monthly_profit_factor_2', name: '2x Monthly Profit Factor', description: 'Monthly profit factor ≥ 2.0 (claim on last day)', icon: 'BarChart', category: 'monthly', rewardXp: 150, isMonthly: true, 
    monthlyRequirement: (m) => m.length >= 5 && getMonthlyProfitFactor(m) >= 2 },
  { id: 'monthly_profit_factor_3', name: '3x Monthly Profit Factor', description: 'Monthly profit factor ≥ 3.0 (claim on last day)', icon: 'Rocket', category: 'monthly', rewardXp: 300, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 5 && getMonthlyProfitFactor(m) >= 3 },

  // ============================================
  // 4. 交易質量成就 (7個) - 累計
  // ============================================
  { id: 'avg_win_50', name: '$50 Average Winner', description: 'Average win ≥ $50 (min 10 trades)', icon: 'TrendingUp', category: 'pnl', rewardXp: 30, isMonthly: false, requirement: (t) => t.length >= 10 && getAvgWin(t) >= 50 },
  { id: 'avg_win_200', name: '$200 Average Winner', description: 'Average win ≥ $200 (min 10 trades)', icon: 'TrendingUp', category: 'pnl', rewardXp: 60, isMonthly: false, requirement: (t) => t.length >= 10 && getAvgWin(t) >= 200 },
  { id: 'avg_win_500', name: '$500 Average Winner', description: 'Average win ≥ $500 (min 10 trades)', icon: 'TrendingUp', category: 'pnl', rewardXp: 100, isMonthly: false, requirement: (t) => t.length >= 10 && getAvgWin(t) >= 500 },

  // ============================================
  // 5. 風險管理成就 (5個累計)
  // ============================================
  { id: 'sl_user', name: 'Risk Manager', description: 'Use stop loss on 30%+ of trades', icon: 'Shield', category: 'risk', rewardXp: 20, isMonthly: false, requirement: (t) => getSLRate(t) >= 0.3 },
  { id: 'sl_pro', name: 'SL Pro', description: 'Use stop loss on 50%+ of trades', icon: 'Shield', category: 'risk', rewardXp: 35, isMonthly: false, requirement: (t) => getSLRate(t) >= 0.5 },
  { id: 'sl_master', name: 'SL Master', description: 'Use stop loss on 70%+ of trades', icon: 'Shield', category: 'risk', rewardXp: 50, isMonthly: false, requirement: (t) => getSLRate(t) >= 0.7 },
  { id: 'always_protected', name: 'Always Protected', description: 'Use stop loss on 90%+ of trades', icon: 'ShieldCheck', category: 'risk', rewardXp: 80, isMonthly: false, requirement: (t) => getSLRate(t) >= 0.9 },
  { id: 'perfect_risk', name: 'Perfect Risk', description: 'Use stop loss on 100% of trades (min 10 trades)', icon: 'Gem', category: 'risk', rewardXp: 120, isMonthly: false, requirement: (t) => getSLRate(t) >= 1.0 && t.length >= 10 },

  // ============================================
  // 6. 風險管理月度成就 (8個)
  // ============================================
  { id: 'monthly_risk_reward_2', name: '2:1 Monthly Risk-Reward', description: 'Monthly risk-reward ≥ 2.0 (claim on last day)', icon: 'TrendingUp', category: 'monthly', rewardXp: 120, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 5 && getMonthlyRiskReward(m) >= 2 },
  { id: 'monthly_risk_reward_3', name: '3:1 Monthly Risk-Reward', description: 'Monthly risk-reward ≥ 3.0 (claim on last day)', icon: 'Rocket', category: 'monthly', rewardXp: 200, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 5 && getMonthlyRiskReward(m) >= 3 },
  { id: 'monthly_risk_reward_5', name: '5:1 Monthly Risk-Reward', description: 'Monthly risk-reward ≥ 5.0 (claim on last day)', icon: 'Star', category: 'monthly', rewardXp: 350, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 5 && getMonthlyRiskReward(m) >= 5 },
  { id: 'monthly_sl_1000', name: 'Stop Loss < $1000', description: 'Monthly total stop loss < $1000 (claim on last day)', icon: 'Shield', category: 'monthly', rewardXp: 80, isMonthly: true,
    monthlyRequirement: (m) => getMonthlyTotalStopLoss(m) < 1000 },
  { id: 'monthly_sl_800', name: 'Stop Loss < $800', description: 'Monthly total stop loss < $800 (claim on last day)', icon: 'Shield', category: 'monthly', rewardXp: 120, isMonthly: true,
    monthlyRequirement: (m) => getMonthlyTotalStopLoss(m) < 800 },
  { id: 'monthly_sl_500', name: 'Stop Loss < $500', description: 'Monthly total stop loss < $500 (claim on last day)', icon: 'Gem', category: 'monthly', rewardXp: 180, isMonthly: true,
    monthlyRequirement: (m) => getMonthlyTotalStopLoss(m) < 500 },
  { id: 'monthly_sl_250', name: 'Stop Loss < $250', description: 'Monthly total stop loss < $250 (claim on last day)', icon: 'Gem', category: 'monthly', rewardXp: 250, isMonthly: true,
    monthlyRequirement: (m) => getMonthlyTotalStopLoss(m) < 250 },
  { id: 'monthly_sl_100', name: 'Stop Loss < $100', description: 'Monthly total stop loss < $100 (claim on last day)', icon: 'Crown', category: 'monthly', rewardXp: 400, isMonthly: true,
    monthlyRequirement: (m) => getMonthlyTotalStopLoss(m) < 100 },
    
  // ============================================
  // 風險管理累計成就 (3個)
  // ============================================
  { id: 'max_drawdown_10', name: 'Drawdown < 10%', description: 'Maximum drawdown < 10% (min 10 trades)', icon: 'TrendingDown', category: 'risk', rewardXp: 50, isMonthly: false, requirement: (t) => t.length >= 10 && getMaxDrawdown(t) < 10 },
  { id: 'max_drawdown_5', name: 'Drawdown < 5%', description: 'Maximum drawdown < 5% (min 10 trades)', icon: 'TrendingDown', category: 'risk', rewardXp: 100, isMonthly: false, requirement: (t) => t.length >= 10 && getMaxDrawdown(t) < 5 },
  { id: 'max_drawdown_2', name: 'Drawdown < 2%', description: 'Maximum drawdown < 2% (min 10 trades)', icon: 'Gem', category: 'risk', rewardXp: 200, isMonthly: false, requirement: (t) => t.length >= 10 && getMaxDrawdown(t) < 2 },

  // ============================================
  // 7. 紀律成就 (8個月度)
  // ============================================
  { id: 'monthly_journal_keeper', name: 'Journal Keeper', description: 'Monthly 50%+ trades with notes (claim on last day)', icon: 'BookOpen', category: 'discipline', rewardXp: 100, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 3 && getMonthlyNotesRate(m) >= 0.5 },
  { id: 'monthly_journal_pro', name: 'Journal Pro', description: 'Monthly 70%+ trades with notes (claim on last day)', icon: 'BookOpen', category: 'discipline', rewardXp: 180, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 5 && getMonthlyNotesRate(m) >= 0.7 },
  { id: 'monthly_journal_master', name: 'Journal Master', description: 'Monthly 90%+ trades with notes (claim on last day)', icon: 'BookOpen', category: 'discipline', rewardXp: 300, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 8 && getMonthlyNotesRate(m) >= 0.9 },
  { id: 'monthly_screenshot_user', name: 'Screenshot User', description: 'Monthly 30%+ trades with screenshots (claim on last day)', icon: 'Camera', category: 'discipline', rewardXp: 100, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 3 && getMonthlyScreenshotRate(m) >= 0.3 },
  { id: 'monthly_screenshot_pro', name: 'Screenshot Pro', description: 'Monthly 50%+ trades with screenshots (claim on last day)', icon: 'Camera', category: 'discipline', rewardXp: 180, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 5 && getMonthlyScreenshotRate(m) >= 0.5 },
  { id: 'monthly_screenshot_master', name: 'Screenshot Master', description: 'Monthly 70%+ trades with screenshots (claim on last day)', icon: 'Camera', category: 'discipline', rewardXp: 300, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 8 && getMonthlyScreenshotRate(m) >= 0.7 },
  { id: 'monthly_tag_user', name: 'Tag User', description: 'Monthly 50%+ trades with tags (claim on last day)', icon: 'Hash', category: 'discipline', rewardXp: 100, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 3 && getMonthlyTagRate(m) >= 0.5 },
  { id: 'monthly_tag_master', name: 'Tag Master', description: 'Monthly 80%+ trades with tags (claim on last day)', icon: 'Hash', category: 'discipline', rewardXp: 200, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 5 && getMonthlyTagRate(m) >= 0.8 },

  // ============================================
  // 8. 特殊成就 (12個)
  // ============================================
  { id: 'million_dollar', name: 'Million Dollar Club', description: 'Reach $100,000+ total P&L', icon: 'Gem', category: 'special', rewardXp: 200, isMonthly: false, requirement: (t) => getTotalPnL(t) >= 100000 },
  { id: 'negative_emotion', name: 'Lesson Learned', description: 'Have a losing streak of 5+ trades', icon: 'TrendingDown', category: 'special', rewardXp: 20, isMonthly: false, requirement: (t) => hasStreak(t, 5, 'loss') },
  { id: 'bounce_back', name: 'Bounce Back', description: 'Recover from 5+ losing streak with 5+ wins', icon: 'RefreshCw', category: 'special', rewardXp: 40, isMonthly: false, requirement: (t) => hasBounceBack(t) },
  { id: 'diverse_trader', name: 'Diverse Trader', description: 'Trade 5+ different symbols', icon: 'Globe', category: 'special', rewardXp: 25, isMonthly: false, requirement: (t) => new Set(t.map(trade => trade.symbol)).size >= 5 },
  { id: 'market_explorer', name: 'Market Explorer', description: 'Trade 3+ different markets', icon: 'Globe', category: 'special', rewardXp: 30, isMonthly: false, requirement: (t) => new Set(t.map(trade => trade.market)).size >= 3 },
  { id: 'timeframe_expert', name: 'Timeframe Expert', description: 'Trade 4+ different timeframes', icon: 'Clock3', category: 'special', rewardXp: 30, isMonthly: false, requirement: (t) => new Set(t.map(trade => trade.timeframe)).size >= 4 },
  { id: 'setup_master', name: 'Setup Master', description: 'Trade 5+ different setups', icon: 'Layers', category: 'special', rewardXp: 30, isMonthly: false, requirement: (t) => new Set(t.map(trade => trade.setup)).size >= 5 },
  { id: 'monthly_win_rate_50', name: '50% Monthly Win Rate', description: 'Monthly 10+ trades, 50%+ win rate (claim on last day)', icon: 'Target', category: 'special', rewardXp: 150, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 10 && getMonthlyWinRate(m) >= 50 },
  { id: 'monthly_win_rate_60', name: '60% Monthly Win Rate', description: 'Monthly 10+ trades, 60%+ win rate (claim on last day)', icon: 'Target', category: 'special', rewardXp: 250, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 10 && getMonthlyWinRate(m) >= 60 },
  { id: 'monthly_win_rate_70', name: 'Sharpshooter', description: 'Monthly 10+ trades, 70%+ win rate (claim on last day)', icon: 'Target', category: 'special', rewardXp: 400, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 10 && getMonthlyWinRate(m) >= 70 },
  { id: 'monthly_win_rate_80', name: 'Elite Sharpshooter', description: 'Monthly 10+ trades, 80%+ win rate (claim on last day)', icon: 'Target', category: 'special', rewardXp: 600, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 10 && getMonthlyWinRate(m) >= 80 },
  { id: 'perfect_month', name: 'Perfect Month', description: 'Monthly 10+ trades, 100% win rate', icon: 'Calendar', category: 'special', rewardXp: 800, isMonthly: false, 
    requirement: (t) => { const m = getMonthlyTrades(t); return m.length >= 10 && m.every(trade => trade.pnl > 0); } },

  // ============================================
  // 9. 月份系列 (8個)
  // ============================================
  { id: 'monthly_trading_days_10', name: '10-Day Trader', description: 'Trade on 10+ days this month (claim on last day)', icon: 'Calendar', category: 'monthly', rewardXp: 100, isMonthly: true,
    monthlyRequirement: (m) => new Set(m.map(t => t.trade_date)).size >= 10 },
  { id: 'monthly_trading_days_15', name: '15-Day Trader', description: 'Trade on 15+ days this month (claim on last day)', icon: 'Calendar', category: 'monthly', rewardXp: 180, isMonthly: true,
    monthlyRequirement: (m) => new Set(m.map(t => t.trade_date)).size >= 15 },
  { id: 'monthly_trading_days_20', name: '20-Day Trader', description: 'Trade on 20+ days this month (claim on last day)', icon: 'Calendar', category: 'monthly', rewardXp: 300, isMonthly: true,
    monthlyRequirement: (m) => new Set(m.map(t => t.trade_date)).size >= 20 },
  { id: 'monthly_max_streak_5', name: '5-Win Monthly Streak', description: 'Monthly max win streak ≥ 5 (claim on last day)', icon: 'Flame', category: 'monthly', rewardXp: 120, isMonthly: true,
    monthlyRequirement: (m) => getMonthlyMaxStreak(m) >= 5 },
  { id: 'monthly_max_streak_8', name: '8-Win Monthly Streak', description: 'Monthly max win streak ≥ 8 (claim on last day)', icon: 'Flame', category: 'monthly', rewardXp: 250, isMonthly: true,
    monthlyRequirement: (m) => getMonthlyMaxStreak(m) >= 8 },
  { id: 'monthly_max_streak_10', name: '10-Win Monthly Streak', description: 'Monthly max win streak ≥ 10 (claim on last day)', icon: 'Zap', category: 'monthly', rewardXp: 400, isMonthly: true,
    monthlyRequirement: (m) => getMonthlyMaxStreak(m) >= 10 },
  { id: 'monthly_avg_win_100', name: '$100 Avg Monthly Win', description: 'Monthly average win ≥ $100 (claim on last day)', icon: 'DollarSign', category: 'monthly', rewardXp: 150, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 5 && getMonthlyAvgWin(m) >= 100 },
  { id: 'monthly_avg_win_500', name: '$500 Avg Monthly Win', description: 'Monthly average win ≥ $500 (claim on last day)', icon: 'DollarSign', category: 'monthly', rewardXp: 350, isMonthly: true,
    monthlyRequirement: (m) => m.length >= 5 && getMonthlyAvgWin(m) >= 500 },

  // ============================================
  // 10. 時間系列 (6個) - 累計
  // ============================================
  { id: 'two_weeks_trading', name: '2-Week Trader', description: 'Trading span ≥ 14 days', icon: 'Calendar', category: 'time', rewardXp: 20, isMonthly: false, requirement: (t) => getTradingSpan(t) >= 14 },
  { id: 'one_month_trading', name: '1-Month Trader', description: 'Trading span ≥ 30 days', icon: 'Calendar', category: 'time', rewardXp: 40, isMonthly: false, requirement: (t) => getTradingSpan(t) >= 30 },
  { id: 'three_months_trading', name: '3-Month Trader', description: 'Trading span ≥ 90 days', icon: 'Calendar', category: 'time', rewardXp: 60, isMonthly: false, requirement: (t) => getTradingSpan(t) >= 90 },
  { id: 'six_months_trading', name: '6-Month Trader', description: 'Trading span ≥ 180 days', icon: 'Calendar', category: 'time', rewardXp: 100, isMonthly: false, requirement: (t) => getTradingSpan(t) >= 180 },
  { id: 'one_year_trading', name: '1-Year Trader', description: 'Trading span ≥ 365 days', icon: 'Calendar', category: 'time', rewardXp: 150, isMonthly: false, requirement: (t) => getTradingSpan(t) >= 365 },
  { id: 'two_years_trading', name: '2-Year Trader', description: 'Trading span ≥ 730 days', icon: 'Calendar', category: 'time', rewardXp: 250, isMonthly: false, requirement: (t) => getTradingSpan(t) >= 730 },

  // ============================================
  // 11. 市場系列 (8個) - 累計
  // ============================================
  { id: 'stock_specialist', name: 'Stock Specialist', description: '20+ stock trades', icon: 'TrendingUp', category: 'market', rewardXp: 30, isMonthly: false, requirement: (t) => t.filter(trade => trade.market === 'Stocks').length >= 20 },
  { id: 'crypto_specialist', name: 'Crypto Specialist', description: '20+ crypto trades', icon: 'Bitcoin', category: 'market', rewardXp: 30, isMonthly: false, requirement: (t) => t.filter(trade => trade.market === 'Crypto').length >= 20 },
  { id: 'futures_specialist', name: 'Futures Specialist', description: '20+ futures trades', icon: 'BarChart', category: 'market', rewardXp: 30, isMonthly: false, requirement: (t) => t.filter(trade => trade.market === 'Futures').length >= 20 },
  { id: 'forex_specialist', name: 'Forex Specialist', description: '20+ forex trades', icon: 'DollarSign', category: 'market', rewardXp: 30, isMonthly: false, requirement: (t) => t.filter(trade => trade.market === 'Forex').length >= 20 },
  { id: 'options_specialist', name: 'Options Specialist', description: '20+ options trades', icon: 'ListChecks', category: 'market', rewardXp: 30, isMonthly: false, requirement: (t) => t.filter(trade => trade.market === 'Options').length >= 20 },
  { id: 'market_all_rounder', name: 'Market All-Rounder', description: 'Trade all 5 markets', icon: 'Globe', category: 'market', rewardXp: 80, isMonthly: false, requirement: (t) => new Set(t.map(trade => trade.market)).size >= 5 },
  { id: 'symbol_10', name: '10-Symbol Trader', description: 'Trade 10+ different symbols', icon: 'Hash', category: 'market', rewardXp: 40, isMonthly: false, requirement: (t) => new Set(t.map(trade => trade.symbol)).size >= 10 },
  { id: 'symbol_25', name: '25-Symbol Trader', description: 'Trade 25+ different symbols', icon: 'Hash', category: 'market', rewardXp: 80, isMonthly: false, requirement: (t) => new Set(t.map(trade => trade.symbol)).size >= 25 },

  // ============================================
  // 12. 心態系列 (9個)
  // ============================================
  { id: 'no_red_day', name: 'No Red Day', description: '5 consecutive trading days without loss', icon: 'Shield', category: 'mindset', rewardXp: 60, isMonthly: false, 
    requirement: (t) => { const sorted = [...t].sort((a,b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()); let streak=0; for(const trade of sorted){ if(trade.pnl > 0){ streak++; if(streak>=5) return true; } else { streak=0; } } return false; } },
  { id: 'no_red_week', name: 'No Red Week', description: '2 consecutive weeks without losing day', icon: 'Shield', category: 'mindset', rewardXp: 120, isMonthly: false,
    requirement: (t) => { const sorted = [...t].sort((a,b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()); let streak=0; for(const trade of sorted){ if(trade.pnl > 0){ streak++; if(streak>=10) return true; } else { streak=0; } } return false; } },
  { id: 'revenge_trader', name: 'Revenge Trader', description: 'Trade within 30 minutes after a loss', icon: 'AlertCircle', category: 'mindset', rewardXp: 20, isMonthly: false,
    requirement: (t) => { for(let i=1; i<t.length; i++){ if(t[i].pnl < 0 && t[i-1].pnl < 0){ const diff = new Date(t[i].trade_date).getTime() - new Date(t[i-1].trade_date).getTime(); if(diff <= 1800000) return true; } } return false; } },
  { id: 'patient_trader', name: 'Patient Trader', description: 'Wait 2+ hours before next trade', icon: 'Clock', category: 'mindset', rewardXp: 30, isMonthly: false,
    requirement: (t) => { for(let i=1; i<t.length; i++){ const diff = new Date(t[i].trade_date).getTime() - new Date(t[i-1].trade_date).getTime(); if(diff >= 7200000) return true; } return false; } },
  { id: 'consistent_size', name: 'Consistent Size', description: '90%+ trades use same lot size', icon: 'Ruler', category: 'mindset', rewardXp: 40, isMonthly: false,
    requirement: (t) => { if(t.length < 10) return false; const sizes = t.map(trade => trade.lot_size); const mostCommon = sizes.sort((a,b) => sizes.filter(v => v===a).length - sizes.filter(v => v===b).length).pop(); return sizes.filter(s => s === mostCommon).length / sizes.length >= 0.9; } },
  { id: 'early_bird', name: 'Early Bird', description: '20+ trades within 1 hour of market open', icon: 'Sunrise', category: 'mindset', rewardXp: 50, isMonthly: false,
    requirement: (t) => t.length >= 20 },

  // ============================================
  // 13. 特殊趣味系列 (12個)
  // ============================================
  { id: 'monday_trader', name: 'Monday Trader', description: '10+ Monday trades', icon: 'Calendar', category: 'fun', rewardXp: 20, isMonthly: false, requirement: (t) => t.filter(trade => new Date(trade.trade_date).getDay() === 1).length >= 10 },
  { id: 'friday_trader', name: 'Friday Trader', description: '10+ Friday trades', icon: 'Calendar', category: 'fun', rewardXp: 20, isMonthly: false, requirement: (t) => t.filter(trade => new Date(trade.trade_date).getDay() === 5).length >= 10 },
  { id: 'weekend_warrior', name: 'Weekend Warrior', description: '5+ weekend trades', icon: 'Gamepad2', category: 'fun', rewardXp: 25, isMonthly: false, requirement: (t) => t.filter(trade => { const d = new Date(trade.trade_date); return d.getDay() === 0 || d.getDay() === 6; }).length >= 5 },
  { id: 'night_owl', name: 'Night Owl', description: '10+ after-hours trades', icon: 'Moon', category: 'fun', rewardXp: 30, isMonthly: false, requirement: (t) => t.length >= 10 },
  { id: 'pre_market', name: 'Pre-Market Pro', description: '10+ pre-market trades', icon: 'Sunrise', category: 'fun', rewardXp: 30, isMonthly: false, requirement: (t) => t.length >= 10 },
  { id: 'lunch_break', name: 'Lunch Break Trader', description: '10+ lunch time trades', icon: 'Coffee', category: 'fun', rewardXp: 20, isMonthly: false, requirement: (t) => t.length >= 10 },
  { id: 'golden_hour', name: 'Golden Hour', description: '20+ trades in open/close 30 min', icon: 'Clock', category: 'fun', rewardXp: 40, isMonthly: false, requirement: (t) => t.length >= 20 },
  { id: 'trend_follower', name: 'Trend Follower', description: '30+ trend following trades', icon: 'TrendingUp', category: 'fun', rewardXp: 40, isMonthly: false, requirement: (t) => t.filter(trade => trade.setup === 'Breakout' || trade.setup === 'Breakdown').length >= 30 },
  { id: 'counter_trend', name: 'Counter-Trend', description: '30+ counter-trend trades', icon: 'TrendingDown', category: 'fun', rewardXp: 40, isMonthly: false, requirement: (t) => t.filter(trade => trade.setup === 'Reversal').length >= 30 },
  { id: 'breakout_trader', name: 'Breakout Trader', description: '30+ breakout trades', icon: 'Rocket', category: 'fun', rewardXp: 40, isMonthly: false, requirement: (t) => t.filter(trade => trade.setup === 'Breakout').length >= 30 },
  { id: 'reversal_trader', name: 'Reversal Trader', description: '30+ reversal trades', icon: 'RefreshCw', category: 'fun', rewardXp: 40, isMonthly: false, requirement: (t) => t.filter(trade => trade.setup === 'Reversal').length >= 30 },
  { id: 'scalper', name: 'Scalper', description: '30+ 15m timeframe trades', icon: 'Zap', category: 'fun', rewardXp: 50, isMonthly: false, requirement: (t) => t.filter(trade => trade.timeframe === '15m').length >= 30 },
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
// R:R 計算函數
// ============================================

const calculateRR = (trade: Trade): string => {
  const { entry_price, exit_price, stop_loss, side } = trade;
  
  // 如果沒有停損，回傳 "N/A"
  if (!stop_loss || stop_loss === 0) return 'N/A';
  
  let risk: number;
  let reward: number;
  
  if (side === 'Long') {
    risk = entry_price - stop_loss;
    reward = exit_price - entry_price;
  } else {
    risk = stop_loss - entry_price;
    reward = entry_price - exit_price;
  }
  
  // 防止除以零或負數
  if (risk <= 0) return 'N/A';
  
  const ratio = reward / risk;
  return `1:${ratio.toFixed(2)}`;
};

// ============================================
// APP COMPONENT
// ============================================

function App() {
  const { theme, toggleTheme } = useTheme();
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
  const [showCalculator, setShowCalculator] = useState(false);
const [isLoading, setIsLoading] = useState(true);

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

// ✅ 當 trades 或 stats 加載完成後，關閉 loading
useEffect(() => {
  if (trades.length > 0 || stats) {
    setIsLoading(false);
  }
}, [trades, stats]);

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

  const calculateLevel = (xp: number): number => {
    if (xp >= 739000) return 28;
    if (xp >= 585000) return 27;
    if (xp >= 463000) return 26;
    if (xp >= 366500) return 25;
    if (xp >= 290000) return 24;
    if (xp >= 229500) return 23;
    if (xp >= 181500) return 22;
    if (xp >= 143500) return 21;
    if (xp >= 113500) return 20;
    if (xp >= 89500) return 19;
    if (xp >= 70500) return 18;
    if (xp >= 55500) return 17;
    if (xp >= 43500) return 16;
    if (xp >= 34000) return 15;
    if (xp >= 26500) return 14;
    if (xp >= 20500) return 13;
    if (xp >= 15800) return 12;
    if (xp >= 12100) return 11;
    if (xp >= 9200) return 10;
    if (xp >= 6900) return 9;
    if (xp >= 5100) return 8;
    if (xp >= 3700) return 7;
    if (xp >= 2600) return 6;
    if (xp >= 1750) return 5;
    if (xp >= 1100) return 4;
    if (xp >= 600) return 3;
    if (xp >= 250) return 2;
    return 1;
  };

  const checkAndUnlockAchievements = async (userId: string, currentTrades: Trade[]) => {
    if (!supabase) return;

    try {
      const { data: existingAchievements } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId);

      const existingMap = new Map(
        existingAchievements?.map(a => [a.achievement_id, a]) || []
      );

      const monthlyTrades = getMonthlyTrades(currentTrades);
      const isLastDay = isLastDayOfMonth();

      const toInsert: { user_id: string; achievement_id: string; claimed: boolean }[] = [];
      const toDelete: string[] = [];

      for (const ach of ACHIEVEMENTS_CONFIG) {
        let isConditionMet = false;

        if (ach.isMonthly) {
  // 月度成就：只有當月最後一天才檢查，傳入 settings
  if (isLastDay && ach.monthlyRequirement) {
    isConditionMet = ach.monthlyRequirement(monthlyTrades, settings);
  }
} else {
  // 累計成就：需要有交易才能檢查
  if (currentTrades.length === 0) {
    isConditionMet = false;
  } else if (ach.requirement) {
    isConditionMet = ach.requirement(currentTrades);
  }
}

        const existing = existingMap.get(ach.id);

        if (isConditionMet) {
          if (!existing) {
            toInsert.push({
              user_id: userId,
              achievement_id: ach.id,
              claimed: false,
            });
          }
        } else {
          if (existing) {
            toDelete.push(existing.id);
          }
        }
      }

      if (toDelete.length > 0) {
        console.log(`🔒 Removing ${toDelete.length} achievements (no longer meet conditions)`);
        
        const { data: deletedAchs } = await supabase
          .from('user_achievements')
          .select('achievement_id, claimed')
          .in('id', toDelete);

        let xpToDeduct = 0;
        if (deletedAchs) {
          for (const ach of deletedAchs) {
            if (ach.claimed) {
              const config = ACHIEVEMENTS_CONFIG.find(a => a.id === ach.achievement_id);
              if (config) {
                xpToDeduct += config.rewardXp;
              }
            }
          }
        }

        await supabase
          .from('user_achievements')
          .delete()
          .in('id', toDelete);

        if (xpToDeduct > 0) {
          const { data: currentStats } = await supabase
            .from('user_stats')
            .select('total_xp, claimed_xp')
            .eq('user_id', userId)
            .maybeSingle();

          if (currentStats) {
            const newTotalXp = Math.max(0, (currentStats.total_xp || 0) - xpToDeduct);
            const newClaimedXp = Math.max(0, (currentStats.claimed_xp || 0) - xpToDeduct);
            const newLevel = calculateLevel(newTotalXp);

            await supabase
              .from('user_stats')
              .update({
                total_xp: newTotalXp,
                claimed_xp: newClaimedXp,
                level: newLevel,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId);

            console.log(`➖ Deducted ${xpToDeduct} XP for removed achievements`);
          }
        }
      }

      if (toInsert.length > 0) {
        console.log(`🎯 Unlocked ${toInsert.length} new achievements!`, toInsert.map(a => a.achievement_id));
        
        await supabase
          .from('user_achievements')
          .insert(toInsert);

        const { data: unclaimedData } = await supabase
          .from('user_achievements')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('claimed', false);

        await supabase
          .from('user_stats')
          .update({ 
            unclaimed_achievements: unclaimedData?.length || 0
          })
          .eq('user_id', userId);
        
        setToast(`🎉 ${toInsert.length} new achievement${toInsert.length > 1 ? 's' : ''} unlocked!`);
      }

      if (toInsert.length === 0 && toDelete.length === 0) {
        const { data: unclaimedData } = await supabase
          .from('user_achievements')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('claimed', false);

        await supabase
          .from('user_stats')
          .update({ 
            unclaimed_achievements: unclaimedData?.length || 0
          })
          .eq('user_id', userId);
      }

    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  };

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

    setTimeout(async () => {
      if (session) {
        const { data: latestTrades } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', session.user.id)
          .order('trade_date', { ascending: false });
        
        if (latestTrades) {
          setTrades(latestTrades as Trade[]);
          await checkAndUnlockAchievements(session.user.id, latestTrades as Trade[]);
        }
        
        const { data: statsData } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (statsData) setStats(statsData as UserStats);
        
        const { data: achData } = await supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', session.user.id);
        
        if (achData) setUserAchievements(achData as UserAchievement[]);
      }
    }, 800);
  };

  const deleteTrade = async (id: string) => {
    if (!supabase) return;
    
    const { data: tradeToDelete } = await supabase
      .from('trades')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();
    
    if (!tradeToDelete) {
      setToast('Trade not found');
      return;
    }
    
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', id);
      
    if (error) { 
      setToast('Could not delete this trade.'); 
      console.error(error);
      return; 
    }
    
    setTrades((current) => current.filter((item) => item.id !== id)); 
    setToast('Trade removed');
    
    setTimeout(async () => {
      if (session) {
        const { data: latestTrades } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', session.user.id)
          .order('trade_date', { ascending: false });
        
        if (latestTrades) {
          setTrades(latestTrades as Trade[]);
          await checkAndUnlockAchievements(session.user.id, latestTrades as Trade[]);
        }
        
        const { data: statsData } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (statsData) {
          setStats(statsData as UserStats);
        } else {
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
        
        const { data: achData } = await supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', session.user.id);
        
        if (achData) setUserAchievements(achData as UserAchievement[]);
      }
    }, 1000);
  };

  const claimAchievement = async (achievementId: string) => {
    if (!supabase || !session) return;
    setClaiming(achievementId);

    try {
      const { error: updateError } = await supabase
        .from('user_achievements')
        .update({ 
          claimed: true, 
          claimed_at: new Date().toISOString() 
        })
        .eq('user_id', session.user.id)
        .eq('achievement_id', achievementId);

      if (updateError) throw updateError;

      const ach = ACHIEVEMENTS_CONFIG.find(a => a.id === achievementId);
      
      if (ach) {
        const { data: currentStats } = await supabase
          .from('user_stats')
          .select('total_xp, claimed_xp, level')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (currentStats) {
          const newTotalXp = (currentStats.total_xp || 0) + ach.rewardXp;
          const newClaimedXp = (currentStats.claimed_xp || 0) + ach.rewardXp;
          const newLevel = calculateLevel(newTotalXp);
          
          await supabase
            .from('user_stats')
            .update({
              total_xp: newTotalXp,
              claimed_xp: newClaimedXp,
              level: newLevel,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', session.user.id);
          
          const { data: unclaimedData } = await supabase
            .from('user_achievements')
            .select('id', { count: 'exact' })
            .eq('user_id', session.user.id)
            .eq('claimed', false);

          const unclaimedCount = unclaimedData?.length || 0;

          await supabase
            .from('user_stats')
            .update({ 
              unclaimed_achievements: unclaimedCount
            })
            .eq('user_id', session.user.id);
          
          setToast(`🎉 +${ach.rewardXp} XP claimed for "${ach.name}"!`);
        }
      } else {
        setToast('Achievement claimed!');
      }

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
    
    const currentBalance = settings.account_balance ?? capital;
    
    const { error } = await supabase
      .from('user_settings')
      .update({ 
        initial_capital: capital,
        account_balance: currentBalance
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
                  <span className="nav-achievement-badge">
                    ({unclaimedCount})
                  </span>
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

  {/* ✅ Lot Size Calculator 入口 */}
  <button 
    className="nav-item" 
    onClick={() => setShowCalculator(!showCalculator)}
  >
    <span style={{ fontSize: '18px' }}>📐</span>
    <span>Lot Size Calculator</span>
    <ChevronDown size={14} style={{ marginLeft: 'auto' }} />
  </button>

  {showCalculator && (
    <div className="sidebar-calculator">
      <LotSizeCalculator accountBalance={settings.account_balance ?? settings.initial_capital} />
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
  <button className="icon-button" onClick={toggleTheme}>
    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
  </button>
  <button className="notification"><span /></button>
  <div className="avatar small">{initials(email)}</div>
</div>
        </header>

        <div className="page-content">
          {view === 'overview' && (
  isLoading ? (
    <div className="page-content">
      <SkeletonRanking />
      <SkeletonStats />
      <div className="dashboard-grid">
        <SkeletonCard count={2} />
      </div>
      <SkeletonTable rows={3} />
    </div>
  ) : (
    <Overview
      trades={trades}
      settings={settings}
      stats={stats}
      onAdd={() => { setEditingTrade(null); setShowForm(true); }}
      onViewJournal={() => setView('journal')}
    />
  )
)}
          {view === 'journal' && (
  isLoading ? (
    <div className="page-content">
      <SkeletonTable rows={8} />
    </div>
  ) : (
    <Journal
      trades={trades}
      onAdd={() => { setEditingTrade(null); setShowForm(true); }}
      onEdit={(trade) => { setEditingTrade(trade); setShowForm(true); }}
      onDelete={deleteTrade}
    />
  )
)}
          {view === 'analytics' && (
  isLoading ? (
    <div className="page-content">
      <SkeletonStats />
      <div className="analytics-grid">
        <SkeletonCard count={2} />
      </div>
    </div>
  ) : (
    <Analytics
      trades={trades}
      settings={settings}
      stats={stats}
    />
  )
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
  <div className={`toast ${toast.includes('🎉') ? 'toast-success' : toast.includes('⚠️') ? 'toast-warning' : 'toast-info'}`}>
    <span className="toast-icon">
      {toast.includes('🎉') ? '🎉' : toast.includes('⚠️') ? '⚠️' : 'ℹ️'}
    </span>
    <span className="toast-message">{toast.replace(/[🎉⚠️ℹ️]/g, '').trim()}</span>
    <button className="toast-close" onClick={() => setToast('')}>✕</button>
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
  
  const currentLevelXp = levelInfo.xpRequired;
  const nextLevelXp = nextLevel ? nextLevel.xpRequired : levelInfo.xpRequired;
  const xpEarnedInLevel = stats.total_xp - currentLevelXp;
  const xpNeededForLevel = nextLevel ? nextLevelXp - currentLevelXp : 1;
  const xpProgress = nextLevel ? (xpEarnedInLevel / xpNeededForLevel) * 100 : 100;
  const xpRemaining = nextLevel ? nextLevelXp - stats.total_xp : 0;

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
          <div className="xp-text">
            {nextLevel ? (
              <>
                <div className="xp-text-row">
                  {stats.total_xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
                </div>
                <div className="xp-text-row xp-remaining">
                  {xpRemaining.toLocaleString()} XP more to {nextLevel.title}
                </div>
              </>
            ) : (
              <div className="xp-text-row">👑 MAX LEVEL</div>
            )}
          </div>
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
        <StatCard label="Profit factor" value={statsData.profitFactor === Infinity ? '∞' : statsData.profitFactor.toFixed(2)} change="+0.32" icon={TrendingUp} tone="orange" />
        <StatCard label="Total trades" value={String(trades.length)} change="+8" icon={Activity} tone="pink" />
      </div>

      <div className="dashboard-grid">
        <section className="panel performance-panel">
          <div className="panel-heading">
            <div><h3>Performance overview</h3><span>Equity curve · Last 30 days</span></div>
            <button className="select-button">Last 30 days <ChevronDown size={14} /></button>
          </div>
          
          {/* ✅ Dual Color Line Chart */}
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
              
              <svg className="chart-svg" viewBox="0 0 500 180" preserveAspectRatio="xMidYMid meet">
                {statsData.chart.length > 0 && (
                  <>
                    {(() => {
                      const points = statsData.chart.map((item, index) => {
                        const x = 30 + (index / (statsData.chart.length - 1 || 1)) * 440;
                        const y = 90 - (item.value / Math.max(max, 1)) * 70;
                        return { x, y, value: item.value };
                      });
                      
                      // 分離綠色和紅色線段
                      let greenSegments: string[] = [];
                      let redSegments: string[] = [];
                      let currentColor: 'green' | 'red' | null = null;
                      let currentPoints: { x: number; y: number }[] = [];
                      
                      for (let i = 0; i < points.length; i++) {
                        const p = points[i];
                        const isGreen = p.value >= 0;
                        const color = isGreen ? 'green' : 'red';
                        
                        if (currentColor !== color && currentPoints.length > 0) {
                          if (currentColor === 'green') {
                            greenSegments.push(currentPoints.map(p => `${p.x},${p.y}`).join(' '));
                          } else if (currentColor === 'red') {
                            redSegments.push(currentPoints.map(p => `${p.x},${p.y}`).join(' '));
                          }
                          currentPoints = [];
                        }
                        currentColor = color;
                        currentPoints.push(p);
                      }
                      
                      if (currentPoints.length > 0) {
                        if (currentColor === 'green') {
                          greenSegments.push(currentPoints.map(p => `${p.x},${p.y}`).join(' '));
                        } else if (currentColor === 'red') {
                          redSegments.push(currentPoints.map(p => `${p.x},${p.y}`).join(' '));
                        }
                      }
                      
                      if (points.length === 1) {
                        const p = points[0];
                        return <circle cx={p.x} cy={p.y} r="4" fill={p.value >= 0 ? '#2bc99a' : '#e8756d'} />;
                      }
                      
                      return (
                        <>
                          {/* 綠色線條（獲利） */}
                          {greenSegments.map((d, i) => (
                            <polyline 
                              key={`g-${i}`} 
                              points={d} 
                              fill="none" 
                              stroke="#2bc99a" 
                              strokeWidth="2.5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />
                          ))}
                          {/* 紅色線條（虧損） */}
                          {redSegments.map((d, i) => (
                            <polyline 
                              key={`r-${i}`} 
                              points={d} 
                              fill="none" 
                              stroke="#e8756d" 
                              strokeWidth="2.5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />
                          ))}
                          {/* 端點圓點 */}
                          {points.map((p, i) => (
                            <circle 
                              key={`dot-${i}`} 
                              cx={p.x} 
                              cy={p.y} 
                              r="3.5" 
                              fill={p.value >= 0 ? '#2bc99a' : '#e8756d'} 
                            />
                          ))}
                        </>
                      );
                    })()}
                  </>
                )}
              </svg>
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
  
  // ✅ 修正 Profit Factor 計算
  let profitFactor = 0;
  if (trades.length === 0) {
    profitFactor = 0;
  } else if (totalLosses === 0) {
    profitFactor = Infinity; // 沒有虧損時顯示無限大
  } else {
    profitFactor = totalWins / totalLosses;
  }

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
            <th>R:R</th>
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
              <td className="price-cell" style={{ color: '#48d9a9', fontWeight: 600 }}>
                {calculateRR(trade)}
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
// CALENDAR VIEW (完整功能版)
// ============================================

function CalendarView({ trades }: { trades: Trade[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayTrades, setSelectedDayTrades] = useState<Trade[]>([]);

  // 獲取當前月份的天數
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // 獲取月份第一天是星期幾 (0=Sunday, 1=Monday, ...)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  // 切換月份
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
    setSelectedDayTrades([]);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
    setSelectedDayTrades([]);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
    setSelectedDayTrades([]);
  };

  // 格式化日期為 YYYY-MM-DD
  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // 點擊日期
  const handleDateClick = (dateStr: string) => {
    const dayTrades = trades.filter(t => t.trade_date === dateStr);
    if (dayTrades.length > 0) {
      setSelectedDate(dateStr);
      setSelectedDayTrades(dayTrades);
    } else {
      setSelectedDate(null);
      setSelectedDayTrades([]);
    }
  };

  // 按交易日期分組
  const byDate = useMemo(() => {
    return trades.reduce<Record<string, Trade[]>>((result, trade) => {
      (result[trade.trade_date] ??= []).push(trade);
      return result;
    }, {});
  }, [trades]);

  // 檢查某天是否有交易
  const hasTrades = (dateStr: string) => {
    return byDate[dateStr] && byDate[dateStr].length > 0;
  };

  // 獲取某天的 P&L
  const getDayPnL = (dateStr: string) => {
    if (!byDate[dateStr]) return 0;
    return byDate[dateStr].reduce((sum, trade) => sum + trade.pnl, 0);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  // 月份名稱
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // 統計當月數據
  const monthlyPnL = trades
    .filter(t => {
      const d = new Date(t.trade_date);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .reduce((sum, t) => sum + t.pnl, 0);

  const monthlyTrades = trades.filter(t => {
    const d = new Date(t.trade_date);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;

  const monthlyWins = trades.filter(t => {
    const d = new Date(t.trade_date);
    return d.getMonth() === month && d.getFullYear() === year && t.pnl > 0;
  }).length;

  const monthlyWinRate = monthlyTrades > 0 ? (monthlyWins / monthlyTrades * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow="CONSISTENCY"
        title="Trading calendar"
        description="See your rhythm, one session at a time."
        action={
          <div className="calendar-actions">
            <button className="select-button" onClick={goToToday}>
              Today
            </button>
          </div>
        }
      />

      {/* 月份統計 */}
      <div className="calendar-stats">
        <div className="calendar-stat">
          <span>Month P&L</span>
          <strong className={monthlyPnL >= 0 ? 'positive-text' : 'negative-text'}>
            {money(monthlyPnL)}
          </strong>
        </div>
        <div className="calendar-stat">
          <span>Trades</span>
          <strong>{monthlyTrades}</strong>
        </div>
        <div className="calendar-stat">
          <span>Win Rate</span>
          <strong>{monthlyWinRate.toFixed(1)}%</strong>
        </div>
        <div className="calendar-stat">
          <span>Wins / Losses</span>
          <strong>{monthlyWins} / {monthlyTrades - monthlyWins}</strong>
        </div>
      </div>

      <section className="panel calendar-panel">
        {/* 月份導航 */}
        <div className="calendar-nav">
          <button className="calendar-nav-btn" onClick={prevMonth}>
            ‹
          </button>
          <span className="calendar-nav-title">
            {monthNames[month]} {year}
          </span>
          <button className="calendar-nav-btn" onClick={nextMonth}>
            ›
          </button>
        </div>

        {/* 星期標題 */}
        <div className="calendar-weekdays">
          {weekDays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        {/* 日期格線 */}
        <div className="calendar-grid">
          {/* 空白填充 */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div className="calendar-day empty" key={`empty-${i}`} />
          ))}

          {/* 日期 */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dateStr = formatDate(year, month, day);
            const dayHasTrades = hasTrades(dateStr);
            const dayPnL = dayHasTrades ? getDayPnL(dateStr) : 0;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dayTrades = byDate[dateStr] || [];

            return (
              <div
                key={day}
                className={`calendar-day 
                  ${dayHasTrades ? dayPnL >= 0 ? 'positive' : 'negative' : ''} 
                  ${isToday ? 'today' : ''} 
                  ${isSelected ? 'selected' : ''}
                  ${dayHasTrades ? 'clickable' : ''}
                `}
                onClick={() => dayHasTrades && handleDateClick(dateStr)}
              >
                <span className="calendar-day-number">{day}</span>
                {dayHasTrades && (
                  <>
                    <strong className={dayPnL >= 0 ? 'positive-text' : 'negative-text'}>
                      {money(dayPnL)}
                    </strong>
                    <small>{dayTrades.length} trade{dayTrades.length > 1 ? 's' : ''}</small>
                  </>
                )}
                {isToday && <span className="today-dot" />}
              </div>
            );
          })}
        </div>
      </section>

      {/* 選中日期的交易詳情 */}
      {selectedDate && selectedDayTrades.length > 0 && (
        <section className="panel calendar-detail-panel">
          <div className="panel-heading">
            <div>
              <h3>📅 {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</h3>
              <span>{selectedDayTrades.length} trades on this day</span>
            </div>
            <button className="text-button" onClick={() => {
              setSelectedDate(null);
              setSelectedDayTrades([]);
            }}>
              Close ✕
            </button>
          </div>
          <TradeTable trades={selectedDayTrades} compact />
        </section>
      )}
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
  const [claimingAll, setClaimingAll] = useState(false);

  const achievementsWithStatus = ACHIEVEMENTS_CONFIG.map(ach => {
    const userAch = userAchievements.find(ua => ua.achievement_id === ach.id);
    const isUnlocked = !!userAch;
    const isClaimed = userAch?.claimed || false;
    const isUnclaimed = isUnlocked && !isClaimed;
    const isCompleted = ach.requirement ? ach.requirement(trades) : false;
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

  const categories: Record<string, { label: string; icon: string }> = {
    trades: { label: 'Trading Volume', icon: '📊' },
    pnl: { label: 'Profit & Loss', icon: '💰' },
    streak: { label: 'Streaks', icon: '🔥' },
    risk: { label: 'Risk Management', icon: '🛡️' },
    discipline: { label: 'Discipline', icon: '📝' },
    special: { label: 'Special', icon: '🌟' },
    monthly: { label: 'Monthly', icon: '📆' },
    time: { label: 'Time', icon: '⏰' },
    market: { label: 'Market', icon: '🌍' },
    mindset: { label: 'Mindset', icon: '🧠' },
    fun: { label: 'Fun', icon: '🎮' },
  };

  const totalUnclaimed = achievementsWithStatus.filter(a => a.isUnclaimed).length;
  const totalUnlocked = achievementsWithStatus.filter(a => a.isUnlocked).length;

  const handleClaimAll = async () => {
    if (claimingAll) return;
    setClaimingAll(true);
    
    const unclaimedAchievements = achievementsWithStatus.filter(a => a.isUnclaimed);
    
    for (const ach of unclaimedAchievements) {
      await onClaim(ach.id);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setClaimingAll(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="ACHIEVEMENTS"
        title="Your Trading Achievements"
        description="Complete challenges to earn XP and level up!"
        action={
          <div className="achievement-stats">
            <span className="achievement-count">
              <Award size={16} />
              <span className="count-number">{totalUnlocked}</span> / {ACHIEVEMENTS_CONFIG.length}
            </span>
            {totalUnclaimed > 0 && (
              <span className="unclaimed-count-badge">
                <span className="gift-icon">🎁</span>
                {totalUnclaimed} New Achievement{totalUnclaimed > 1 ? 's' : ''} Ready!
              </span>
            )}
          </div>
        }
      />

      <div className="achievement-filters">
        <div className="filter-left">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
          <button className={filter === 'unlocked' ? 'active' : ''} onClick={() => setFilter('unlocked')}>
            Unlocked ({totalUnlocked})
          </button>
          <button className={filter === 'unclaimed' ? 'active' : ''} onClick={() => setFilter('unclaimed')}>
            🎁 Ready to Claim ({totalUnclaimed})
          </button>
          <button className={filter === 'locked' ? 'active' : ''} onClick={() => setFilter('locked')}>
            Locked ({ACHIEVEMENTS_CONFIG.length - totalUnlocked})
          </button>
        </div>
        {totalUnclaimed > 0 && (
          <button 
            className="claim-all-button"
            onClick={handleClaimAll}
            disabled={claimingAll}
          >
            {claimingAll ? '⏳ Claiming...' : '🎯 Claim All'}
          </button>
        )}
      </div>

      <div className="achievements-grid">
        {filteredAchievements.map((ach) => (
          <div
            key={ach.id}
            className={`achievement-card ${ach.isUnlocked ? 'unlocked' : 'locked'} ${ach.isUnclaimed ? 'unclaimed' : ''}`}
          >
            <div className="achievement-icon">
  {(() => {
    const iconMap: Record<string, React.ElementType> = {
  Target: Target,
  BarChart: BarChart,
  TrendingUp: TrendingUp,
  Flame: Flame,
  Shield: Shield,
  PenTool: PenTool,
  Layers: Layers,
  Calendar: Calendar,
  Clock: Clock,
  Globe: Globe,
  Brain: Brain,
  Gamepad2: Gamepad2,
  Award: Award,
  DollarSign: DollarSign,
  TrendingDown: TrendingDown,
  RefreshCw: RefreshCw,
  Hash: Hash,
  Rocket: Rocket,
  Crown: Crown,
  Gem: Gem,
  Medal: Medal,
  Star: Star,
  Zap: Zap,
  Activity: Activity,
  BookOpen: BookOpen,
  CalendarDays: CalendarDays,
  Clock3: Clock3,
  LayoutDashboard: LayoutDashboard,
  LogOut: LogOut,
  Menu: Menu,
  Moon: Moon,
  Plus: Plus,
  Search: Search,
  Settings: Settings,
  ShieldCheck: ShieldCheck,
  SlidersHorizontal: SlidersHorizontal,
  Sparkles: Sparkles,
  X: X,
  Upload: Upload,
  GitBranch: GitBranch,
  Gift: Gift,
  CheckCircle: CheckCircle,
  Lock: Lock,
  AlertCircle: AlertCircle,
  Bell: Bell,
  ListChecks: ListChecks,
  Bitcoin: Bitcoin,
  Sunrise: Sunrise,
  Coffee: Coffee,
  Ruler: Ruler,
  Camera: Camera,
};
    const IconComponent = iconMap[ach.icon] || AwardIcon;
    return <IconComponent size={24} strokeWidth={1.5} />;
  })()}
</div>
            <div className="achievement-info">
              <div className="achievement-header">
                <h4>
                  {ach.name}
                  {ach.isUnclaimed && <span className="unclaimed-badge">Ready to Claim!</span>}
                </h4>
                <span className="achievement-xp">+{ach.rewardXp} XP</span>
              </div>
              <p>{ach.description}</p>
              <div className="achievement-meta">
                <span className="achievement-category-tag">
                  {categories[ach.category]?.icon} {categories[ach.category]?.label || ach.category}
                </span>
                {ach.isUnlocked && ach.isClaimed && (
                  <span className="achievement-status claimed">✅ Claimed</span>
                )}
                {ach.isUnclaimed && (
                  <button
                    className="claim-button"
                    onClick={() => onClaim(ach.id)}
                    disabled={claiming === ach.id || claimingAll}
                  >
                    {claiming === ach.id ? '⏳ Claiming...' : '🎯 Claim Reward'}
                  </button>
                )}
                {!ach.isUnlocked && (
                  <span className="achievement-status locked">🔒 Locked</span>
                )}
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
// LOT SIZE CALCULATOR
// ============================================

function LotSizeCalculator({ accountBalance }: { accountBalance: number }) {
  const [instrument, setInstrument] = useState('EURUSD');
  const [openPrice, setOpenPrice] = useState<string>('');
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [riskPercent, setRiskPercent] = useState<string>('1');
  const [result, setResult] = useState<LotSizeCalculatorResult | null>(null);
  const [error, setError] = useState('');

  const contractSize = 100;

  const calculate = () => {
    setError('');
    
    const open = parseFloat(openPrice);
    const sl = parseFloat(stopLossPrice);
    const risk = parseFloat(riskPercent);
    const balance = accountBalance;

    if (!open || open <= 0) {
      setError('Please enter a valid Open Price');
      return;
    }
    if (!sl || sl <= 0) {
      setError('Please enter a valid Stop Loss Price');
      return;
    }
    if (sl === open) {
      setError('Stop Loss cannot be equal to Entry Price');
      return;
    }
    if (!risk || risk <= 0) {
      setError('Please enter a valid Risk %');
      return;
    }
    if (balance <= 0) {
      setError('Account Balance is not available');
      return;
    }

    // 計算停損距離（絕對值）
    const slDistance = Math.abs(open - sl);
    
    // 計算風險金額
    const riskAmount = balance * (risk / 100);
    
    // 計算 Trade Size (Lots)
    // Trade Size = Risk Amount / (Stop Loss Distance × Contract Size)
    const tradeSize = riskAmount / (slDistance * contractSize);
    
    // Money At Risk = Risk Amount
    const moneyAtRisk = riskAmount;

    setResult({
      tradeSize: tradeSize,
      moneyAtRisk: moneyAtRisk,
      riskAmount: riskAmount,
      stopLossDistance: slDistance,
    });
  };

  // 預設按鈕
  const presetRisks = [0.5, 1, 1.5, 2, 3];

  return (
    <div className="lot-size-calculator">
      <div className="calculator-header">
        <div className="calculator-icon">📐</div>
        <div>
          <h3>Lot Size Calculator</h3>
          <span>Calculate position size based on risk</span>
        </div>
      </div>

      <div className="calculator-grid">
        <div className="calculator-field">
          <label>Instrument (Pair)</label>
          <select value={instrument} onChange={(e) => setInstrument(e.target.value)}>
            <option value="EURUSD">EUR/USD</option>
            <option value="GBPUSD">GBP/USD</option>
            <option value="USDJPY">USD/JPY</option>
            <option value="AUDUSD">AUD/USD</option>
            <option value="USDCAD">USD/CAD</option>
            <option value="NZDUSD">NZD/USD</option>
            <option value="USDCHF">USD/CHF</option>
            <option value="XAUUSD">XAU/USD (Gold)</option>
            <option value="BTCUSD">BTC/USD</option>
            <option value="ETHUSD">ETH/USD</option>
            <option value="ES">S&P 500 (ES)</option>
            <option value="NQ">Nasdaq (NQ)</option>
            <option value="CL">Crude Oil (CL)</option>
          </select>
        </div>

        <div className="calculator-field">
          <label>Open Price (Entry)</label>
          <input
            type="number"
            step="any"
            value={openPrice}
            onChange={(e) => setOpenPrice(e.target.value)}
            placeholder="e.g. 1.1000"
          />
        </div>

        <div className="calculator-field">
          <label>Stop Loss Price</label>
          <input
            type="number"
            step="any"
            value={stopLossPrice}
            onChange={(e) => setStopLossPrice(e.target.value)}
            placeholder="e.g. 1.0950"
          />
        </div>

        <div className="calculator-field">
          <label>Account Balance</label>
          <input
            type="text"
            value={`$${accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            disabled
            className="balance-display"
          />
        </div>

        <div className="calculator-field">
          <label>Risk (% of Account)</label>
          <div className="risk-input-group">
            <input
              type="number"
              step="0.1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
              placeholder="1"
            />
            <span className="risk-percent-sign">%</span>
          </div>
          <div className="preset-risks">
            {presetRisks.map((r) => (
              <button
                key={r}
                className={`preset-btn ${parseFloat(riskPercent) === r ? 'active' : ''}`}
                onClick={() => setRiskPercent(String(r))}
              >
                {r}%
              </button>
            ))}
          </div>
        </div>

        <div className="calculator-field">
          <label>Contract Size</label>
          <input
            type="text"
            value="100,000"
            disabled
            className="balance-display"
          />
        </div>
      </div>

      {error && <div className="calculator-error">{error}</div>}

      <button className="calculate-btn" onClick={calculate}>
        <span>📊</span> Calculate
      </button>

      {result && (
        <div className="calculator-result">
          <div className="result-row">
            <span className="result-label">Trade Size (Lots)</span>
            <span className="result-value highlight">
              {result.tradeSize.toFixed(2)} lots
            </span>
          </div>
          <div className="result-row">
            <span className="result-label">Money At Risk</span>
            <span className={`result-value ${result.moneyAtRisk > 0 ? 'positive' : ''}`}>
              ${result.moneyAtRisk.toFixed(2)}
            </span>
          </div>
          <div className="result-row">
            <span className="result-label">Stop Loss Distance</span>
            <span className="result-value">
              {result.stopLossDistance.toFixed(4)} pips
            </span>
          </div>
          <div className="result-row">
            <span className="result-label">Risk Amount</span>
            <span className={`result-value ${result.riskAmount > 0 ? 'positive' : ''}`}>
              ${result.riskAmount.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
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