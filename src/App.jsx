import React, { useState, useMemo, useEffect, useContext, createContext } from 'react';
import { createClient } from '@supabase/supabase-js';

import {
  LayoutDashboard,
  Wallet,
  PieChart,
  Settings,
  LogOut,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Menu,
  X,
  Calendar,
  Filter,
  Sparkles,
  Loader2,
  Lightbulb,
  Target,
  ShoppingCart,
  Pencil,
  Trash2,
  Sun,
  Moon,
  AlertTriangle,
  Upload,
  Globe // Icon for currency
} from 'lucide-react';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

import * as pdfjsLib from 'pdfjs-dist';

// --- CONFIGURATION ---
// Worker for PDF.js (Specific Version 3.11.174)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

// --- CURRENCY CONSTANTS ---
const CURRENCIES = {
  KZT: { symbol: '₸', name: 'Kazakhstani Tenge', locale: 'ru-KZ' },
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
  RUB: { symbol: '₽', name: 'Russian Ruble', locale: 'ru-RU' },
};

// --- CONTEXTS ---
const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => { }
});

const CurrencyContext = createContext({
  currency: 'KZT',
  setCurrency: () => { },
  rates: {},
  convert: (amount) => amount,
  format: (amount) => String(amount),
  isLoading: false
});

// --- AI FUNCTION ---
const callGemini = async (prompt) => {
  if (!apiKey) return "Please check your Gemini API key.";

  try {
    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!listResponse.ok) throw new Error("Error accessing model list");
    const listData = await listResponse.json();
    const models = listData.models || [];

    let viableModel = models.find(m =>
      m.name.includes("flash") &&
      !m.name.includes("exp") &&
      m.supportedGenerationMethods.includes("generateContent")
    );

    if (!viableModel) viableModel = models.find(m => m.name.includes("flash"));
    if (!viableModel) viableModel = models[0];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${viableModel.name}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || response.statusText);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Empty response";

  } catch (error) {
    console.error("Gemini Error:", error);
    return `AI Error: ${error.message}`;
  }
};

// --- UI COMPONENTS ---

const Card = ({ children, className = '' }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const baseClasses = isDark
    ? 'bg-gray-800 border-gray-700 text-gray-100'
    : 'bg-white border-gray-100 text-gray-900';

  return (
    <div className={`rounded-xl shadow-sm border ${baseClasses} ${className}`}>
      {children}
    </div>
  );
};

const Button = ({ children, variant = 'primary', className = '', onClick, disabled, ...props }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200",
    outline: isDark
      ? "border border-gray-600 text-gray-300 hover:bg-gray-700"
      : "border border-gray-200 text-gray-700 hover:bg-gray-50",
    danger: "text-red-600 hover:bg-red-50",
    ghost: isDark
      ? "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
      : "text-gray-600 hover:bg-gray-100",
    ai: "bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-md shadow-purple-200",
    icon: isDark
      ? "p-2 hover:bg-gray-700 text-gray-400"
      : "p-2 hover:bg-gray-100 text-gray-600"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
};

// --- DATA CONSTANTS ---
const EXPENSE_CATEGORIES = ['Groceries', 'Transport', 'Housing', 'Entertainment', 'Health', 'Education', 'Dining Out', 'Clothing', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Gifts', 'Investments', 'Sales', 'Refunds', 'Other'];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// --- SUB-VIEWS ---

const SettingsView = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { currency, setCurrency, isLoading } = useContext(CurrencyContext);
  const isDark = theme === 'dark';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Settings</h2>
      <Card className="p-0 overflow-hidden">
        <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <h3 className={`text-lg font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Preferences</h3>
        </div>

        <div className="p-6 space-y-6">
          {/* Theme Selector */}
          <div className="flex items-center justify-between">
            <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>App Theme</span>
            <div className={`flex p-1 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <button
                onClick={() => theme !== 'light' && toggleTheme('light')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${theme === 'light'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
              >
                <Sun size={16} />
                <span>Light</span>
              </button>
              <button
                onClick={() => theme !== 'dark' && toggleTheme('dark')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${theme === 'dark'
                  ? 'bg-gray-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                <Moon size={16} />
                <span>Dark</span>
              </button>
            </div>
          </div>

          <hr className={isDark ? 'border-gray-700' : 'border-gray-100'} />

          {/* Currency Selector */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className={`font-medium block ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Display Currency</span>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                All amounts will be converted to this currency based on current rates.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isLoading && <Loader2 className="animate-spin text-gray-400" size={16} />}
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={`border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
              >
                {Object.keys(CURRENCIES).map(code => (
                  <option key={code} value={code}>
                    {CURRENCIES[code].symbol} {code}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

const ReportsView = ({ transactions }) => {
  const { theme } = useContext(ThemeContext);
  const { convert, format } = useContext(CurrencyContext); // Using Currency Context
  const isDark = theme === 'dark';
  const [topCategoriesType, setTopCategoriesType] = useState('expense');

  const gridColor = isDark ? "#374151" : "#f3f4f6";
  const axisColor = isDark ? "#9ca3af" : "#9ca3af";

  const monthlyData = useMemo(() => {
    const data = {};
    transactions.forEach(t => {
      const date = new Date(t.date);
      const key = date.toLocaleString('ru-RU', { month: 'short', year: 'numeric' });
      if (!data[key]) data[key] = { name: key, income: 0, expense: 0 };

      // Convert amount for display
      const convertedAmount = convert(Number(t.amount));

      if (t.type === 'income') data[key].income += convertedAmount;
      else data[key].expense += convertedAmount;
    });
    return Object.values(data).map(d => ({
      ...d,
      income: Math.round(d.income),
      expense: Math.round(d.expense)
    }));
  }, [transactions, convert]);

  const categoryRankData = useMemo(() => {
    const filteredTransactions = transactions.filter(t => t.type === topCategoriesType);
    const data = {};
    filteredTransactions.forEach(t => {
      if (!data[t.category]) data[t.category] = 0;
      data[t.category] += convert(Number(t.amount));
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [transactions, topCategoriesType, convert]);

  const expensePieData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const data = {};
    expenses.forEach(t => {
      if (!data[t.category]) data[t.category] = 0;
      data[t.category] += convert(Number(t.amount));
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, convert]);

  const incomePieData = useMemo(() => {
    const incomes = transactions.filter(t => t.type === 'income');
    const data = {};
    incomes.forEach(t => {
      if (!data[t.category]) data[t.category] = 0;
      data[t.category] += convert(Number(t.amount));
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, convert]);

  const kpi = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    const expenseTxns = transactions.filter(t => t.type === 'expense');
    const avgExpense = expenseTxns.length > 0 ? totalExpense / expenseTxns.length : 0;
    const maxExpense = expenseTxns.length > 0 ? Math.max(...expenseTxns.map(t => Number(t.amount))) : 0;

    return {
      savingsRate: Math.max(savingsRate, 0).toFixed(1),
      avgExpense: convert(avgExpense),
      maxExpense: convert(maxExpense)
    };
  }, [transactions, convert]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Target size={20} /></div>
            <h3 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Savings Rate</h3>
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{kpi.savingsRate}%</div>
          <p className="text-xs text-gray-400 mt-1">of total income</p>
        </Card>

        <Card className="p-6 border-l-4 border-l-orange-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><ShoppingCart size={20} /></div>
            <h3 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Avg. Expense</h3>
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{format(kpi.avgExpense)}</div>
          <p className="text-xs text-gray-400 mt-1">per transaction</p>
        </Card>

        <Card className="p-6 border-l-4 border-l-purple-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><TrendingUp size={20} /></div>
            <h3 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Max Purchase</h3>
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{format(kpi.maxExpense)}</div>
          <p className="text-xs text-gray-400 mt-1">single transaction</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 h-[400px]">
          <h3 className={`text-lg font-bold mb-6 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Income vs Expense</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} />
              <Tooltip formatter={(value) => format(value)} contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#000' }} />
              <Legend />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className={`text-lg font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Top 5 Categories</h3>
            <select
              value={topCategoriesType}
              onChange={(e) => setTopCategoriesType(e.target.value)}
              className={`border rounded-md text-sm p-1 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200 text-gray-700'}`}
            >
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={categoryRankData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={gridColor} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fill: axisColor, fontSize: 13 }} />
              <Tooltip formatter={(value) => format(value)} cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#000' }} />
              <Bar
                dataKey="value"
                name="Amount"
                fill={topCategoriesType === 'income' ? '#10b981' : '#6366f1'}
                radius={[0, 4, 4, 0]}
                barSize={30}
              >
                {categoryRankData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={topCategoriesType === 'income' ? ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'][index % 5] : ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'][index % 5]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 h-[400px]">
          <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Expense Structure</h3>
          {expensePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
              <RePieChart>
                <Pie
                  data={expensePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {expensePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => format(value)} contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#000' }} itemStyle={{ color: isDark ? '#fff' : '#000' }} />
                <Legend verticalAlign="bottom" height={36} />
              </RePieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">No data</div>
          )}
        </Card>

        <Card className="p-6 h-[400px]">
          <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Income Structure</h3>
          {incomePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
              <RePieChart>
                <Pie
                  data={incomePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {incomePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => format(value)} contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#000' }} itemStyle={{ color: isDark ? '#fff' : '#000' }} />
                <Legend verticalAlign="bottom" height={36} />
              </RePieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">No data</div>
          )}
        </Card>
      </div>
    </div>
  );
};

const LoginPage = ({ onLogin }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      if (onLogin && data.user) onLogin(data.user);
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    // 1. Проверка на пустые поля
    if (!email || !password) {
      setError("Пожалуйста, заполните Email и пароль");
      return;
    }
    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }

    setLoading(true);
    setError(null);

    // 2. Запрос к Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      setError(error.message);
    } else {
      // Supabase может вернуть user: null, если включено подтверждение почты, но не всегда ошибку
      if (data?.user && !data?.session) {
        alert('Регистрация успешна! Проверьте почту для подтверждения (включая папку Спам).');
      } else {
        // Если авто-подтверждение выключено
        alert('Вы успешно зарегистрировались!');
        if (onLogin && data.user) onLogin(data.user);
      }
    }
    setLoading(false);
  };

  const inputClass = isDark
    ? "w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-700 text-white placeholder-gray-400"
    : "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900";


  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Card className="w-full max-w-md p-8">
        <h1 className={`text-3xl font-bold text-center mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>CoinKeeper</h1>
        {error && <div className="mb-4 p-2 text-sm text-red-600 bg-red-100 rounded">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            required
          />
          <Button type="submit" className="w-full justify-center" disabled={loading}>
            {loading ? 'Loading...' : 'Login'}
          </Button>
          <Button type="button" variant="outline" className="w-full justify-center" onClick={handleSignup} disabled={loading}>
            Register
          </Button>
        </form>
      </Card>
    </div>
  );
};

const AddTransactionForm = ({ onSubmit, onClose, initialData }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const inputClass = isDark
    ? "w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-700 text-white placeholder-gray-400"
    : "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900";

  const [type, setType] = useState(initialData?.type || 'expense');
  const currentCategories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const [category, setCategory] = useState(() => {
    if (initialData?.category) {
      if (initialData.type === 'income' && INCOME_CATEGORIES.includes(initialData.category)) return initialData.category;
      if (initialData.type === 'expense' && EXPENSE_CATEGORIES.includes(initialData.category)) return initialData.category;
    }
    return currentCategories[0];
  });

  const [description, setDescription] = useState(initialData?.description || '');
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [amount, setAmount] = useState(initialData?.amount || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);

  const handleTypeChange = (newType) => {
    setType(newType);
    const newCats = newType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!newCats.includes(category)) {
      setCategory(newCats[0]);
    }
  };

  const handleAutoCategorize = async () => {
    if (!description) return;
    setIsCategorizing(true);

    const prompt = `
      Task: Determine the category for a ${type === 'income' ? 'income' : 'expense'} based on the description.
      Description: "${description}"
      Available Categories: ${currentCategories.join(', ')}
      
      Return ONLY the category name from the list. If unsure, return "Other".
    `;

    const predictedCategory = await callGemini(prompt);
    const cleanCategory = predictedCategory.trim().replace(/['"]/g, '');

    if (currentCategories.includes(cleanCategory)) {
      setCategory(cleanCategory);
    }
    setIsCategorizing(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      type,
      amount: Number(amount),
      category,
      date,
      description
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={`flex p-1 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <label className="flex-1 cursor-pointer">
          <input
            type="radio"
            name="type"
            value="expense"
            checked={type === 'expense'}
            onChange={() => handleTypeChange('expense')}
            className="peer sr-only"
          />
          <span className={`block text-center py-2 rounded-md text-sm font-medium transition-all ${type === 'expense'
            ? isDark ? 'bg-gray-600 text-red-400 shadow-sm' : 'bg-white text-red-600 shadow-sm'
            : isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
            Expense
          </span>
        </label>
        <label className="flex-1 cursor-pointer">
          <input
            type="radio"
            name="type"
            value="income"
            checked={type === 'income'}
            onChange={() => handleTypeChange('income')}
            className="peer sr-only"
          />
          <span className={`block text-center py-2 rounded-md text-sm font-medium transition-all ${type === 'income'
            ? isDark ? 'bg-gray-600 text-green-400 shadow-sm' : 'bg-white text-green-600 shadow-sm'
            : isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
            Income
          </span>
        </label>
      </div>

      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Amount (₸ - Tenge)</label>
        <input
          required
          name="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className={inputClass}
        />
        <p className="text-[10px] text-gray-400 mt-1">Always enter amount in Tenge. Viewing currency can be changed in settings.</p>
      </div>

      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
        <div className="flex gap-2">
          <input
            name="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Taxi to airport"
            className={`flex-1 ${inputClass}`}
          />
          <button
            type="button"
            onClick={handleAutoCategorize}
            disabled={!description || isCategorizing}
            className="bg-purple-100 text-purple-600 p-2 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
            title="Auto-categorize with AI"
          >
            {isCategorizing ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
          </button>
        </div>
      </div>

      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Category</label>
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClass}
        >
          {currentCategories.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>

      <div>
        <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Date</label>
        <input
          name="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
      </div>

      <Button type="submit" className="w-full justify-center mt-6">
        {initialData ? "Save Changes" : "Add Transaction"}
      </Button>
    </form>
  );
};

const NavItem = ({ id, icon: Icon, label, activeTab, onClick }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === id
        ? (isDark ? 'bg-gray-700 text-indigo-400 font-medium' : 'bg-indigo-50 text-indigo-600 font-medium')
        : (isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-50')
        }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
};

const ImportStatementModal = ({ onClose, onImport, isDark }) => {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
    setError(null);
  };

  const parseKaspiPDF = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target.result);

          // Document loading
          const loadingTask = pdfjsLib.getDocument({
            data: typedArray,
            useWorkerFetch: false,
            isEvalSupported: false,
            disableRange: true,
            disableStream: true,
            disableAutoFetch: true
          });

          const pdf = await loadingTask.promise;
          let fullText = '';

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += ' ' + pageText;
          }

          const cleanText = fullText.replace(/\s+/g, ' ').trim();

          // Transaction Regex
          const transactionRegex = /(.*?)\s(\d{2}\.\d{2}\.\d{2})\s([+-−]?\s?[\d\s]+,\d{2})\s?[₸T]/g;

          const transactions = [];
          let match;

          while ((match = transactionRegex.exec(cleanText)) !== null) {
            const rawDescription = match[1].trim();
            const dateStr = match[2];
            const amountStr = match[3];

            if (rawDescription.includes("Остаток") || rawDescription.includes("Всего")) continue;

            let cleanDescription = rawDescription;
            const lastTengeIndex = cleanDescription.lastIndexOf('₸');
            if (lastTengeIndex !== -1) {
              cleanDescription = cleanDescription.substring(lastTengeIndex + 1).trim();
            }

            const normalizedAmountStr = amountStr
              .replace(/\s/g, '')
              .replace(',', '.')
              .replace('−', '-');

            const amount = parseFloat(normalizedAmountStr);
            if (isNaN(amount)) continue;

            const type = amount > 0 ? 'income' : 'expense';
            const absAmount = Math.abs(amount);

            let category = type === 'income' ? 'Пополнение' : 'Прочее';

            const descUpper = cleanDescription.toUpperCase();
            if (descUpper.includes('MAGNUM')) category = 'Продукты';
            else if (descUpper.includes('ONAY') || descUpper.includes('TAXI') || descUpper.includes('UBER') || descUpper.includes('YANDEX')) category = 'Транспорт';
            else if (descUpper.includes('CAFE') || descUpper.includes('DONER') || descUpper.includes('RESTAURANT') || descUpper.includes('KFC')) category = 'Еда';
            else if (descUpper.includes('PHARMACY') || descUpper.includes('APTEKA')) category = 'Здоровье';
            else if (descUpper.includes('PEREVOD') || descUpper.includes('ПЕРЕВОД')) category = 'Переводы';
            else if (type === 'expense') category = 'Покупки';

            const [day, month, year] = dateStr.split('.');
            const formattedDate = `20${year}-${month}-${day}`;

            transactions.push({
              date: formattedDate,
              description: cleanDescription || 'Транзакция Kaspi',
              amount: absAmount,
              type,
              category
            });
          }

          if (transactions.length === 0) {
            console.warn("Regex did not find transactions. Check format:", cleanText.substring(0, 500));
            reject(new Error('Could not recognize transactions. PDF format might have changed.'));
          } else {
            resolve(transactions);
          }

        } catch (err) {
          console.error('PDF parsing error:', err);
          reject(new Error('Error processing PDF: ' + err.message));
        }
      };

      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImportClick = async () => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const transactions = await parseKaspiPDF(file);
      await onImport(transactions);

      onClose();
    } catch (err) {
      setError(err.message || 'Error importing file');
    } finally {
      setIsProcessing(false);
    }
  };

  const inputClass = isDark
    ? 'w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-700 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-gray-600 file:text-white hover:file:bg-gray-500 cursor-pointer'
    : 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200`}>
        <button
          onClick={onClose}
          className={`absolute right-4 top-4 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
            <Upload size={24} />
          </div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Import Kaspi Statement
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Upload PDF
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className={inputClass}
            />
          </div>

          {error && (
            <div className={`p-3 rounded-lg ${isDark ? 'bg-red-900/20 border border-red-700 text-red-400' : 'bg-red-50 border border-red-300 text-red-700'} text-sm`}>
              <div className="font-medium mb-1">❌ Import Error</div>
              <div className="text-xs">{error}</div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleImportClick}
              disabled={!file || isProcessing}
              className="flex-1 justify-center"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Processing...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Import
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // State Management
  const [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [monthlyLimit, setMonthlyLimit] = useState(null);

  // CURRENCY STATE
  const [currency, setCurrencyState] = useState('KZT');
  const [exchangeRates, setExchangeRates] = useState({ KZT: 1 });
  const [isRatesLoading, setIsRatesLoading] = useState(false);

  // UI State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [tempLimit, setTempLimit] = useState('');
  const [deletingTransactionId, setDeletingTransactionId] = useState(null);

  // AI State
  const [aiAdvice, setAiAdvice] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Filters & Sort
  const [sortBy, setSortBy] = useState('date-desc');
  const [filterCategory, setFilterCategory] = useState('All');

  const isDark = theme === 'dark';
  const axisColor = isDark ? "#9ca3af" : "#9ca3af";

  // --- CURRENCY LOGIC ---
  useEffect(() => {
    const fetchRates = async () => {
      setIsRatesLoading(true);
      try {
        // Using a free API to get rates relative to KZT
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/KZT');
        if (!res.ok) throw new Error('Failed to fetch rates');
        const data = await res.json();
        setExchangeRates(data.rates);
      } catch (e) {
        console.error("Error fetching rates:", e);
      } finally {
        setIsRatesLoading(false);
      }
    };
    fetchRates();
  }, []);

  const convertAmount = (amountKZT) => {
    if (currency === 'KZT') return amountKZT;
    const rate = exchangeRates[currency];
    if (!rate) return amountKZT;
    return amountKZT * rate;
  };

  const formatCurrency = (amount) => {
    const val = convertAmount(Number(amount));
    const { locale } = CURRENCIES[currency];

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(val);
  };

  const updateCurrency = (newCurrency) => {
    setCurrencyState(newCurrency);
    if (user) updateUserSettings({ currency: newCurrency });
  };

  // --- DATA LOGIC ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchUserSettings();
    } else {
      setTransactions([]);
      setMonthlyLimit(null);
      setTheme('light');
      setCurrencyState('KZT');
    }
  }, [user]);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (!error && data) setTransactions(data);
  };

  const fetchUserSettings = async () => {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      if (data.monthly_limit) setMonthlyLimit(Number(data.monthly_limit));
      if (data.theme) setTheme(data.theme);
      if (data.currency && CURRENCIES[data.currency]) setCurrencyState(data.currency);
    }
  };

  const updateUserSettings = async (updates) => {
    const { data: existing } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      await supabase.from('user_settings').update(updates).eq('user_id', user.id);
    } else {
      await supabase.from('user_settings').insert([{ user_id: user.id, ...updates }]);
    }
  };

  // --- ACTIONS ---

  const handleSaveTransaction = async (data) => {
    // NOTE: We always save transactions in KZT as the form input is in KZT
    const transactionData = {
      user_id: user.id,
      type: data.type,
      amount: Number(data.amount),
      category: data.category,
      date: data.date,
      description: data.description
    };

    let error;
    if (editingTransaction) {
      const { error: updateError } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', editingTransaction.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('transactions')
        .insert([transactionData]);
      error = insertError;
    }

    if (!error) {
      fetchTransactions();
      setShowAddModal(false);
      setEditingTransaction(null);
    }
  };

  const handleBulkImport = async (newTransactions) => {
    if (!newTransactions || newTransactions.length === 0) return;

    const sortedDates = [...newTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    const minDate = sortedDates[0].date;
    const maxDate = sortedDates[sortedDates.length - 1].date;

    const { data: existingTransactions, error } = await supabase
      .from('transactions')
      .select('date, amount, description, type')
      .eq('user_id', user.id)
      .gte('date', minDate)
      .lte('date', maxDate);

    if (error) {
      console.error('Error:', error);
      return;
    }

    const dbCounts = {};
    existingTransactions.forEach(t => {
      const key = `${t.date}|${Number(t.amount)}|${t.description.trim()}`;
      dbCounts[key] = (dbCounts[key] || 0) + 1;
    });

    const transactionsToAdd = [];
    newTransactions.forEach(txn => {
      const key = `${txn.date}|${Number(txn.amount)}|${txn.description.trim()}`;
      if (dbCounts[key] && dbCounts[key] > 0) {
        dbCounts[key]--;
      } else {
        transactionsToAdd.push(txn);
      }
    });

    if (transactionsToAdd.length === 0) {
      alert('⚠️ No new transactions found (duplicates skipped).');
      return;
    }

    const transactionsData = transactionsToAdd.map(txn => ({
      user_id: user.id,
      type: txn.type,
      amount: Number(txn.amount),
      category: txn.category,
      date: txn.date,
      description: txn.description
    }));

    const { error: insertError } = await supabase
      .from('transactions')
      .insert(transactionsData);

    if (!insertError) {
      fetchTransactions();
      alert(`✅ Successfully added: ${transactionsToAdd.length}`);
    } else {
      console.error(insertError);
    }
  };

  const handleDeleteClick = (id) => {
    setDeletingTransactionId(id);
  };

  const confirmDelete = async () => {
    if (deletingTransactionId) {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', deletingTransactionId);

      if (!error) {
        setTransactions(prev => prev.filter(t => t.id !== deletingTransactionId));
      }
      setDeletingTransactionId(null);
    }
  };

  const handleEditClick = (txn) => {
    setEditingTransaction(txn);
    setShowAddModal(true);
  };

  const toggleTheme = (newTheme) => {
    const nextTheme = newTheme || (theme === 'light' ? 'dark' : 'light');
    setTheme(nextTheme);
    if (user) updateUserSettings({ theme: nextTheme });
  };

  const handleSaveLimit = () => {
    if (tempLimit && !isNaN(tempLimit) && Number(tempLimit) > 0) {
      const limit = Number(tempLimit);
      setMonthlyLimit(limit);
      if (user) updateUserSettings({ monthly_limit: limit });
      setIsEditingLimit(false);
      setTempLimit('');
    }
  };

  const handleDeleteLimit = () => {
    setMonthlyLimit(null);
    if (user) updateUserSettings({ monthly_limit: null });
    setIsEditingLimit(false);
  };

  // --- CALC ---

  const stats = useMemo(() => {
    // Stats are calculated in BASE currency (KZT)
    const income = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const pieChartData = useMemo(() => {
    // For main page charts, convert data
    const expenses = transactions.filter(t => t.type === 'expense');
    const data = {};
    expenses.forEach(t => {
      if (!data[t.category]) data[t.category] = 0;
      data[t.category] += convertAmount(Number(t.amount));
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, currency, exchangeRates]);

  const categories = useMemo(() => {
    const unique = new Set(transactions.map(t => t.category));
    return ['All', ...Array.from(unique)];
  }, [transactions]);

  const processedTransactions = useMemo(() => {
    let result = [...transactions];
    if (filterCategory !== 'All') result = result.filter(t => t.category === filterCategory);
    result.sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
      return 0;
    });
    return result;
  }, [transactions, sortBy, filterCategory]);

  const handleGetAiAdvice = async () => {
    setIsAiLoading(true);
    setAiAdvice(null);

    const prompt = `
      You are a financial analyst. Analyze this data:
      Income: ${stats.income} KZT
      Expense: ${stats.expense} KZT
      Balance: ${stats.balance} KZT
      Limit: ${monthlyLimit ? monthlyLimit + ' KZT' : 'Not set'}
      Recent 5 transactions: ${JSON.stringify(transactions.slice(0, 5))}
      
      Give 2-3 very short, actionable pieces of advice in Russian to improve financial health. Use emojis. No intro text.
    `;

    const result = await callGemini(prompt);
    setAiAdvice(result);
    setIsAiLoading(false);
  };

  const selectClass = isDark
    ? "appearance-none w-full sm:w-48 pl-10 pr-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-700 text-white cursor-pointer"
    : "appearance-none w-full sm:w-48 pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer text-gray-700";

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <CurrencyContext.Provider value={{
        currency,
        setCurrency: updateCurrency,
        rates: exchangeRates,
        convert: convertAmount,
        format: formatCurrency,
        isLoading: isRatesLoading
      }}>
        {!user ? (
          <LoginPage onLogin={(user) => setUser(user)} />
        ) : (
          <div className={`flex h-screen ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'} font-sans overflow-hidden transition-colors duration-300`}>
            {/* Sidebar (Desktop) */}
            <aside className={`hidden md:flex w-64 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex-col z-20 transition-colors duration-300`}>
              <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} flex items-center gap-2`}>
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">C</div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>CoinKeeper</h1>
              </div>

              <nav className="flex-1 p-4 space-y-2">
                <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" activeTab={activeTab} onClick={() => setActiveTab('dashboard')} />
                <NavItem id="transactions" icon={Wallet} label="Transactions" activeTab={activeTab} onClick={() => setActiveTab('transactions')} />
                <NavItem id="reports" icon={PieChart} label="Reports" activeTab={activeTab} onClick={() => setActiveTab('reports')} />
                <NavItem id="settings" icon={Settings} label="Settings" activeTab={activeTab} onClick={() => setActiveTab('settings')} />
              </nav>

              <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <Button variant="ghost" className="w-full justify-start" onClick={() => supabase.auth.signOut()}>
                  <LogOut size={20} />
                  <span>Logout</span>
                </Button>
              </div>
            </aside>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
              <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                <div className={`absolute left-0 top-0 bottom-0 w-64 ${isDark ? 'bg-gray-800' : 'bg-white'} p-4`} onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : ''}`}>Menu</h2>
                    <button onClick={() => setIsMobileMenuOpen(false)} className={isDark ? 'text-white' : ''}><X /></button>
                  </div>
                  <nav className="space-y-2">
                    <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" activeTab={activeTab} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} />
                    <NavItem id="transactions" icon={Wallet} label="Transactions" activeTab={activeTab} onClick={() => { setActiveTab('transactions'); setIsMobileMenuOpen(false); }} />
                    <NavItem id="reports" icon={PieChart} label="Reports" activeTab={activeTab} onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }} />
                    <NavItem id="settings" icon={Settings} label="Settings" activeTab={activeTab} onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} />
                  </nav>
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
              {/* Header */}
              <header className={`h-16 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b flex items-center justify-between px-4 md:px-8 flex-shrink-0 transition-colors duration-300`}>
                <div className="flex items-center gap-4">
                  <button className="md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
                    <Menu size={24} className={isDark ? 'text-white' : ''} />
                  </button>
                  <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {activeTab === 'dashboard' ? 'Overview' :
                      activeTab === 'transactions' ? 'Transaction History' :
                        activeTab === 'reports' ? 'Analytics' : 'Settings'}
                  </h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex h-8 w-8 rounded-full bg-indigo-100 items-center justify-center text-indigo-700 font-bold text-sm">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </div>
              </header>

              {/* Scrollable Area */}
              <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">

                {/* Dashboard Content */}
                {activeTab === 'dashboard' && (
                  <>
                    {/* AI Advisor Section */}
                    <section className={`p-6 rounded-xl border relative overflow-hidden ${isDark ? 'bg-gradient-to-r from-gray-800 to-gray-700 border-gray-700' : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100'}`}>
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Sparkles size={120} className="text-indigo-600" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg shadow-sm ${isDark ? 'bg-gray-700 text-indigo-400' : 'bg-white text-indigo-600'}`}>
                              <Lightbulb size={24} />
                            </div>
                            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Smart Advisor</h3>
                          </div>
                          {!aiAdvice && (
                            <Button variant="ai" onClick={handleGetAiAdvice} disabled={isAiLoading}>
                              {isAiLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                              {isAiLoading ? 'Thinking...' : 'Get Advice'}
                            </Button>
                          )}
                        </div>

                        {aiAdvice ? (
                          <div className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-white/80 border-indigo-100 text-gray-700'} backdrop-blur-sm p-4 rounded-lg border animate-in fade-in slide-in-from-bottom-2`}>
                            <p className="whitespace-pre-line leading-relaxed">{aiAdvice}</p>
                            <button onClick={() => setAiAdvice(null)} className="text-xs text-indigo-500 mt-2 font-medium hover:underline">Hide Advice</button>
                          </div>
                        ) : (
                          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} max-w-xl`}>
                            Tap the button to have AI analyze your monthly income and expenses to provide personalized recommendations.
                          </p>
                        )}
                      </div>
                    </section>

                    {/* Summary Cards */}
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                      <Card className="p-6 flex items-center justify-between border-l-4 border-l-green-500">
                        <div>
                          <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Income</p>
                          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(stats.income)}</h3>
                        </div>
                        <div className={`p-3 rounded-full hidden sm:block ${isDark ? 'bg-gray-700 text-green-400' : 'bg-green-50 text-green-600'}`}>
                          <TrendingUp size={24} />
                        </div>
                      </Card>

                      <Card className="p-6 flex items-center justify-between border-l-4 border-l-red-500">
                        <div>
                          <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Expenses</p>
                          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(stats.expense)}</h3>
                        </div>
                        <div className={`p-3 rounded-full hidden sm:block ${isDark ? 'bg-gray-700 text-red-400' : 'bg-red-50 text-red-600'}`}>
                          <TrendingDown size={24} />
                        </div>
                      </Card>

                      <Card className="p-6 flex items-center justify-between border-l-4 border-l-indigo-500">
                        <div>
                          <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Balance</p>
                          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(stats.balance)}</h3>
                        </div>
                        <div className={`p-3 rounded-full hidden sm:block ${isDark ? 'bg-gray-700 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                          <DollarSign size={24} />
                        </div>
                      </Card>

                      {/* Monthly Limit Card */}
                      <Card className={`p-6 border-l-4 ${monthlyLimit && stats.expense > monthlyLimit ? 'border-l-red-600' : 'border-l-orange-500'} flex flex-col justify-center`}>
                        {(monthlyLimit === null || monthlyLimit === 0) && !isEditingLimit ? (
                          <button
                            onClick={() => setIsEditingLimit(true)}
                            className="flex flex-col items-center justify-center h-full text-orange-500 hover:text-orange-600 gap-2"
                          >
                            <Plus size={24} />
                            <span className="font-medium text-sm">Set Budget Limit</span>
                          </button>
                        ) : isEditingLimit ? (
                          <div className="flex flex-col gap-2">
                            <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Monthly Limit (KZT)</p>
                            <input
                              type="number"
                              value={tempLimit}
                              onChange={(e) => setTempLimit(e.target.value)}
                              placeholder="Amount"
                              className={`w-full px-3 py-1 border rounded text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                              autoFocus
                            />
                            <div className="flex gap-2 mt-1">
                              <button onClick={handleSaveLimit} className="flex-1 bg-indigo-600 text-white py-1 rounded text-xs">Save</button>
                              <button onClick={() => { setIsEditingLimit(false); setTempLimit(''); }} className={`flex-1 py-1 rounded text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Monthly Limit</p>
                                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(monthlyLimit || 0)}</h3>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => { setTempLimit(monthlyLimit); setIsEditingLimit(true); }} className={`p-1 rounded ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`} title="Edit"><Pencil size={14} /></button>
                                <button onClick={handleDeleteLimit} className={`p-1 rounded text-red-500 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`} title="Remove"><Trash2 size={14} /></button>
                              </div>
                            </div>
                            <div className={`w-full rounded-full h-2 mb-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                              <div
                                className={`h-2 rounded-full ${stats.expense > monthlyLimit ? 'bg-red-500' : 'bg-green-500'}`}
                                style={{ width: `${monthlyLimit ? Math.min((stats.expense / monthlyLimit) * 100, 100) : 0}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-400 text-right">
                              {monthlyLimit && stats.expense > monthlyLimit
                                ? 'Limit Exceeded!'
                                : monthlyLimit
                                  ? `Left: ${formatCurrency(monthlyLimit - stats.expense)} (${Math.round(((monthlyLimit - stats.expense) / monthlyLimit) * 100)}%)`
                                  : 'No Limit'}
                            </p>
                          </div>
                        )}
                      </Card>
                    </section>

                    {/* Charts */}
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <Card className="lg:col-span-2 p-6 h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Financial Trends</h3>
                        </div>
                        <ResponsiveContainer width="100%" height="85%">
                          <AreaChart data={(() => {
                            const grouped = {};
                            transactions.forEach(t => {
                              if (!grouped[t.date]) grouped[t.date] = { name: t.date, income: 0, expense: 0 };
                              // Convert values for chart
                              if (t.type === 'income') grouped[t.date].income += convertAmount(Number(t.amount));
                              else grouped[t.date].expense += convertAmount(Number(t.amount));
                            });
                            return Object.values(grouped).sort((a, b) => new Date(a.name) - new Date(b.name)).map(d => ({ ...d, income: Math.round(d.income), expense: Math.round(d.expense) }));
                          })()}>

                            <defs>
                              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#374151" : "#f3f4f6"} />
                            <XAxis
                              dataKey="name"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: axisColor, fontSize: 12 }}
                              tickFormatter={(val) => new Date(val).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            />

                            <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} />
                            <Tooltip
                              formatter={(val) => formatCurrency(val)}
                              contentStyle={{
                                backgroundColor: isDark ? '#1f2937' : '#fff',
                                borderColor: isDark ? '#374151' : '#e5e7eb',
                                color: isDark ? '#fff' : '#000'
                              }}
                            />
                            <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" name="Income" />
                            <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" name="Expense" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Card>

                      <Card className="p-6 h-[400px]">
                        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Expenses by Category</h3>
                        <ResponsiveContainer width="100%" height="85%">
                          <RePieChart>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            >

                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => formatCurrency(value)}
                              contentStyle={{
                                backgroundColor: isDark ? '#1f2937' : '#fff',
                                borderColor: isDark ? '#374151' : '#e5e7eb',
                                color: isDark ? '#fff' : '#000'
                              }}
                              itemStyle={{
                                color: isDark ? '#fff' : '#000'
                              }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                          </RePieChart>
                        </ResponsiveContainer>
                      </Card>
                    </section>

                    {/* Recent Ops */}
                    <section>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Recent Transactions</h3>
                        <Button variant="ghost" onClick={() => setActiveTab('transactions')}>View All</Button>
                      </div>
                      <div className="space-y-3">
                        {transactions.slice(0, 4).map((txn) => (
                          <Card key={txn.id} className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${txn.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                }`}>
                                {txn.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                              </div>
                              <div>
                                <p className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{txn.category}</p>
                                <p className="text-xs text-gray-500">{txn.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`block font-bold ${txn.type === 'income' ? 'text-green-600' : isDark ? 'text-gray-200' : 'text-gray-900'
                                }`}>
                                {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                              </span>
                              <span className="text-xs text-gray-400">{txn.date}</span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </section>
                  </>
                )}

                {/* Transactions Content */}
                {activeTab === 'transactions' && (
                  <Card className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">

                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="relative">
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className={selectClass}
                          >
                            <option value="date-desc">Newest First</option>
                            <option value="date-asc">Oldest First</option>
                          </select>
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                            <Calendar size={16} />
                          </div>
                        </div>

                        <div className="relative">
                          <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className={selectClass}
                          >
                            <option value="All">All Categories</option>
                            {categories.filter(c => c !== 'All').map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                            <Filter size={16} />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          onClick={() => setShowImportModal(true)}
                          variant="outline"
                          className="flex-1 sm:flex-initial justify-center"
                        >
                          <Upload size={18} />
                          Import
                        </Button>
                        <Button
                          onClick={() => { setEditingTransaction(null); setShowAddModal(true); }}
                          className="flex-1 sm:flex-initial justify-center"
                        >
                          <Plus size={18} />
                          Add
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className={`${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-500'} text-xs uppercase`}>
                          <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Category</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 rounded-tr-lg text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                          {processedTransactions.length > 0 ? (
                            processedTransactions.map((txn) => (
                              <tr key={txn.id} className={`${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} group transition-colors`}>
                                <td className={`px-4 py-3 font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{txn.category}</td>
                                <td className="px-4 py-3 text-gray-500 text-sm">{txn.date}</td>
                                <td className="px-4 py-3 text-gray-500 text-sm">{txn.description}</td>
                                <td className={`px-4 py-3 text-right font-bold ${txn.type === 'income' ? 'text-green-600' : isDark ? 'text-gray-200' : 'text-gray-900'
                                  }`}>
                                  {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => handleEditClick(txn)}
                                      className={`p-2 rounded-lg transition-colors ${isDark ? 'text-indigo-400 hover:bg-gray-600' : 'text-indigo-600 hover:bg-indigo-50'}`}
                                      title="Edit"
                                    >
                                      <Pencil size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClick(txn.id)}
                                      className={`p-2 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-gray-600' : 'text-red-500 hover:bg-red-50'}`}
                                      title="Delete"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="px-4 py-8 text-center text-gray-400">
                                No transactions found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {/* Reports Content */}
                {activeTab === 'reports' && (
                  <ReportsView transactions={transactions} />
                )}

                {/* Settings Content */}
                {activeTab === 'settings' && (
                  <SettingsView />
                )}
              </main>

              {/* Floating Action Button (Mobile) */}
              <button
                onClick={() => { setEditingTransaction(null); setShowAddModal(true); }}
                className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 z-30"
              >
                <Plus size={28} />
              </button>
            </div>

            {/* Add Transaction Modal */}
            {showAddModal && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200`}>
                  <button
                    onClick={() => { setShowAddModal(false); setEditingTransaction(null); }}
                    className={`absolute right-4 top-4 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <X size={24} />
                  </button>

                  <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {editingTransaction ? "Edit Transaction" : "New Transaction"}
                  </h2>

                  <AddTransactionForm
                    onSubmit={handleSaveTransaction}
                    onClose={() => { setShowAddModal(false); setEditingTransaction(null); }}
                    initialData={editingTransaction}
                  />
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingTransactionId && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-2xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in duration-200`}>
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                      <AlertTriangle size={24} />
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Delete Transaction?</h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Are you sure you want to delete this record? This action cannot be undone.
                    </p>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setDeletingTransactionId(null)}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDelete}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm shadow-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
              <ImportStatementModal
                onClose={() => setShowImportModal(false)}
                onImport={handleBulkImport}
                isDark={isDark}
              />
            )}
          </div>
        )}
      </CurrencyContext.Provider>
    </ThemeContext.Provider>
  );
}