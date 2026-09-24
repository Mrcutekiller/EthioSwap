import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase';

const fmt = (n, d = 2) => (+(n ?? 0)).toFixed(d);
const fmtK = (n) => n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;

// ─── Default Prop Firms & Plans Preset (Fallback & Seeding) ──────────────────
const DEFAULT_PROP_FIRMS = [
  {
    id: 'ftmo-firm',
    name: 'FTMO',
    logo_url: null,
    rating: 4.8,
    review_count: 48200,
    accepts_ethiopians: true,
    country: 'Czech Republic',
    website: 'https://ftmo.com',
    description: "The world's most prestigious prop trading firm. Known for fair rules, 80-90% profit splits, and fast bi-weekly payouts. Trusted by 200,000+ traders globally including Ethiopians.",
    plans: [
      { id: 'ftmo-10k', plan_name: '$10,000 Challenge', account_size_usd: 10000, price_usd: 155, evaluation_type: '2-Step Challenge', phase_1_target: '10%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 10, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: false, features: ['No time limit on challenge', 'Bi-weekly crypto payouts', 'Refundable fee upon 1st payout'] },
      { id: 'ftmo-25k', plan_name: '$25,000 Challenge', account_size_usd: 25000, price_usd: 250, evaluation_type: '2-Step Challenge', phase_1_target: '10%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 10, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: false, features: ['No time limit', 'Free trial available', 'MetaTrader 4 & 5 support'] },
      { id: 'ftmo-50k', plan_name: '$50,000 Challenge', account_size_usd: 50000, price_usd: 345, evaluation_type: '2-Step Challenge', phase_1_target: '10%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 10, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: true, features: ['Most popular tier', 'Scaling plan up to $2M', 'Bi-weekly payouts'] },
      { id: 'ftmo-100k', plan_name: '$100,000 Challenge', account_size_usd: 100000, price_usd: 540, evaluation_type: '2-Step Challenge', phase_1_target: '10%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 10, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: true, features: ['Pro trader choice', '90% profit split on scaling', 'Full crypto payout'] },
      { id: 'ftmo-200k', plan_name: '$200,000 Challenge', account_size_usd: 200000, price_usd: 1080, evaluation_type: '2-Step Challenge', phase_1_target: '10%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 10, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: false, features: ['Maximum capital', 'Dedicated account manager', 'Premium conditions'] },
    ]
  },
  {
    id: 'the5ers-firm',
    name: 'The5ers',
    logo_url: null,
    rating: 4.7,
    review_count: 18900,
    accepts_ethiopians: true,
    country: 'Israel',
    website: 'https://the5ers.com',
    description: 'Instant funding and hyper-growth scaling plans. Accepts Ethiopian traders with flexible challenge rules and a proven track record of reliable payouts.',
    plans: [
      { id: '5ers-5k', plan_name: '$5,000 Bootcamp', account_size_usd: 5000, price_usd: 95, evaluation_type: '3-Step Bootcamp', phase_1_target: '6%', phase_2_target: '6%', profit_split_percent: 80, profit_target_percent: 6, max_daily_loss_percent: 4, max_total_loss_percent: 8, leverage: '1:30', is_popular: false, features: ['Low entry barrier', 'Double account every 10%', 'Webinar support'] },
      { id: '5ers-20k', plan_name: '$20,000 High Stakes', account_size_usd: 20000, price_usd: 165, evaluation_type: '2-Step Challenge', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: true, features: ['Instant evaluation', '80% profit split', 'Crypto payouts'] },
      { id: '5ers-60k', plan_name: '$60,000 High Stakes', account_size_usd: 60000, price_usd: 395, evaluation_type: '2-Step Challenge', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: true, features: ['Scale to $4M', 'Fast track to profit', 'No time limits'] },
      { id: '5ers-100k', plan_name: '$100,000 High Stakes', account_size_usd: 100000, price_usd: 495, evaluation_type: '2-Step Challenge', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: false, features: ['Maximum capital', 'Direct VIP support', 'Bi-weekly payouts'] },
    ]
  },
  {
    id: 'funding-pips-firm',
    name: 'Funding Pips',
    logo_url: null,
    rating: 4.5,
    review_count: 7600,
    accepts_ethiopians: true,
    country: 'UAE',
    website: 'https://fundingpips.com',
    description: 'Extremely popular in East Africa due to ultra-affordable challenge fees, 5-day payout cycle, and generous profit split up to 90%.',
    plans: [
      { id: 'fp-5k', plan_name: '$5,000 Evaluation', account_size_usd: 5000, price_usd: 32, evaluation_type: '2-Step Evaluation', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 85, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: false, features: ['Lowest cost challenge', '5-day payout cycle', 'Zero commission'] },
      { id: 'fp-10k', plan_name: '$10,000 Evaluation', account_size_usd: 10000, price_usd: 60, evaluation_type: '2-Step Evaluation', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 85, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: true, features: ['Best value for beginners', '85% profit split', 'Raw spreads'] },
      { id: 'fp-25k', plan_name: '$25,000 Evaluation', account_size_usd: 25000, price_usd: 139, evaluation_type: '2-Step Evaluation', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 85, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: false, features: ['Fast scaling plan', 'Trade news allowed', 'Weekend holding'] },
      { id: 'fp-50k', plan_name: '$50,000 Evaluation', account_size_usd: 50000, price_usd: 239, evaluation_type: '2-Step Evaluation', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 85, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: true, features: ['90% profit split on scale', 'No minimum trading days', 'Crypto withdrawal'] },
      { id: 'fp-100k', plan_name: '$100,000 Evaluation', account_size_usd: 100000, price_usd: 399, evaluation_type: '2-Step Evaluation', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 85, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: false, features: ['Pro conditions', 'VIP support group', 'Scale to $2M'] },
    ]
  },
  {
    id: 'funded-next-firm',
    name: 'Funded Next',
    logo_url: null,
    rating: 4.6,
    review_count: 14000,
    accepts_ethiopians: true,
    country: 'UAE',
    website: 'https://fundednext.com',
    description: 'Fastest-growing prop firm in the world with guaranteed payout promises and a unique 15% profit share even during challenge evaluation phases.',
    plans: [
      { id: 'fn-15k', plan_name: '$15,000 Stellar 2-Step', account_size_usd: 15000, price_usd: 119, evaluation_type: '2-Step Stellar Challenge', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 85, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: false, features: ['15% share during challenge', 'Guaranteed payout in 24h', 'Swap-free available'] },
      { id: 'fn-25k', plan_name: '$25,000 Stellar 2-Step', account_size_usd: 25000, price_usd: 199, evaluation_type: '2-Step Stellar Challenge', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 85, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: true, features: ['No minimum trading days', '85% to 90% split', 'MetaTrader & cTrader'] },
      { id: 'fn-50k', plan_name: '$50,000 Stellar 2-Step', account_size_usd: 50000, price_usd: 299, evaluation_type: '2-Step Stellar Challenge', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 85, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: true, features: ['Bi-weekly payouts', 'Free repeat on profit', 'News trading allowed'] },
      { id: 'fn-100k', plan_name: '$100,000 Stellar 2-Step', account_size_usd: 100000, price_usd: 519, evaluation_type: '2-Step Stellar Challenge', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 85, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: false, features: ['Top institutional tier', 'Instant certificate', 'Priority payout'] },
    ]
  },
  {
    id: 'topstep-firm',
    name: 'Topstep',
    logo_url: null,
    rating: 4.5,
    review_count: 22000,
    accepts_ethiopians: true,
    country: 'United States',
    website: 'https://topstep.com',
    description: 'US-based futures prop firm. Premier choice for traders wanting CME/NYMEX futures contracts (ES, NQ, CL). Accepts international traders including Ethiopia.',
    plans: [
      { id: 'ts-50k', plan_name: '$50,000 Trading Combine', account_size_usd: 50000, price_usd: 49, evaluation_type: 'Futures Combine (1-Step)', phase_1_target: '6%', phase_2_target: 'None (Direct Funded)', profit_split_percent: 90, profit_target_percent: 6, max_daily_loss_percent: 2, max_total_loss_percent: 4, leverage: 'Futures 5 contracts', is_popular: true, features: ['100% of first $10K profit', '90% thereafter', 'Daily payout requests'] },
      { id: 'ts-100k', plan_name: '$100,000 Trading Combine', account_size_usd: 100000, price_usd: 99, evaluation_type: 'Futures Combine (1-Step)', phase_1_target: '6%', phase_2_target: 'None (Direct Funded)', profit_split_percent: 90, profit_target_percent: 6, max_daily_loss_percent: 2, max_total_loss_percent: 4, leverage: 'Futures 10 contracts', is_popular: true, features: ['Trade Nasdaq & S&P', 'NinjaTrader & TradingView', 'Coaching sessions'] },
      { id: 'ts-150k', plan_name: '$150,000 Trading Combine', account_size_usd: 150000, price_usd: 149, evaluation_type: 'Futures Combine (1-Step)', phase_1_target: '6%', phase_2_target: 'None (Direct Funded)', profit_split_percent: 90, profit_target_percent: 6, max_daily_loss_percent: 2, max_total_loss_percent: 4, leverage: 'Futures 15 contracts', is_popular: false, features: ['Maximum contracts', 'VIP Discord channel', 'Fast-track payouts'] },
    ]
  },
  {
    id: 'e8-firm',
    name: 'E8 Funding',
    logo_url: null,
    rating: 4.4,
    review_count: 9800,
    accepts_ethiopians: true,
    country: 'United Kingdom',
    website: 'https://e8funding.com',
    description: 'High-tech prop firm with custom trader dashboard, flexible challenge conditions, up to 80% profit split, and scaling to $1M+.',
    plans: [
      { id: 'e8-25k', plan_name: '$25,000 E8 Challenge', account_size_usd: 25000, price_usd: 198, evaluation_type: '2-Step Challenge', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 8, leverage: '1:100', is_popular: false, features: ['8% Phase 1 target', '5% Phase 2 target', 'Crypto payments'] },
      { id: 'e8-50k', plan_name: '$50,000 E8 Challenge', account_size_usd: 50000, price_usd: 288, evaluation_type: '2-Step Challenge', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 8, leverage: '1:100', is_popular: true, features: ['Custom E8X dashboard', 'Scale up to $1M', 'Fast evaluation'] },
      { id: 'e8-100k', plan_name: '$100,000 E8 Challenge', account_size_usd: 100000, price_usd: 488, evaluation_type: '2-Step Challenge', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 8, leverage: '1:100', is_popular: false, features: ['Bi-weekly payout', 'Zero commission on FX', 'Weekend holding'] },
    ]
  },
  {
    id: 'funderpro-firm',
    name: 'FunderPro',
    logo_url: null,
    rating: 4.3,
    review_count: 6700,
    accepts_ethiopians: true,
    country: 'Malta',
    website: 'https://funderpro.com',
    description: 'Real funded capital via tier-1 liquidity providers. Offers unlimited trading days and instant funded options with direct crypto payouts.',
    plans: [
      { id: 'fpr-25k', plan_name: '$25,000 Regular', account_size_usd: 25000, price_usd: 199, evaluation_type: '2-Step Evaluation', phase_1_target: '10%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 10, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: false, features: ['Unlimited days', 'Trade on MT5', 'Weekly payouts'] },
      { id: 'fpr-50k', plan_name: '$50,000 Regular', account_size_usd: 50000, price_usd: 349, evaluation_type: '2-Step Evaluation', phase_1_target: '10%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 10, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: true, features: ['Trade crypto on weekends', 'No consistency rule', '80% profit split'] },
      { id: 'fpr-100k', plan_name: '$100,000 Regular', account_size_usd: 100000, price_usd: 549, evaluation_type: '2-Step Evaluation', phase_1_target: '10%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 10, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: false, features: ['Real STP liquidity', 'Fast onboarding', 'Refundable fee'] },
    ]
  },
  {
    id: 'alpha-firm',
    name: 'Alpha Capital Group',
    logo_url: null,
    rating: 4.2,
    review_count: 5400,
    accepts_ethiopians: true,
    country: 'United Kingdom',
    website: 'https://alphacapitalgroup.uk',
    description: '0% commission on challenge trading, free performance coaching, and zero platform markup. Excellent for East African Forex traders.',
    plans: [
      { id: 'acg-10k', plan_name: '$10,000 Alpha Pro', account_size_usd: 10000, price_usd: 75, evaluation_type: '2-Step Evaluation', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: true, features: ['Free market analysis tools', 'No time limit', 'Raw spreads'] },
      { id: 'acg-50k', plan_name: '$50,000 Alpha Pro', account_size_usd: 50000, price_usd: 275, evaluation_type: '2-Step Evaluation', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: true, features: ['Zero commissions', 'Bi-weekly payouts', 'MT5 platform'] },
      { id: 'acg-100k', plan_name: '$100,000 Alpha Pro', account_size_usd: 100000, price_usd: 475, evaluation_type: '2-Step Evaluation', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: false, features: ['Up to 90% profit share', 'Performance coaching', 'Scale to $2M'] },
    ]
  },
  {
    id: 'cti-firm',
    name: 'City Traders Imperium',
    logo_url: null,
    rating: 4.1,
    review_count: 4200,
    accepts_ethiopians: true,
    country: 'United Kingdom',
    website: 'https://citytraderseimperium.com',
    description: 'London-based firm known for instant funding accounts, long-term scaling pathways, and personalized trading psychology mentorship.',
    plans: [
      { id: 'cti-10k', plan_name: '$10,000 Direct Funding', account_size_usd: 10000, price_usd: 129, evaluation_type: 'Instant Funding (No Challenge)', phase_1_target: 'None (Direct Funded)', phase_2_target: 'None (Direct Funded)', profit_split_percent: 70, profit_target_percent: 7, max_daily_loss_percent: 4, max_total_loss_percent: 6, leverage: '1:30', is_popular: false, features: ['Instant capital', 'Double capital on 10%', 'No evaluation'] },
      { id: 'cti-50k', plan_name: '$50,000 Evaluation', account_size_usd: 50000, price_usd: 299, evaluation_type: '2-Step Challenge', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: true, features: ['Scale to $4,000,000', 'Mentorship access', 'Flexible rules'] },
    ]
  },
  {
    id: 'maven-firm',
    name: 'Maven Trading',
    logo_url: null,
    rating: 4.2,
    review_count: 2800,
    accepts_ethiopians: true,
    country: 'Canada',
    website: 'https://maventrading.io',
    description: 'Community-centric prop firm with competitive pricing, automated crypto payouts, and permission for EA/algorithmic trading strategies.',
    plans: [
      { id: 'mav-10k', plan_name: '$10,000 2-Step', account_size_usd: 10000, price_usd: 59, evaluation_type: '2-Step Evaluation', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: false, features: ['EA & bots allowed', 'Crypto payouts', 'No minimum days'] },
      { id: 'mav-50k', plan_name: '$50,000 2-Step', account_size_usd: 50000, price_usd: 249, evaluation_type: '2-Step Evaluation', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: true, features: ['Instant Discord roles', 'Fast payouts', 'News trading OK'] },
    ]
  },
  {
    id: 'myfundedfx-firm',
    name: 'MyFundedFX',
    logo_url: null,
    rating: 4.3,
    review_count: 8100,
    accepts_ethiopians: true,
    country: 'United States',
    website: 'https://myfundedfx.tech',
    description: 'Offers same-day crypto payouts, 1-step and 2-step evaluation tracks, and competitive challenge pricing for African traders.',
    plans: [
      { id: 'mfx-25k', plan_name: '$25,000 2-Step', account_size_usd: 25000, price_usd: 189, evaluation_type: '2-Step Evaluation', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 8, leverage: '1:100', is_popular: false, features: ['Same-day payouts', 'No time limits', 'MetaTrader 5'] },
      { id: 'mfx-50k', plan_name: '$50,000 2-Step', account_size_usd: 50000, price_usd: 299, evaluation_type: '2-Step Evaluation', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 8, leverage: '1:100', is_popular: true, features: ['Most chosen', '80% profit split', 'Raw spreads'] },
    ]
  },
  {
    id: 'funded-engineer-firm',
    name: 'Funded Engineer',
    logo_url: null,
    rating: 4.1,
    review_count: 2200,
    accepts_ethiopians: true,
    country: 'United States',
    website: 'https://fundedengineer.com',
    description: 'Specializes in quantitative and algorithmic traders. Allows expert advisors (EAs) and offers aggressive scaling programs up to $2.5M.',
    plans: [
      { id: 'fe-25k', plan_name: '$25,000 Standard', account_size_usd: 25000, price_usd: 175, evaluation_type: '2-Step Standard', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: false, features: ['EAs permitted', 'Bi-weekly payouts', 'Zero fees on scale'] },
      { id: 'fe-50k', plan_name: '$50,000 Standard', account_size_usd: 50000, price_usd: 275, evaluation_type: '2-Step Standard', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: true, features: ['Scale to $2.5M', '90% profit split tier', 'Fast support'] },
    ]
  },
  {
    id: 'trueforexfunds-firm',
    name: 'True Forex Funds',
    logo_url: null,
    rating: 4.4,
    review_count: 6400,
    accepts_ethiopians: true,
    country: 'Hungary',
    website: 'https://trueforexfunds.com',
    description: 'Low spreads, no time limits, bi-weekly payouts, and free retry if ending in profit. Very popular among African forex traders.',
    plans: [
      { id: 'tff-25k', plan_name: '$25,000 2-Phase', account_size_usd: 25000, price_usd: 195, evaluation_type: '2-Phase Evaluation', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: false, features: ['Free retry if in profit', 'No time limits', 'Crypto payouts'] },
      { id: 'tff-50k', plan_name: '$50,000 2-Phase', account_size_usd: 50000, price_usd: 295, evaluation_type: '2-Phase Evaluation', phase_1_target: '8%', phase_2_target: '5%', profit_split_percent: 80, profit_target_percent: 8, max_daily_loss_percent: 5, max_total_loss_percent: 10, leverage: '1:100', is_popular: true, features: ['Bi-weekly payouts', 'MetaTrader 4 & 5', 'Weekend holding'] },
    ]
  }
];

// ─── Popular Brokers for Ethiopian Traders ───────────────────────────────────
const POPULAR_BROKERS = [
  { id: 'exness', name: 'Exness', icon: '🟡', popular: true, minDeposit: 10, desc: 'Most popular in Ethiopia · Instant execution & low spreads', serverPlaceholder: 'e.g. Exness-Real19, Exness-Real21' },
  { id: 'deriv', name: 'Deriv', icon: '🔴', popular: true, minDeposit: 10, desc: 'Boom/Crash, Synthetic indices, Step Index & Forex · CR number', serverPlaceholder: 'e.g. Deriv-Server, Deriv-Server-02' },
  { id: 'xm', name: 'XM Global', icon: '⚪', popular: true, minDeposit: 10, desc: 'Standard & Micro accounts · Zero deposit fees', serverPlaceholder: 'e.g. XMGlobal-Real 34' },
  { id: 'justmarkets', name: 'JustMarkets', icon: '🔵', popular: true, minDeposit: 10, desc: 'High leverage 1:3000 · Very popular in Addis Ababa', serverPlaceholder: 'e.g. JustMarkets-Live' },
  { id: 'hfm', name: 'HFM (HotForex)', icon: '🟠', popular: false, minDeposit: 10, desc: 'Zero spread & cent accounts for beginners', serverPlaceholder: 'e.g. HFMarketsSV-Live Server' },
  { id: 'octafx', name: 'OctaFX', icon: '🟣', popular: false, minDeposit: 10, desc: 'Copy trading & low spreads', serverPlaceholder: 'e.g. OctaFX-Real' },
  { id: 'icmarkets', name: 'IC Markets', icon: '🟢', popular: false, minDeposit: 20, desc: 'True ECN & raw spreads · Ideal for EAs & algos', serverPlaceholder: 'e.g. ICMarketsSC-Live' },
  { id: 'pepperstone', name: 'Pepperstone', icon: '⚫', popular: false, minDeposit: 20, desc: 'Razor accounts with cTrader & TradingView integration', serverPlaceholder: 'e.g. Pepperstone-Live01' },
  { id: 'fbs', name: 'FBS', icon: '🟩', popular: false, minDeposit: 10, desc: 'Cent & standard accounts with high leverage', serverPlaceholder: 'e.g. FBS-Real' },
  { id: 'other', name: 'Other Broker', icon: '💼', popular: false, minDeposit: 10, desc: 'Specify any other Forex / CFD broker', serverPlaceholder: 'e.g. Broker Server Name' }
];

// ─── Sub-components ───────────────────────────────────────────────────────────
const StarRating = ({ rating }) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span style={{ color: '#F5A623', fontSize: '12px', letterSpacing: '1px' }}>
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
    </span>
  );
};

const Badge = ({ children, color = '#F5A623', bg }) => (
  <span style={{
    background: bg || `${color}18`,
    border: `1px solid ${color}40`,
    color,
    fontSize: '10px',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: '6px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  }}>
    {children}
  </span>
);

const InfoBox = ({ children, type = 'info' }) => {
  const map = {
    info: { bg: 'rgba(245,166,35,0.06)', border: 'rgba(245,166,35,0.2)', color: '#FFD580' },
    warn: { bg: 'rgba(255,77,77,0.06)', border: 'rgba(255,77,77,0.2)', color: '#FF6B6B' },
    success: { bg: 'rgba(0,200,150,0.06)', border: 'rgba(0,200,150,0.2)', color: '#00C896' },
  };
  const s = map[type] || map.info;
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '12px', padding: '14px 16px', fontSize: '12px', color: s.color, lineHeight: 1.5 }}>
      {children}
    </div>
  );
};

const FirmLogo = ({ name, size = 48 }) => {
  const colors = [
    ['#F5A623', '#D88E10'],
    ['#00C896', '#00A87A'],
    ['#6C5CE7', '#4F3ED1'],
    ['#E056FD', '#C23FDB'],
    ['#FF4D6D', '#D03050'],
    ['#4EC9F0', '#2BA8D0'],
    ['#F7971E', '#D4700F'],
    ['#43E97B', '#2DBB5D'],
  ];
  const idx = (name || 'F').charCodeAt(0) % colors.length;
  const [c1, c2] = colors[idx];
  return (
    <div style={{
      width: size, height: size, borderRadius: '14px',
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: '#fff',
      flexShrink: 0, boxShadow: `0 4px 16px ${c1}40`,
    }}>
      {(name || 'F')[0]}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const FundedAccountsPage = ({ setPage }) => {
  const { user, wallet, systemSettings, setError, setSuccess } = useAuth();

  // Data state
  const [firms, setFirms] = useState([]);
  const [plans, setPlans] = useState([]);
  const [myPurchases, setMyPurchases] = useState([]);
  const [myBrokerDeposits, setMyBrokerDeposits] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  // views: 'browse' | 'broker_deposit' | 'firm' | 'checkout' | 'my_orders'
  const [view, setView] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFirm, setSelectedFirm] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Prop Firm Checkout form
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [fatherName, setFatherName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [telegram, setTelegram] = useState('');
  const [experience, setExperience] = useState('intermediate');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Broker Deposit form
  const [selectedBroker, setSelectedBroker] = useState('exness');
  const [customBrokerName, setCustomBrokerName] = useState('');
  const [brokerAccountNumber, setBrokerAccountNumber] = useState('');
  const [brokerServer, setBrokerServer] = useState('');
  const [brokerPlatform, setBrokerPlatform] = useState('MT5');
  const [brokerAmount, setBrokerAmount] = useState('');
  const [brokerFullName, setBrokerFullName] = useState(user?.full_name || '');
  const [brokerFatherName, setBrokerFatherName] = useState('');
  const [brokerEmail, setBrokerEmail] = useState(user?.email || '');
  const [brokerPhone, setBrokerPhone] = useState(user?.phone || '');
  const [brokerTelegram, setBrokerTelegram] = useState('');
  const [brokerLoading, setBrokerLoading] = useState(false);

  // Fees calculation
  const firmFeePercent = systemSettings?.funded_accounts_fee_percent ?? 3.0;
  const brokerDepositFeePercent = systemSettings?.funded_deposit_fee_percent ?? 2.5;
  const available = Math.max(0, (wallet?.eth_balance ?? 0) - (wallet?.eth_locked ?? 0));

  const planPrice = selectedPlan?.price_usd ?? 0;
  const platformFee = planPrice * firmFeePercent / 100;
  const totalCharge = planPrice + platformFee;

  // Broker fee calculation
  const brokerAmtNum = parseFloat(brokerAmount) || 0;
  const brokerFee = brokerAmtNum * brokerDepositFeePercent / 100;
  const brokerTotalCharge = brokerAmtNum + brokerFee;

  // Load data
  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [firmsRes, plansRes] = await Promise.all([
        supabase.from('funded_account_firms').select('*').eq('is_active', true).order('rating', { ascending: false }),
        supabase.from('funded_account_plans').select('*').eq('is_active', true).order('account_size_usd'),
      ]);

      if (firmsRes.data && firmsRes.data.length > 0) {
        setFirms(firmsRes.data);
      } else {
        // Use comprehensive built-in Ethiopian firms fallback
        setFirms(DEFAULT_PROP_FIRMS);
      }

      if (plansRes.data && plansRes.data.length > 0) {
        setPlans(plansRes.data);
      } else {
        // Flatten plans from fallback
        const flatPlans = DEFAULT_PROP_FIRMS.flatMap(f => f.plans.map(p => ({ ...p, firm_id: f.id })));
        setPlans(flatPlans);
      }

      if (user?.id) {
        // Load Prop Firm Purchases
        const purchasesRes = await supabase
          .from('funded_account_purchases')
          .select('*, funded_account_firms(name), funded_account_plans(plan_name, account_size_usd)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (purchasesRes.data) setMyPurchases(purchasesRes.data);

        // Load Broker Deposits
        const brokerRes = await supabase
          .from('broker_deposits')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (brokerRes.data) setMyBrokerDeposits(brokerRes.data);
      }
    } catch (err) {
      console.warn('DB load notice (using rich presets):', err.message);
      setFirms(DEFAULT_PROP_FIRMS);
      const flatPlans = DEFAULT_PROP_FIRMS.flatMap(f => f.plans.map(p => ({ ...p, firm_id: f.id })));
      setPlans(flatPlans);
    } finally {
      setLoading(false);
    }
  };

  // Filter firms by search
  const filteredFirms = useMemo(() => {
    if (!searchQuery.trim()) return firms;
    const q = searchQuery.toLowerCase();
    return firms.filter(f =>
      f.name.toLowerCase().includes(q) ||
      (f.description || '').toLowerCase().includes(q)
    );
  }, [firms, searchQuery]);

  // Plans for selected firm (guarantees evaluation_type, phase targets, and loss limits)
  const firmPlans = useMemo(() => {
    if (!selectedFirm) return [];
    const preset = DEFAULT_PROP_FIRMS.find(f =>
      f.name.toLowerCase() === selectedFirm.name?.toLowerCase() || f.id === selectedFirm.id
    );
    const directPlans = plans.filter(p => p.firm_id === selectedFirm.id);
    if (directPlans.length > 0) {
      return directPlans.map(dp => {
        const matchingPresetPlan = preset?.plans.find(pp =>
          pp.account_size_usd === Number(dp.account_size_usd) || pp.plan_name === dp.plan_name
        );
        return {
          ...dp,
          evaluation_type: dp.evaluation_type || matchingPresetPlan?.evaluation_type || '2-Step Challenge',
          phase_1_target: dp.phase_1_target || (dp.phase_1_target_percent ? `${dp.phase_1_target_percent}%` : null) || matchingPresetPlan?.phase_1_target || `${dp.profit_target_percent || 8}%`,
          phase_2_target: dp.phase_2_target || (dp.phase_2_target_percent ? `${dp.phase_2_target_percent}%` : null) || matchingPresetPlan?.phase_2_target || '5%',
          max_daily_loss_percent: dp.max_daily_loss_percent ?? matchingPresetPlan?.max_daily_loss_percent ?? 5,
          max_total_loss_percent: dp.max_total_loss_percent ?? matchingPresetPlan?.max_total_loss_percent ?? 10,
        };
      });
    }
    return preset ? preset.plans : [];
  }, [plans, selectedFirm]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectFirm = useCallback((firm) => {
    setSelectedFirm(firm);
    setSelectedPlan(null);
    setView('firm');
  }, []);

  const handleSelectPlan = useCallback((plan) => {
    setSelectedPlan(plan);
    setView('checkout');
    setFullName(user?.full_name || '');
    setBuyerEmail(user?.email || '');
    setPhone(user?.phone || '');
  }, [user]);

  // Handle Prop Account Purchase
  const handlePurchase = async () => {
    if (!fullName.trim()) { setError('Please enter your full name'); return; }
    if (!fatherName.trim()) { setError('Please enter your father\'s name (required for verification)'); return; }
    if (!buyerEmail.trim()) { setError('Please enter your email'); return; }
    if (!phone.trim()) { setError('Please enter your phone number'); return; }
    if (available < totalCharge) {
      setError(`Insufficient balance. You need $${fmt(totalCharge)} USDT but have $${fmt(available)} USDT. Please deposit first.`);
      return;
    }

    setCheckoutLoading(true);
    try {
      // 1. Deduct balance from user
      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('eth_balance')
        .eq('id', user.id)
        .single();
      if (userErr) throw userErr;

      const newBalance = (userData.eth_balance || 0) - totalCharge;
      if (newBalance < 0) throw new Error('Insufficient balance');

      const { error: balErr } = await supabase
        .from('users')
        .update({ eth_balance: newBalance })
        .eq('id', user.id);
      if (balErr) throw balErr;

      // 2. Insert funded account purchase record
      const firmIdToSave = selectedFirm.id?.length > 30 ? selectedFirm.id : null;
      const planIdToSave = selectedPlan.id?.length > 30 ? selectedPlan.id : null;

      const { error: purchaseErr } = await supabase
        .from('funded_account_purchases')
        .insert({
          user_id: user.id,
          firm_id: firmIdToSave,
          plan_id: planIdToSave,
          buyer_full_name: fullName.trim(),
          buyer_father_name: fatherName.trim(),
          buyer_email: buyerEmail.trim(),
          buyer_phone: phone.trim(),
          buyer_telegram: telegram.trim() || null,
          buyer_trading_experience: experience,
          plan_price_usd: planPrice,
          platform_fee_usd: platformFee,
          total_charged_usd: totalCharge,
          payment_method: 'wallet_balance',
          status: 'paid',
          admin_notes: `Firm: ${selectedFirm.name} | Plan: ${selectedPlan.plan_name} | Father: ${fatherName.trim()}`,
        });
      if (purchaseErr) console.warn('Record save notice:', purchaseErr.message);

      // 3. Collect fee to admin wallet
      const { data: sett } = await supabase.from('system_settings').select('id, collected_fees_eth').limit(1).single();
      if (sett) {
        await supabase.from('system_settings')
          .update({ collected_fees_eth: (sett.collected_fees_eth || 0) + platformFee })
          .eq('id', sett.id);
      }

      // 4. Notify admin with complete buyer information
      const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
      if (admins) {
        for (const admin of admins) {
          await supabase.from('notifications').insert({
            user_id: admin.id,
            type: 'funded_account_purchase',
            title: 'New Funded Account Purchase',
            message: `Buy order for ${selectedFirm.name} (${selectedPlan.plan_name}) by @${user.username} (Name: ${fullName} ${fatherName}, Email: ${buyerEmail}, Phone: ${phone}, Telegram: ${telegram || 'N/A'}). Total: $${fmt(totalCharge)} (Admin Fee: $${fmt(platformFee)}).`,
          });
        }
      }

      // 5. Notify user
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'funded_account_purchase',
        title: 'Funded Account Order Confirmed! 🎉',
        message: `Your ${selectedFirm.name} ${selectedPlan.plan_name} order was received. Admin is purchasing your credentials. You will receive them at ${buyerEmail} within 24 hours.`,
      });

      setSuccess(`Purchase successful! $${fmt(totalCharge)} deducted. Login credentials will be sent to ${buyerEmail} within 24 hours.`);
      await loadData();
      setView('my_orders');
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Handle Broker Deposit
  const handleBrokerDepositSubmit = async () => {
    const brokerObj = POPULAR_BROKERS.find(b => b.id === selectedBroker);
    const brokerNameFinal = selectedBroker === 'other' ? customBrokerName.trim() : (brokerObj?.name || selectedBroker);

    if (!brokerNameFinal) { setError('Please select or specify a broker name'); return; }
    if (!brokerAccountNumber.trim()) { setError('Please enter your broker account or login number'); return; }
    if (!brokerFullName.trim()) { setError('Please enter your full name as registered on broker'); return; }
    if (!brokerFatherName.trim()) { setError('Please enter your father\'s name for Ethiopian identity verification'); return; }
    if (!brokerEmail.trim()) { setError('Please enter your broker registered email'); return; }
    if (!brokerPhone.trim()) { setError('Please enter your phone number'); return; }
    if (brokerAmtNum < 10) { setError('Minimum broker deposit is $10 USD'); return; }
    if (available < brokerTotalCharge) {
      setError(`Insufficient balance. You need $${fmt(brokerTotalCharge)} USDT ($${fmt(brokerAmtNum)} + $${fmt(brokerFee)} fee) but have $${fmt(available)} USDT.`);
      return;
    }

    setBrokerLoading(true);
    try {
      // 1. Deduct balance from user wallet
      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('eth_balance')
        .eq('id', user.id)
        .single();
      if (userErr) throw userErr;

      const newBalance = (userData.eth_balance || 0) - brokerTotalCharge;
      if (newBalance < 0) throw new Error('Insufficient balance');

      const { error: balErr } = await supabase
        .from('users')
        .update({ eth_balance: newBalance })
        .eq('id', user.id);
      if (balErr) throw balErr;

      // 2. Insert into broker_deposits table
      const { error: depErr } = await supabase
        .from('broker_deposits')
        .insert({
          user_id: user.id,
          broker_name: brokerNameFinal,
          account_number: brokerAccountNumber.trim(),
          server_name: brokerServer.trim() || null,
          platform: brokerPlatform,
          buyer_full_name: brokerFullName.trim(),
          buyer_father_name: brokerFatherName.trim(),
          buyer_email: brokerEmail.trim(),
          buyer_phone: brokerPhone.trim(),
          buyer_telegram: brokerTelegram.trim() || null,
          amount_usd: brokerAmtNum,
          platform_fee_usd: brokerFee,
          total_charged_usd: brokerTotalCharge,
          status: 'paid',
          admin_notes: `Broker: ${brokerNameFinal} | Acct: ${brokerAccountNumber} | Server: ${brokerServer || 'Default'} | Platform: ${brokerPlatform}`,
        });
      if (depErr) console.warn('Broker deposit save notice:', depErr.message);

      // 3. Collect fee to admin wallet
      const { data: sett } = await supabase.from('system_settings').select('id, collected_fees_eth').limit(1).single();
      if (sett) {
        await supabase.from('system_settings')
          .update({ collected_fees_eth: (sett.collected_fees_eth || 0) + brokerFee })
          .eq('id', sett.id);
      }

      // 4. Notify admin with complete broker details so admin can execute deposit
      const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
      if (admins) {
        for (const admin of admins) {
          await supabase.from('notifications').insert({
            user_id: admin.id,
            type: 'broker_deposit_request',
            title: 'New Broker Deposit Request',
            message: `Deposit $${brokerAmtNum} to ${brokerNameFinal} (Acct: ${brokerAccountNumber}, Server: ${brokerServer || 'N/A'}, Name: ${brokerFullName} ${brokerFatherName}, Email: ${brokerEmail}, Phone: ${brokerPhone}, Telegram: ${brokerTelegram || 'N/A'}). Admin commission earned: $${fmt(brokerFee)}.`,
          });
        }
      }

      // 5. Notify user
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'broker_deposit_request',
        title: 'Broker Deposit Order Received 🚀',
        message: `Your deposit of $${brokerAmtNum} to ${brokerNameFinal} (${brokerAccountNumber}) has been queued. Our admin team will deposit funds to your broker account within 1-3 hours.`,
      });

      setSuccess(`Deposit submitted! $${fmt(brokerTotalCharge)} deducted. Funds will reflect in your ${brokerNameFinal} account within 1-3 hours.`);
      setBrokerAmount('');
      setBrokerAccountNumber('');
      setBrokerServer('');
      await loadData();
      setView('my_orders');
    } catch (err) {
      setError(err.message);
    } finally {
      setBrokerLoading(false);
    }
  };

  // ── CSS Styles ─────────────────────────────────────────────────────────────
  const CSS = `
    @keyframes faFadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
    .fa-animate { animation: faFadeUp 0.28s ease-out; }
    .fa-card {
      background: #141827;
      border: 1.5px solid #1E2640;
      border-radius: 18px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.22s ease;
    }
    .fa-card:hover {
      border-color: rgba(245,166,35,0.4);
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .fa-plan-card {
      background: #0B0E1A;
      border: 1.5px solid #1E2640;
      border-radius: 16px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.22s ease;
      position: relative;
    }
    .fa-plan-card:hover {
      border-color: #F5A623;
      background: rgba(245,166,35,0.03);
      transform: translateY(-2px);
    }
    .fa-plan-card.popular {
      border-color: rgba(245,166,35,0.5);
      background: rgba(245,166,35,0.03);
    }
    .fa-input {
      width: 100%;
      box-sizing: border-box;
      background: #0B0E1A;
      border: 1.5px solid #1E2640;
      border-radius: 12px;
      color: #fff;
      padding: 13px 16px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
      transition: all 0.2s;
    }
    .fa-input:focus {
      border-color: rgba(245,166,35,0.5);
      box-shadow: 0 0 0 3px rgba(245,166,35,0.08);
    }
    .fa-input::placeholder { color: #3E4962; }
    .fa-btn {
      width: 100%;
      padding: 15px;
      border-radius: 13px;
      border: none;
      background: linear-gradient(135deg, #F5A623, #D88E10);
      color: #0A0C12;
      font-size: 15px;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .fa-btn:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
    .fa-btn:disabled { background: #1E2640; color: #4A5568; cursor: not-allowed; }
    .fa-select {
      width: 100%;
      box-sizing: border-box;
      background: #0B0E1A;
      border: 1.5px solid #1E2640;
      border-radius: 12px;
      color: #fff;
      padding: 13px 16px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
      cursor: pointer;
    }
    .fa-tab-btn {
      padding: 9px 18px;
      border-radius: 10px;
      border: 1px solid transparent;
      background: transparent;
      color: #8A9BB8;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    .fa-tab-btn.active {
      background: rgba(245,166,35,0.12);
      color: #F5A623;
      border-color: rgba(245,166,35,0.25);
    }
    .fa-search {
      width: 100%;
      box-sizing: border-box;
      background: #141827;
      border: 1.5px solid #1E2640;
      border-radius: 14px;
      color: #fff;
      padding: 14px 16px 14px 46px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
      transition: all 0.2s;
    }
    .fa-search:focus { border-color: rgba(245,166,35,0.4); }
    .fa-search::placeholder { color: #3E4962; }
  `;

  // Total user orders count
  const totalOrdersCount = myPurchases.length + myBrokerDeposits.length;

  // ── RENDER MAIN VIEWS ──────────────────────────────────────────────────────
  if (view === 'browse' || view === 'broker_deposit' || view === 'my_orders') {
    return (
      <div style={{ fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column', gap: '24px' }} className="fa-animate">
        <style>{CSS}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'linear-gradient(135deg, #F5A623, #FFE082)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              📈
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>Funded Accounts & Brokers</h1>
              <p style={{ fontSize: '12px', color: '#8A9BB8', margin: 0 }}>Buy prop firm challenges & deposit directly to Forex brokers from Ethiopia</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#141827', padding: '6px 12px', borderRadius: '12px', border: '1px solid #1E2640' }}>
            <span style={{ fontSize: '11px', color: '#8A9BB8' }}>Available:</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#00C896', fontFamily: 'var(--font-mono)' }}>${fmt(available)} USDT</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: '#0B0E1A', padding: '4px', borderRadius: '12px', border: '1px solid #1E2640', overflowX: 'auto', width: 'fit-content' }}>
          <button className={`fa-tab-btn${view === 'browse' ? ' active' : ''}`} onClick={() => setView('browse')}>
            <i className="ti ti-trophy" />
            Buy Funded Accounts
          </button>
          <button className={`fa-tab-btn${view === 'broker_deposit' ? ' active' : ''}`} onClick={() => setView('broker_deposit')}>
            <i className="ti ti-building-bank" />
            Deposit to Broker
          </button>
          <button className={`fa-tab-btn${view === 'my_orders' ? ' active' : ''}`} onClick={() => setView('my_orders')}>
            <i className="ti ti-receipt" />
            My Orders {totalOrdersCount > 0 && <span style={{ marginLeft: '4px', background: '#F5A623', color: '#0A0C12', borderRadius: '10px', padding: '1px 6px', fontSize: '10px', fontWeight: 800 }}>{totalOrdersCount}</span>}
          </button>
        </div>

        {/* ── TAB 1: BROWSE PROP FIRMS ───────────────────────────────────────── */}
        {view === 'browse' && (
          <>
            {/* Info Banner */}
            <div style={{ background: 'linear-gradient(135deg, rgba(245,166,35,0.08), rgba(0,200,150,0.04))', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ fontSize: '28px', flexShrink: 0 }}>🇪🇹</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>13+ Prop Firms Verified for Ethiopian Traders</div>
                <div style={{ fontSize: '12px', color: '#8A9BB8', lineHeight: 1.6 }}>
                  Choose from FTMO, The5ers, Funding Pips, Topstep, and more. Pay directly with your EthioSwap USDT balance. When you order, our admin purchases the account with your details and delivers your credentials to your email. Transparent <strong style={{ color: '#F5A623' }}>{firmFeePercent}% platform fee</strong>.
                </div>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#4A5568', fontSize: '18px', pointerEvents: 'none' }} />
              <input
                type="text"
                className="fa-search"
                placeholder="Search prop firms by name (e.g. FTMO, The5ers, Funding Pips, Topstep...)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8A9BB8', cursor: 'pointer', fontSize: '16px' }}>✕</button>
              )}
            </div>

            {/* Stats bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { label: 'Active Firms', value: firms.length, icon: '🏢', color: '#F5A623' },
                { label: 'Total Plans', value: plans.length || '30+', icon: '📋', color: '#00C896' },
                { label: 'Account Sizes', value: '$5K – $200K', icon: '💰', color: '#6C5CE7' },
              ].map((s) => (
                <div key={s.label} style={{ background: '#141827', border: '1px solid #1E2640', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: '#4A5568', marginTop: '2px', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Firms List */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ background: '#141827', borderRadius: '18px', height: '110px' }} />
                ))}
              </div>
            ) : filteredFirms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#4A5568' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#8A9BB8' }}>No firms found matching "{searchQuery}"</div>
                <div style={{ fontSize: '13px', marginTop: '6px' }}>Try searching for FTMO, Funding Pips, or The5ers</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredFirms.map(firm => {
                  const firmPlanList = plans.filter(p => p.firm_id === firm.id) || [];
                  const minPrice = firmPlanList.length ? Math.min(...firmPlanList.map(p => p.price_usd)) : null;
                  const maxSize = firmPlanList.length ? Math.max(...firmPlanList.map(p => p.account_size_usd)) : null;
                  return (
                    <div key={firm.id || firm.name} className="fa-card" onClick={() => handleSelectFirm(firm)}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <FirmLogo name={firm.name} size={52} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{firm.name}</span>
                            {firm.accepts_ethiopians && <Badge color="#00C896">🇪🇹 Ethiopian Friendly</Badge>}
                            {firm.country && <Badge color="#8A9BB8">{firm.country}</Badge>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <StarRating rating={firm.rating} />
                            <span style={{ fontSize: '11px', color: '#4A5568' }}>{firm.rating} ({firm.review_count?.toLocaleString()} reviews)</span>
                          </div>
                          <p style={{ fontSize: '12px', color: '#8A9BB8', margin: '0 0 10px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {firm.description}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {firmPlanList.length > 0 && <Badge color="#F5A623">{firmPlanList.length} plans available</Badge>}
                            {minPrice && <Badge color="#00C896">from ${minPrice}</Badge>}
                            {maxSize && <Badge color="#6C5CE7">up to {fmtK(maxSize)}</Badge>}
                          </div>
                        </div>
                        <i className="ti ti-chevron-right" style={{ color: '#4A5568', fontSize: '20px', flexShrink: 0, alignSelf: 'center' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB 2: DEPOSIT TO BROKER ───────────────────────────────────────── */}
        {view === 'broker_deposit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
            {/* Banner */}
            <div style={{ background: 'linear-gradient(135deg, rgba(0,200,150,0.08), rgba(245,166,35,0.04))', border: '1px solid rgba(0,200,150,0.2)', borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ fontSize: '28px', flexShrink: 0 }}>🏦</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Direct Broker Deposit for Ethiopian Traders</div>
                <div style={{ fontSize: '12px', color: '#8A9BB8', lineHeight: 1.6 }}>
                  Cannot deposit to Exness, Deriv, or XM using local Ethiopian bank cards? Deposit instantly with your EthioSwap wallet! Our team executes the deposit directly to your broker account within 1-3 hours. A <strong style={{ color: '#00C896' }}>{brokerDepositFeePercent}% fee</strong> applies and goes directly to the admin wallet.
                </div>
              </div>
            </div>

            {/* Broker selection */}
            <div style={{ background: '#141827', border: '1px solid #1E2640', borderRadius: '18px', padding: '22px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                Select Your Broker *
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                {POPULAR_BROKERS.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBroker(b.id)}
                    style={{
                      background: selectedBroker === b.id ? 'rgba(245,166,35,0.12)' : '#0B0E1A',
                      border: `1.5px solid ${selectedBroker === b.id ? '#F5A623' : '#1E2640'}`,
                      borderRadius: '12px',
                      padding: '12px 10px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{b.icon}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: selectedBroker === b.id ? '#F5A623' : '#fff' }}>{b.name}</div>
                    {b.popular && <span style={{ fontSize: '9px', color: '#00C896', fontWeight: 700 }}>Popular</span>}
                  </button>
                ))}
              </div>

              {selectedBroker === 'other' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Custom Broker Name *</label>
                  <input className="fa-input" type="text" placeholder="e.g. RoboForex, Tickmill..." value={customBrokerName} onChange={e => setCustomBrokerName(e.target.value)} />
                </div>
              )}

              {/* Account Number & Server */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                    {selectedBroker === 'deriv' ? 'Deriv CR / Account ID *' : 'Broker Account / Login ID *'}
                  </label>
                  <input
                    className="fa-input"
                    type="text"
                    placeholder={selectedBroker === 'deriv' ? 'CR1234567 or MT5 Login' : 'e.g. 142859123'}
                    value={brokerAccountNumber}
                    onChange={e => setBrokerAccountNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Platform</label>
                  <select className="fa-select" value={brokerPlatform} onChange={e => setBrokerPlatform(e.target.value)}>
                    <option value="MT5">MetaTrader 5 (MT5)</option>
                    <option value="MT4">MetaTrader 4 (MT4)</option>
                    <option value="Deriv Trader">Deriv Trader / Synthetic</option>
                    <option value="cTrader">cTrader</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                  Server Name <span style={{ color: '#4A5568', textTransform: 'none' }}>(optional for Deriv CR accounts)</span>
                </label>
                <input
                  className="fa-input"
                  type="text"
                  placeholder={POPULAR_BROKERS.find(b => b.id === selectedBroker)?.serverPlaceholder || 'e.g. Server Name'}
                  value={brokerServer}
                  onChange={e => setBrokerServer(e.target.value)}
                />
              </div>

              {/* Amount */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Deposit Amount (USD) *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', fontWeight: 800, color: '#4A5568' }}>$</span>
                  <input
                    className="fa-input"
                    type="number"
                    min="10"
                    step="1"
                    placeholder="100.00"
                    style={{ paddingLeft: '36px', fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                    value={brokerAmount}
                    onChange={e => setBrokerAmount(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {[50, 100, 200, 500].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setBrokerAmount(amt.toString())}
                      style={{ background: '#0B0E1A', border: '1px solid #1E2640', borderRadius: '8px', padding: '6px 12px', color: '#8A9BB8', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fee Breakdown Box */}
              {brokerAmtNum > 0 && (
                <div style={{ background: '#0B0E1A', border: '1px solid #1E2640', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', color: '#8A9BB8' }}>
                    <span>Deposit into Broker:</span>
                    <span style={{ color: '#fff', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>${fmt(brokerAmtNum)} USD</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', color: '#8A9BB8' }}>
                    <span>EthioSwap Fee ({brokerDepositFeePercent}%):</span>
                    <span style={{ color: '#FF6B6B', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>+${fmt(brokerFee)} USD</span>
                  </div>
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px', fontWeight: 800 }}>
                    <span style={{ color: '#fff' }}>Total Deducted from Wallet:</span>
                    <span style={{ color: '#00C896', fontFamily: 'var(--font-mono)', fontSize: '16px' }}>${fmt(brokerTotalCharge)} USDT</span>
                  </div>
                </div>
              )}
            </div>

            {/* Trader Identity Form */}
            <div style={{ background: '#141827', border: '1px solid #1E2640', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#00C896', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="ti ti-id" /> Account Holder Information (Must match Broker KYC)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>First Name *</label>
                  <input className="fa-input" type="text" placeholder="e.g. Biruk" value={brokerFullName} onChange={e => setBrokerFullName(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Father's Name *</label>
                  <input className="fa-input" type="text" placeholder="e.g. Tesfaye" value={brokerFatherName} onChange={e => setBrokerFatherName(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Broker Registered Email *</label>
                <input className="fa-input" type="email" placeholder="your-broker-email@gmail.com" value={brokerEmail} onChange={e => setBrokerEmail(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Phone Number *</label>
                  <input className="fa-input" type="tel" placeholder="+251 9XX XXX XXX" value={brokerPhone} onChange={e => setBrokerPhone(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Telegram Username</label>
                  <input className="fa-input" type="text" placeholder="@username" value={brokerTelegram} onChange={e => setBrokerTelegram(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Terms and Submit */}
            <InfoBox type="success">
              ✅ Payment is instant from your EthioSwap wallet. Admin receives your broker details immediately to execute the deposit for you. You will receive an on-screen notification and email as soon as the funds reflect in your broker balance.
            </InfoBox>

            <button
              className="fa-btn"
              disabled={brokerLoading || brokerAmtNum < 10 || available < brokerTotalCharge || !brokerAccountNumber.trim() || !brokerFullName.trim() || !brokerFatherName.trim() || !brokerEmail.trim()}
              onClick={handleBrokerDepositSubmit}
              style={{ padding: '16px', fontSize: '15px' }}
            >
              {brokerLoading ? (
                <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Processing Deposit...</>
              ) : (
                <><i className="ti ti-send" /> Deposit ${fmt(brokerAmtNum || 0)} USD to Broker (Total: ${fmt(brokerTotalCharge || 0)} USDT)</>
              )}
            </button>
          </div>
        )}

        {/* ── TAB 3: MY ORDERS & DEPOSITS ─────────────────────────────────────── */}
        {view === 'my_orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {totalOrdersCount === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#4A5568' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#8A9BB8', marginBottom: '6px' }}>No orders or deposits yet</div>
                <div style={{ fontSize: '13px', marginBottom: '20px' }}>Browse prop firms or deposit to your Forex broker</div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button className="fa-btn" style={{ width: 'auto', padding: '10px 22px' }} onClick={() => setView('browse')}>
                    Browse Prop Firms
                  </button>
                  <button className="fa-btn" style={{ width: 'auto', padding: '10px 22px', background: '#1E2640', color: '#fff' }} onClick={() => setView('broker_deposit')}>
                    Deposit to Broker
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Prop Firm Purchases */}
                {myPurchases.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#F5A623', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="ti ti-trophy" /> Prop Firm Purchases ({myPurchases.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {myPurchases.map(purchase => {
                        const statusColors = {
                          pending: '#F5A623', paid: '#6C5CE7', delivered: '#00C896',
                          cancelled: '#FF4D4D', refunded: '#8A9BB8',
                        };
                        const sc = statusColors[purchase.status] || '#8A9BB8';
                        return (
                          <div key={purchase.id} style={{ background: '#141827', border: '1px solid #1E2640', borderRadius: '16px', padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <FirmLogo name={purchase.funded_account_firms?.name || 'Firm'} size={42} />
                                <div>
                                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{purchase.funded_account_firms?.name || 'Prop Firm'}</div>
                                  <div style={{ fontSize: '12px', color: '#8A9BB8' }}>{purchase.funded_account_plans?.plan_name}</div>
                                </div>
                              </div>
                              <Badge color={sc}>{purchase.status}</Badge>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                              <div style={{ background: '#0B0E1A', borderRadius: '10px', padding: '8px 12px' }}>
                                <div style={{ fontSize: '9px', color: '#4A5568', fontWeight: 700 }}>PLAN PRICE</div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>${fmt(purchase.plan_price_usd)}</div>
                              </div>
                              <div style={{ background: '#0B0E1A', borderRadius: '10px', padding: '8px 12px' }}>
                                <div style={{ fontSize: '9px', color: '#4A5568', fontWeight: 700 }}>FEE</div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#FF6B6B', fontFamily: 'var(--font-mono)' }}>+${fmt(purchase.platform_fee_usd)}</div>
                              </div>
                              <div style={{ background: '#0B0E1A', borderRadius: '10px', padding: '8px 12px' }}>
                                <div style={{ fontSize: '9px', color: '#4A5568', fontWeight: 700 }}>TOTAL CHARGED</div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#00C896', fontFamily: 'var(--font-mono)' }}>${fmt(purchase.total_charged_usd)}</div>
                              </div>
                            </div>

                            {purchase.status === 'delivered' && purchase.delivery_details && (
                              <div style={{ background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#00C896', marginBottom: '6px' }}>🔑 Account Credentials</div>
                                <pre style={{ margin: 0, fontSize: '11px', color: '#8A9BB8', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>
                                  {typeof purchase.delivery_details === 'object' ? JSON.stringify(purchase.delivery_details, null, 2) : purchase.delivery_details}
                                </pre>
                              </div>
                            )}

                            {purchase.status === 'paid' && (
                              <InfoBox type="info">
                                ⏳ Order paid. Admin is purchasing your account. Login credentials will be sent to <strong>{purchase.buyer_email}</strong> within 24 hours.
                              </InfoBox>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Broker Deposits */}
                {myBrokerDeposits.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#00C896', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="ti ti-building-bank" /> Broker Deposits ({myBrokerDeposits.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {myBrokerDeposits.map(dep => {
                        const statusColors = {
                          pending: '#F5A623', paid: '#6C5CE7', processing: '#4EC9F0', completed: '#00C896',
                          cancelled: '#FF4D4D', refunded: '#8A9BB8',
                        };
                        const sc = statusColors[dep.status] || '#8A9BB8';
                        return (
                          <div key={dep.id} style={{ background: '#141827', border: '1px solid #1E2640', borderRadius: '16px', padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                              <div>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{dep.broker_name}</div>
                                <div style={{ fontSize: '12px', color: '#8A9BB8' }}>
                                  Account: <strong style={{ color: '#F5A623' }}>{dep.account_number}</strong> {dep.server_name ? `· ${dep.server_name}` : ''} ({dep.platform || 'MT5'})
                                </div>
                              </div>
                              <Badge color={sc}>{dep.status}</Badge>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                              <div style={{ background: '#0B0E1A', borderRadius: '10px', padding: '8px 12px' }}>
                                <div style={{ fontSize: '9px', color: '#4A5568', fontWeight: 700 }}>DEPOSIT AMOUNT</div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>${fmt(dep.amount_usd)} USD</div>
                              </div>
                              <div style={{ background: '#0B0E1A', borderRadius: '10px', padding: '8px 12px' }}>
                                <div style={{ fontSize: '9px', color: '#4A5568', fontWeight: 700 }}>FEE</div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#FF6B6B', fontFamily: 'var(--font-mono)' }}>+${fmt(dep.platform_fee_usd)} USD</div>
                              </div>
                              <div style={{ background: '#0B0E1A', borderRadius: '10px', padding: '8px 12px' }}>
                                <div style={{ fontSize: '9px', color: '#4A5568', fontWeight: 700 }}>TOTAL PAID</div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#00C896', fontFamily: 'var(--font-mono)' }}>${fmt(dep.total_charged_usd)} USDT</div>
                              </div>
                            </div>

                            {dep.status === 'completed' && (
                              <InfoBox type="success">
                                ✅ Deposit completed! Funds are available in your {dep.broker_name} trading balance.
                              </InfoBox>
                            )}

                            {(dep.status === 'paid' || dep.status === 'processing') && (
                              <InfoBox type="info">
                                ⏳ Deposit in progress. Admin is transferring ${fmt(dep.amount_usd)} to your {dep.broker_name} account ({dep.account_number}). Usually completed within 1-3 hours.
                              </InfoBox>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── VIEW: FIRM PLANS LIST ──────────────────────────────────────────────────
  if (view === 'firm' && selectedFirm) {
    return (
      <div style={{ fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column', gap: '24px' }} className="fa-animate">
        <style>{CSS}</style>

        {/* Back button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => { setView('browse'); setSelectedFirm(null); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#8A9BB8', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
            <i className="ti ti-arrow-left" /> Back to Firms
          </button>
        </div>

        {/* Firm Header */}
        <div style={{ background: 'linear-gradient(135deg, #141827, #0B0E1A)', border: '1px solid #1E2640', borderRadius: '20px', padding: '28px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <FirmLogo name={selectedFirm.name} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>{selectedFirm.name}</h1>
              {selectedFirm.accepts_ethiopians && <Badge color="#00C896">🇪🇹 Ethiopian Friendly</Badge>}
              {selectedFirm.country && <Badge color="#8A9BB8">{selectedFirm.country}</Badge>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <StarRating rating={selectedFirm.rating} />
              <span style={{ fontSize: '12px', color: '#4A5568' }}>{selectedFirm.rating} · {selectedFirm.review_count?.toLocaleString()} reviews</span>
            </div>
            <p style={{ fontSize: '13px', color: '#8A9BB8', margin: '0 0 12px', lineHeight: 1.6 }}>{selectedFirm.description}</p>
            {selectedFirm.website && (
              <a href={selectedFirm.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#F5A623', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <i className="ti ti-external-link" /> {selectedFirm.website.replace('https://', '')}
              </a>
            )}
          </div>
        </div>

        {/* Available Plans */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="ti ti-list-details" style={{ color: '#F5A623' }} />
            Choose Your Account Size & Plan
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#4A5568' }}>({firmPlans.length} plans)</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '14px' }}>
            {firmPlans.map(plan => {
              const fee = plan.price_usd * firmFeePercent / 100;
              const total = plan.price_usd + fee;
              return (
                <div key={plan.id || plan.plan_name} className={`fa-plan-card${plan.is_popular ? ' popular' : ''}`} onClick={() => handleSelectPlan(plan)}>
                  {plan.is_popular && (
                    <div style={{ position: 'absolute', top: '-1px', right: '16px', background: 'linear-gradient(135deg, #F5A623, #D88E10)', color: '#0A0C12', fontSize: '9px', fontWeight: 800, padding: '4px 10px', borderRadius: '0 0 8px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Most Popular
                    </div>
                  )}

                  {/* Funded Type Badge */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(108,92,231,0.15)', border: '1px solid rgba(108,92,231,0.35)', color: '#A29BFE', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.02em' }}>
                      <i className="ti ti-shield-check" style={{ color: '#F5A623' }} /> {plan.evaluation_type || '2-Step Challenge'}
                    </div>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{plan.plan_name}</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#F5A623', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>
                      {fmtK(plan.account_size_usd)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8A9BB8' }}>Funded Capital</div>
                  </div>

                  {/* Price Breakdown: Base Price | Fee for Us | Total to Pay */}
                  <div style={{ background: '#0B0E1A', border: '1px solid #1E2640', borderRadius: '12px', padding: '10px', marginBottom: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.25fr', gap: '6px', textAlign: 'center' }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '6px 4px' }}>
                        <div style={{ fontSize: '9px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase' }}>Firm Price</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>${plan.price_usd}</div>
                      </div>
                      <div style={{ background: 'rgba(255,107,107,0.06)', border: '1px dashed rgba(255,107,107,0.3)', borderRadius: '8px', padding: '6px 4px' }}>
                        <div style={{ fontSize: '9px', color: '#FF8888', fontWeight: 700, textTransform: 'uppercase' }}>Fee for Us ({firmFeePercent}%)</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#FF6B6B', fontFamily: 'var(--font-mono)' }}>+${fmt(fee)}</div>
                      </div>
                      <div style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.3)', borderRadius: '8px', padding: '6px 4px' }}>
                        <div style={{ fontSize: '9px', color: '#00C896', fontWeight: 800, textTransform: 'uppercase' }}>Total to Pay</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#00C896', fontFamily: 'var(--font-mono)' }}>${fmt(total)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Targets & Loss Limits Grid: Phase 1, Phase 2, Daily Loss, Total Loss */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', marginBottom: '12px' }}>
                    <div style={{ background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.15)', borderRadius: '8px', padding: '7px', textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#F5A623', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Phase 1 Target</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{plan.phase_1_target || `${plan.profit_target_percent}%`}</div>
                    </div>
                    <div style={{ background: 'rgba(0,200,150,0.05)', border: '1px solid rgba(0,200,150,0.15)', borderRadius: '8px', padding: '7px', textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#00C896', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Phase 2 Target</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{plan.phase_2_target || '5%'}</div>
                    </div>
                    <div style={{ background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.15)', borderRadius: '8px', padding: '7px', textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#FF6B6B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Daily Loss Limit</div>
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#FF6B6B' }}>
                        {plan.max_daily_loss_percent}% <span style={{ fontSize: '10px', color: '#8A9BB8', fontWeight: 600 }}>(-${fmt(plan.account_size_usd * plan.max_daily_loss_percent / 100, 0)})</span>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,77,77,0.05)', border: '1px solid rgba(255,77,77,0.15)', borderRadius: '8px', padding: '7px', textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#FF4D4D', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Max Total Loss</div>
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#FF4D4D' }}>
                        {plan.max_total_loss_percent}% <span style={{ fontSize: '10px', color: '#8A9BB8', fontWeight: 600 }}>(-${fmt(plan.account_size_usd * plan.max_total_loss_percent / 100, 0)})</span>
                      </div>
                    </div>
                  </div>

                  {/* Profit Split & Leverage */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '7px 10px', marginBottom: '12px', fontSize: '11px' }}>
                    <span style={{ color: '#8A9BB8' }}>Profit Split: <strong style={{ color: '#00C896', fontWeight: 800 }}>{plan.profit_split_percent}%</strong></span>
                    <span style={{ color: '#8A9BB8' }}>Leverage: <strong style={{ color: '#A29BFE', fontWeight: 800 }}>{plan.leverage || '1:100'}</strong></span>
                  </div>

                  {plan.features && plan.features.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                      {(Array.isArray(plan.features) ? plan.features : []).slice(0, 3).map((f, i) => (
                        <div key={i} style={{ fontSize: '11px', color: '#8A9BB8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#00C896', fontSize: '12px' }}>✓</span> {f}
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    className="fa-btn"
                    style={{ fontSize: '13px', padding: '12px' }}
                    onClick={e => { e.stopPropagation(); handleSelectPlan(plan); }}
                  >
                    <i className="ti ti-shopping-cart" />
                    Buy Plan — ${fmt(total)} USDT
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── VIEW: CHECKOUT FORM ────────────────────────────────────────────────────
  if (view === 'checkout' && selectedPlan && selectedFirm) {
    const canAfford = available >= totalCharge;
    return (
      <div style={{ fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '560px', margin: '0 auto' }} className="fa-animate">
        <style>{CSS}</style>

        {/* Back */}
        <button onClick={() => setView('firm')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#8A9BB8', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, alignSelf: 'flex-start' }}>
          <i className="ti ti-arrow-left" /> Back to Plans
        </button>

        {/* Order summary */}
        <div style={{ background: 'linear-gradient(135deg, #141827, #0B0E1A)', border: '1px solid #1E2640', borderRadius: '20px', padding: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#F5A623', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-receipt" /> Order Summary
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <FirmLogo name={selectedFirm.name} size={46} />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{selectedFirm.name}</div>
              <div style={{ fontSize: '13px', color: '#8A9BB8' }}>{selectedPlan.plan_name} · {fmtK(selectedPlan.account_size_usd)} Capital</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              ['Funded Type', selectedPlan.evaluation_type || '2-Step Challenge', '#A29BFE'],
              ['Account Size (Capital)', fmtK(selectedPlan.account_size_usd), '#fff'],
              ['Phase 1 Target', selectedPlan.phase_1_target || `${selectedPlan.profit_target_percent}%`, '#F5A623'],
              ['Phase 2 Target', selectedPlan.phase_2_target || '5%', '#00C896'],
              ['Daily Loss Limit', `${selectedPlan.max_daily_loss_percent}% (-$${fmt(selectedPlan.account_size_usd * selectedPlan.max_daily_loss_percent / 100, 0)})`, '#FF6B6B'],
              ['Max Total Loss', `${selectedPlan.max_total_loss_percent}% (-$${fmt(selectedPlan.account_size_usd * selectedPlan.max_total_loss_percent / 100, 0)})`, '#FF4D4D'],
              ['Profit Split', `${selectedPlan.profit_split_percent}% to Trader`, '#00C896'],
              ['Firm Base Price', `$${fmt(planPrice)} USDT`, '#fff'],
              [`EthioSwap Fee for Us (${firmFeePercent}%)`, `+$${fmt(platformFee)} USDT`, '#FF6B6B'],
            ].map(([label, value, color], i, arr) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0' }}>
                  <span style={{ fontSize: '12.5px', color: '#8A9BB8' }}>{label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</span>
                </div>
                {i < arr.length - 1 && <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />}
              </div>
            ))}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>💳 Total to Pay</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#F5A623', fontFamily: 'var(--font-mono)' }}>${fmt(totalCharge)} USDT</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0 8px' }}>
              <span style={{ fontSize: '11.5px', color: '#4A5568' }}>Your Available Balance</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: canAfford ? '#00C896' : '#FF4D4D', fontFamily: 'var(--font-mono)' }}>
                ${fmt(available)} USDT {canAfford ? '✓' : '✗'}
              </span>
            </div>
          </div>

          {!canAfford && (
            <InfoBox type="warn">
              ⚠️ Insufficient balance. You need <strong>${fmt(totalCharge - available)}</strong> more USDT.{' '}
              <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { if (setPage) setPage('wallet'); }}>Deposit now →</span>
            </InfoBox>
          )}
        </div>

        {/* Buyer Info Form */}
        <div style={{ background: '#141827', border: '1px solid #1E2640', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#F5A623', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-user-check" /> Account Holder Information (Matches Kebele ID / Passport)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>First Name *</label>
              <input className="fa-input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Biruk" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Father's Name *</label>
              <input className="fa-input" type="text" value={fatherName} onChange={e => setFatherName(e.target.value)} placeholder="e.g. Tesfaye" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Email Address * <span style={{ color: '#4A5568', fontWeight: 400, textTransform: 'none' }}>(Login credentials will be sent here)</span>
            </label>
            <input className="fa-input" type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="yourname@gmail.com" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Phone Number *</label>
              <input className="fa-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+251 9XX XXX XXX" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Telegram Username</label>
              <input className="fa-input" type="text" value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="@username" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Trading Experience *</label>
            <select className="fa-select" value={experience} onChange={e => setExperience(e.target.value)}>
              <option value="beginner">Beginner (0–1 years)</option>
              <option value="intermediate">Intermediate (1–3 years)</option>
              <option value="expert">Expert (3+ years)</option>
            </select>
          </div>
        </div>

        <InfoBox type="success">
          ✅ Instant wallet deduction. Admin purchases the account directly from {selectedFirm.name} using your exact name and details so KYC passes without issue. Credentials arrive via email in under 24 hours.
        </InfoBox>

        <button
          className="fa-btn"
          disabled={checkoutLoading || !canAfford || !fullName.trim() || !fatherName.trim() || !buyerEmail.trim() || !phone.trim()}
          onClick={handlePurchase}
          style={{ padding: '17px', fontSize: '16px' }}
        >
          {checkoutLoading ? (
            <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
          ) : (
            <><i className="ti ti-credit-card" /> Pay ${fmt(totalCharge)} USDT — Buy Account</>
          )}
        </button>
      </div>
    );
  }

  return null;
};

export default FundedAccountsPage;
