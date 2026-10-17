'use client';

import React, { useState } from 'react';
import { usePharmacy } from '@/lib/store';
import {
  Sparkles,
  TrendingUp,
  BrainCircuit,
  Boxes,
  Clock,
  Send,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Package,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChatMessage {
  id: string;
  sender: 'AI' | 'USER';
  text: string;
  timestamp: string;
  suggestions?: string[];
}

export const AIAssistantView: React.FC = () => {
  const {
    medicines,
    invoices,
    suppliers,
    getAIReorderRecommendations,
    getAINearExpiryStrategies,
    setActiveTab,
  } = usePharmacy();

  const [activeSubTab, setActiveSubTab] = useState<'FORECAST' | 'REORDER' | 'PRICING' | 'CHAT'>('FORECAST');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'AI',
      text: "Hello! I am your Bhalerao Medical AI Clinical & Pharmacy ERP Intelligence Assistant. I've analyzed your past 30 days of sales velocity, batch expiry schedules, and current inventory. How can I assist you with stock planning or drug interactions today?",
      timestamp: 'Just now',
      suggestions: [
        'Which medicines should I reorder immediately?',
        'Suggest clearance strategy for near-expiry batches',
        'Show 30-day demand forecast',
        'Check antibiotics sales growth',
      ],
    },
  ]);

  const reorderRecommendations = getAIReorderRecommendations();
  const nearExpiryStrategies = getAINearExpiryStrategies();

  // AI Demand Forecast 30-day projection
  const forecastData = [
    { day: 'Day 1-5', actual: 42000, projected: 43500 },
    { day: 'Day 6-10', actual: 48000, projected: 49200 },
    { day: 'Day 11-15', actual: 51000, projected: 53000 },
    { day: 'Day 16-20', actual: 56000, projected: 58500 },
    { day: 'Day 21-25', actual: null, projected: 64000 },
    { day: 'Day 26-30', actual: null, projected: 71000 },
  ];

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'USER',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');

    // Generate intelligent AI response based on real store state
    setTimeout(() => {
      let aiReply = '';
      const q = text.toLowerCase();

      if (q.includes('reorder') || q.includes('order')) {
        const top3 = reorderRecommendations.slice(0, 3);
        aiReply = `Based on current sales run rates, you should place orders for:\n1. **${top3[0]?.medicineName}**: Order ~${top3[0]?.recommendedOrderQty} units (Only ${top3[0]?.daysRemaining} days of stock remaining).\n2. **${top3[1]?.medicineName}**: Order ~${top3[1]?.recommendedOrderQty} units.\n3. **${top3[2]?.medicineName}**: Order ~${top3[2]?.recommendedOrderQty} units.\nEstimated replenishment capital required: ₹${reorderRecommendations.slice(0, 3).reduce((s, i) => s + i.estimatedCost, 0).toLocaleString('en-IN')}.`;
      } else if (q.includes('expiry') || q.includes('clearance')) {
        aiReply = `I found **${nearExpiryStrategies.length} batches** requiring action. I recommend putting **Dolo 650 (Batch DL65-812)** on a **25% clearance discount** to prevent expiration write-down, and returning any zero-day expired stock to **MedSource Pharma** with a Debit Note.`;
      } else if (q.includes('forecast') || q.includes('demand')) {
        aiReply = `The predictive model projects a **14.5% surge in respiratory and cough medication demand** over the next 15 days due to seasonal monsoon changes. Ensure minimum 60 units buffer for Ascoril-D and Montair-LC.`;
      } else {
        aiReply = `I've analyzed your database for "${text}". Your pharmacy currently holds ₹${medicines.reduce((s, m) => s + m.batches.reduce((bs, b) => bs + b.availableQuantity * b.purchaseRate, 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} in stock with healthy Gross Margin averaging ~21.4%. Let me know if you would like me to prepare an auto-purchase requisition!`;
      }

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'AI',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white shadow-xl flex flex-wrap items-center justify-between gap-4 border border-purple-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Neural AI Pharmacy Engine
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            AI Demand Forecasting & Autonomous Reorder Suite
          </h2>
          <p className="text-xs text-purple-200 max-w-xl mt-1">
            Machine-learning driven safety stock recommendations, near-expiry dynamic pricing, and interactive clinical assistant.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(['FORECAST', 'REORDER', 'PRICING', 'CHAT'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === tab
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-black'
                  : 'bg-white/10 hover:bg-white/20 text-purple-200'
              }`}
            >
              {tab === 'FORECAST' && '1. Demand Forecast'}
              {tab === 'REORDER' && '2. Auto Reorder'}
              {tab === 'PRICING' && '3. Markdown Optimizer'}
              {tab === 'CHAT' && '4. AI Pharmacy Chat'}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Tab 1: Demand Forecast */}
      {activeSubTab === 'FORECAST' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400">Projected 30-Day Revenue</span>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1">₹7,45,000</p>
              <span className="text-xs font-bold text-emerald-600">↑ +14.2% Growth Confidence (96%)</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400">High Velocity Category</span>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">Antibiotics & Cough</p>
              <span className="text-xs text-purple-600 font-semibold">Seasonal weather impact detected</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400">Estimated Working Capital Need</span>
              <p className="text-2xl font-black text-indigo-600 font-mono mt-1">₹1,85,000</p>
              <span className="text-xs text-slate-500">For optimal 30-day buffer replenishment</span>
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-3">
              Predictive 30-Day Sales Run Rate (Actual vs Projected AI Curve)
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData}>
                  <defs>
                    <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" fontSize={11} stroke="#94a3b8" />
                  <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="projected"
                    name="AI Forecasted Run Rate"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    fill="url(#projGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Auto Reorder Suggestions */}
      {activeSubTab === 'REORDER' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                AI Smart Reorder Recommendations ({reorderRecommendations.length})
              </h3>
              <p className="text-xs text-slate-500">
                Calculated based on 7-day velocity, safety thresholds, and supplier lead times.
              </p>
            </div>

            <button
              onClick={() => setActiveTab('purchases')}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md"
            >
              + Create Purchase Order (PO)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="p-2.5">Medicine & Generic</th>
                  <th className="p-2.5 text-center">Stock In Hand</th>
                  <th className="p-2.5 text-center">Run Rate (Units/Day)</th>
                  <th className="p-2.5 text-center">Stockout In</th>
                  <th className="p-2.5 text-center">Suggested Order</th>
                  <th className="p-2.5 text-right">Est. Cost (₹)</th>
                  <th className="p-2.5">AI Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {reorderRecommendations.map((rec) => (
                  <tr key={rec.medicineId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-2.5">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{rec.medicineName}</p>
                      <p className="text-[10px] text-slate-400">{rec.genericName}</p>
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold">{rec.currentStock}</td>
                    <td className="p-2.5 text-center font-mono text-emerald-600 font-bold">{rec.salesVelocityPerDay}/d</td>
                    <td className="p-2.5 text-center font-mono">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.daysRemaining <= 7
                            ? 'bg-rose-500/10 text-rose-600 font-black animate-pulse'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}
                      >
                        ~{rec.daysRemaining} days
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-mono font-black text-purple-600 dark:text-purple-400 text-sm">
                      {rec.recommendedOrderQty} units
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      ₹{rec.estimatedCost.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-xs text-slate-500">{rec.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Markdown Optimizer */}
      {activeSubTab === 'PRICING' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden p-6 space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
            Near-Expiry Clearance Pricing & Loss Prevention Strategies
          </h3>
          <div className="space-y-3">
            {nearExpiryStrategies.map((strat, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{strat.medicineName}</span>
                    <span className="font-mono text-xs text-slate-500">Batch: {strat.batchNumber}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-600">
                      {strat.daysToExpiry <= 0 ? 'EXPIRED' : `${strat.daysToExpiry}d to Expiry`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{strat.rationale}</p>
                </div>

                <div className="flex items-center gap-3">
                  {strat.suggestedDiscountPercent > 0 && (
                    <span className="px-3 py-1 rounded-xl bg-purple-600 text-white text-xs font-black">
                      Suggest -{strat.suggestedDiscountPercent}% Off
                    </span>
                  )}
                  <button
                    onClick={() => setActiveTab('expiry')}
                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
                  >
                    Execute Action →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Interactive AI Chat */}
      {activeSubTab === 'CHAT' && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col h-[520px]">
          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${msg.sender === 'USER' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div
                  className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                    msg.sender === 'AI' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-800 text-white'
                  }`}
                >
                  {msg.sender === 'AI' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed space-y-2 ${
                    msg.sender === 'USER'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span className="text-[9px] opacity-60 block text-right font-mono">{msg.timestamp}</span>

                  {msg.suggestions && (
                    <div className="pt-2 flex flex-wrap gap-1.5 border-t border-slate-200 dark:border-slate-700">
                      {msg.suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(s)}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-purple-50 text-purple-700 dark:text-purple-300 text-[10px] font-bold transition-colors shadow-sm"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder="Ask AI about stock levels, reorder timing, drug formulas, or pricing strategies..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            <button
              onClick={() => handleSendMessage()}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20"
            >
              <Send className="h-4 w-4" />
              Ask AI
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
