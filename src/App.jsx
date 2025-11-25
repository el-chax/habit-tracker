import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar,
  BarChart2,
  Check,
  X,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  Unlock,
  Copy,
  PieChart,
  Activity,
  TrendingUp,
  Award,
  Zap,
  LogOut,
  User,
  Loader2,
  AlertTriangle,
  Menu,
} from "lucide-react";

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCyEOVq_ik881nYGRNdtFg6CPr-klb3Ut0",
  authDomain: "habit-tracker-f3fa.firebaseapp.com",
  projectId: "habit-tracker-f3fa",
  storageBucket: "habit-tracker-f3fa.firebasestorage.app",
  messagingSenderId: "636417310006",
  appId: "1:636417310006:web:16e7beb3325e369945c797",
};

let app, auth, db;
let isConfigured = false;
try {
  if (
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes("YOUR_API_KEY")
  ) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    isConfigured = true;
  }
} catch (e) {
  console.error(e);
}

const PRESET_ICONS = [
  "💪",
  "🏃",
  "💧",
  "🧘",
  "📚",
  "💤",
  "🥗",
  "🚭",
  "💰",
  "💻",
  "🎨",
  "🎵",
  "🧹",
  "💊",
  "⚙️",
  "📝",
  "📵",
  "🚶",
];
const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [joinedDate, setJoinedDate] = useState(null);

  const [monthlyHabits, setMonthlyHabits] = useState({});
  const [checks, setChecks] = useState({});

  const [showIntro, setShowIntro] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const profileRef = useRef(null);

  const [darkMode, setDarkMode] = useState(() =>
    JSON.parse(localStorage.getItem("ht_dark") || "true"),
  );
  const [strictMode, setStrictMode] = useState(() =>
    JSON.parse(localStorage.getItem("ht_strict") || "true"),
  );

  const [activeTab, setActiveTab] = useState("tracker");
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualHabitName, setManualHabitName] = useState("");
  const [manualHabitIcon, setManualHabitIcon] = useState("✨");

  const theme = darkMode
    ? {
        bg: "bg-[#09090b]",
        text: "text-zinc-100",
        textMuted: "text-zinc-500",
        card: "bg-[#121214]",
        cardLight: "bg-[#18181b]",
        border: "border-zinc-800",
        tabBorder: "border-zinc-800",
        accent: "text-emerald-400",
        accentBg: "bg-emerald-500",
        hover: "hover:bg-zinc-800",
        gridHeader: "bg-[#09090b]",
        gridBorder: "border-zinc-800",
        checkBg: "bg-emerald-900/30",
        checkFill: "bg-emerald-500",
        scrollThumb: "#3f3f46",
        scrollTrack: "transparent",
      }
    : {
        bg: "bg-[#fafafa]",
        text: "text-zinc-900",
        textMuted: "text-zinc-400",
        card: "bg-white",
        cardLight: "bg-zinc-50",
        border: "border-zinc-200",
        tabBorder: "border-zinc-200",
        accent: "text-emerald-700",
        accentBg: "bg-emerald-600",
        hover: "hover:bg-zinc-50",
        gridHeader: "bg-[#fafafa]",
        gridBorder: "border-zinc-200",
        checkBg: "bg-emerald-50",
        checkFill: "bg-emerald-600",
        scrollThumb: "#d4d4d8",
        scrollTrack: "transparent",
      };

  useEffect(() => {
    if (!isConfigured) {
      setLoadingAuth(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setImgError(false);
      if (currentUser) {
        const metaRef = doc(db, "users", currentUser.uid, "data", "metadata");
        try {
          const metaSnap = await getDoc(metaRef);
          if (metaSnap.exists() && metaSnap.data().joined) {
            setJoinedDate(new Date(metaSnap.data().joined));
          } else {
            const now = new Date();
            await setDoc(
              metaRef,
              { joined: now.toISOString() },
              { merge: true },
            );
            setJoinedDate(now);
          }
        } catch (e) {
          setJoinedDate(new Date());
        }
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setMonthlyHabits({});
      setChecks({});
      return;
    }
    const unsubHabits = onSnapshot(
      doc(db, "users", user.uid, "data", "habits"),
      (docSnap) => {
        if (docSnap.exists()) setMonthlyHabits(docSnap.data());
        else setMonthlyHabits({});
      },
    );
    const unsubChecks = onSnapshot(
      doc(db, "users", user.uid, "data", "checks"),
      (docSnap) => {
        if (docSnap.exists()) setChecks(docSnap.data());
        else setChecks({});
      },
    );
    return () => {
      unsubHabits();
      unsubChecks();
    };
  }, [user]);

  useEffect(() => {
    localStorage.setItem("ht_dark", JSON.stringify(darkMode));
  }, [darkMode]);
  useEffect(() => {
    localStorage.setItem("ht_strict", JSON.stringify(strictMode));
  }, [strictMode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileRef]);

  const saveHabitsToCloud = async (newHabits) => {
    if (!user) return;
    setMonthlyHabits(newHabits);
    try {
      await setDoc(doc(db, "users", user.uid, "data", "habits"), newHabits);
    } catch (e) {}
  };

  const saveChecksToCloud = async (newChecks) => {
    if (!user) return;
    setChecks(newChecks);
    try {
      await setDoc(doc(db, "users", user.uid, "data", "checks"), newChecks);
    } catch (e) {}
  };

  const getMonthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentMonthKey = getMonthKey(currentDate);
  const currentHabits = monthlyHabits[currentMonthKey] || [];
  const getDaysInMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  let startDay = 1;
  let isBeforeJoinedMonth = false;
  let isFirstMonth = true;

  if (joinedDate) {
    const joinedYear = joinedDate.getFullYear();
    const joinedMonth = joinedDate.getMonth();

    if (
      currentYear < joinedYear ||
      (currentYear === joinedYear && currentMonth < joinedMonth)
    ) {
      isBeforeJoinedMonth = true;
    } else if (currentYear === joinedYear && currentMonth === joinedMonth) {
      startDay = joinedDate.getDate();
      isFirstMonth = true;
    } else {
      isFirstMonth = false;
    }
  }

  const endDay = getDaysInMonth(currentDate);
  const totalDaysShown = Math.max(0, endDay - startDay + 1);
  const today = new Date();
  const isPastMonth =
    currentYear < today.getFullYear() ||
    (currentYear === today.getFullYear() && currentMonth < today.getMonth());

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    if (joinedDate) {
      const joinedReset = new Date(
        joinedDate.getFullYear(),
        joinedDate.getMonth(),
        1,
      );
      if (newDate < joinedReset) return;
    }
    setCurrentDate(newDate);
  };

  const handleLogin = async () => {
    if (!isConfigured) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (error.code === "auth/unauthorized-domain") {
        alert(
          `Login Blocked: Add "${window.location.hostname}" to Firebase Authorized Domains.`,
        );
      }
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setIsProfileOpen(false);
  };

  const toggleCheck = (habitId, day) => {
    if (isPastMonth) return;
    if (strictMode) {
      const isToday =
        day === today.getDate() &&
        currentMonth === today.getMonth() &&
        currentYear === today.getFullYear();
      if (!isToday) return;
    }
    const key = `${habitId}-${currentYear}-${currentMonth}-${day}`;
    const newChecks = { ...checks };
    if (newChecks[key]) delete newChecks[key];
    else newChecks[key] = true;
    saveChecksToCloud(newChecks);
  };

  const deleteHabit = (id, e) => {
    e.stopPropagation();
    if (isPastMonth) return;
    const newMonthHabits = {
      ...monthlyHabits,
      [currentMonthKey]: (monthlyHabits[currentMonthKey] || []).filter(
        (h) => h.id !== id,
      ),
    };
    saveHabitsToCloud(newMonthHabits);
  };

  const addManualHabit = () => {
    if (!manualHabitName.trim()) return;
    if (isPastMonth) return;

    const normalizedName = manualHabitName.trim().toLowerCase();
    const exists = currentHabits.some(
      (h) => h.name.trim().toLowerCase() === normalizedName,
    );
    if (exists) return alert("Habit already exists.");

    const newHabit = {
      id: Date.now(),
      name: manualHabitName,
      icon: manualHabitIcon,
    };
    const newMonthHabits = {
      ...monthlyHabits,
      [currentMonthKey]: [...(monthlyHabits[currentMonthKey] || []), newHabit],
    };
    saveHabitsToCloud(newMonthHabits);
    setManualHabitName("");
    setShowAddModal(false);
  };

  const copyFromPreviousMonth = () => {
    if (isPastMonth) return;
    const prevDate = new Date(currentDate);
    prevDate.setMonth(currentDate.getMonth() - 1);
    const prevKey = getMonthKey(prevDate);
    const prevHabits = monthlyHabits[prevKey] || [];
    if (prevHabits.length === 0)
      return alert("No habits found in previous month.");
    const newMonthHabits = {
      ...monthlyHabits,
      [currentMonthKey]: [
        ...(monthlyHabits[currentMonthKey] || []),
        ...prevHabits,
      ],
    };
    saveHabitsToCloud(newMonthHabits);
  };

  const stats = useMemo(() => {
    let totalChecks = 0;
    const totalPossible = currentHabits.length * totalDaysShown;
    const habitStats = currentHabits.map((h) => {
      let count = 0;
      for (let d = startDay; d <= endDay; d++) {
        if (checks[`${h.id}-${currentYear}-${currentMonth}-${d}`]) count++;
      }
      totalChecks += count;
      return {
        ...h,
        count,
        percent: totalPossible > 0 ? (count / totalDaysShown) * 100 : 0,
      };
    });
    const dailyStats = Array.from({ length: totalDaysShown }).map((_, i) => {
      const day = i + startDay;
      let completedToday = 0;
      currentHabits.forEach((h) => {
        if (checks[`${h.id}-${currentYear}-${currentMonth}-${day}`])
          completedToday++;
      });
      return {
        day,
        count: completedToday,
        percent:
          currentHabits.length > 0
            ? (completedToday / currentHabits.length) * 100
            : 0,
      };
    });
    return {
      totalChecks,
      totalPossible,
      overallPercent:
        totalPossible > 0 ? (totalChecks / totalPossible) * 100 : 0,
      habitStats,
      dailyStats,
    };
  }, [checks, currentHabits, currentYear, currentMonth, startDay, endDay]);

  useEffect(() => {
    const t = setTimeout(() => setShowIntro(false), 2200);
    return () => clearTimeout(t);
  }, []);
  if (showIntro)
    return (
      <div
        className={`min-h-screen ${theme.bg} flex flex-col items-center justify-center`}
      >
        <div className="animate-in fade-in zoom-in duration-1000 flex flex-col items-center">
          <h1
            className={`text-5xl md:text-7xl font-serif font-thin tracking-tighter ${theme.text} mb-4`}
          >
            Habit Tracker
          </h1>
          <div
            className={`h-px w-24 ${theme.accentBg} mb-4 animate-in slide-in-from-left duration-1000`}
          ></div>
          <p
            className={`text-xs font-mono uppercase tracking-[0.3em] ${theme.textMuted} animate-in fade-in duration-1000 delay-300`}
          >
            Build Your System
          </p>
        </div>
      </div>
    );

  if (!loadingAuth && !user)
    return (
      <div
        className={`min-h-screen ${theme.bg} ${theme.text} flex flex-col items-center justify-center p-4`}
      >
        <div
          className={`w-full max-w-md p-8 rounded-lg border ${theme.border} ${theme.card} text-center shadow-2xl`}
        >
          <h2 className="text-3xl font-serif mb-2">Welcome Back</h2>
          <p
            className={`${theme.textMuted} mb-8 font-mono text-xs uppercase tracking-widest`}
          >
            Sync your progress across devices
          </p>
          <button
            onClick={handleLogin}
            className={`w-full py-4 ${theme.accentBg} hover:opacity-90 text-white font-medium rounded-md flex items-center justify-center gap-3 transition-all`}
          >
            <User size={18} /> Sign in with Google
          </button>
        </div>
      </div>
    );

  return (
    <div
      className={`min-h-screen ${theme.bg} ${theme.text} font-sans p-4 md:p-12 flex flex-col items-center justify-center relative transition-colors duration-500 selection:bg-emerald-500/20 animate-in fade-in duration-700`}
    >
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 10px; width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: ${theme.scrollTrack}; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${theme.scrollThumb}; border-radius: 9999px; border: 3px solid transparent; background-clip: content-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: ${darkMode ? "#52525b" : "#a1a1aa"}; }
      `}</style>

      <div className="w-full max-w-7xl mb-8 flex flex-col-reverse md:flex-row justify-between items-center gap-6 mt-12 md:mt-0">
        <div className="w-full md:w-auto">
          <div className="flex items-center gap-6 mb-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateMonth(-1)}
                disabled={isBeforeJoinedMonth}
                className={`p-2 rounded-md transition-all ${isBeforeJoinedMonth ? "opacity-20 cursor-not-allowed" : theme.hover}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className={`p-2 rounded-md transition-all ${theme.hover}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-light tracking-tight">
              {currentDate.toLocaleString("default", { month: "long" })}
              <span
                className={`text-lg font-mono ml-3 opacity-40 font-normal align-top`}
              >
                {currentYear}
              </span>
            </h1>
          </div>
          <p
            className={`font-mono text-xs uppercase tracking-widest ${theme.textMuted} ml-1`}
          >
            MAINTAIN CONSISTENCY
          </p>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <button
            onClick={() => setStrictMode(!strictMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-mono font-medium transition-all ${strictMode ? "border-red-900/30 text-red-500 bg-red-500/5" : `${theme.border} ${theme.textMuted}`}`}
          >
            {strictMode ? <Lock size={12} /> : <Unlock size={12} />}{" "}
            <span className="hidden sm:inline">
              {strictMode ? "LOCKED" : "UNLOCKED"}
            </span>
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-3 rounded-full border ${theme.border} ${theme.hover} transition-all`}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`w-10 h-10 rounded-full border ${theme.border} overflow-hidden transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-black`}
            >
              {user?.photoURL && !imgError ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className={`w-full h-full ${theme.cardLight} flex items-center justify-center text-sm font-bold ${theme.text}`}
                >
                  {user?.displayName ? (
                    user.displayName[0].toUpperCase()
                  ) : (
                    <User size={18} />
                  )}
                </div>
              )}
            </button>

            {isProfileOpen && (
              <div
                className={`absolute right-0 mt-2 w-48 ${theme.card} border ${theme.border} rounded-lg shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200`}
              >
                <div className={`px-4 py-2 border-b ${theme.border} mb-2`}>
                  <p className={`text-sm font-medium truncate`}>
                    {user?.displayName || "User"}
                  </p>
                  <p className={`text-xs ${theme.textMuted} truncate`}>
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className={`w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors`}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={`w-full max-w-7xl mb-6 flex gap-6 border-b ${theme.tabBorder}`}
      >
        <button
          onClick={() => setActiveTab("tracker")}
          className={`pb-2 text-sm font-mono tracking-wider uppercase transition-colors border-b-2 ${activeTab === "tracker" ? `border-emerald-500 ${theme.text}` : `border-transparent ${theme.textMuted} hover:text-zinc-300`}`}
        >
          // Journal
        </button>
        <button
          onClick={() => setActiveTab("analysis")}
          className={`pb-2 text-sm font-mono tracking-wider uppercase transition-colors border-b-2 ${activeTab === "analysis" ? `border-emerald-500 ${theme.text}` : `border-transparent ${theme.textMuted} hover:text-zinc-300`}`}
        >
          // Analytics
        </button>
      </div>

      {activeTab === "tracker" && (
        <div
          className={`w-full max-w-7xl border-y ${theme.border} md:border ${theme.card} md:rounded-lg overflow-hidden flex flex-col h-fit shadow-sm animate-in fade-in duration-500`}
        >
          <div className="flex-1 flex flex-col min-w-0">
            <div
              className={`p-4 border-b ${theme.border} flex justify-between items-center ${theme.bg}`}
            >
              <span className={`font-serif text-xl font-light ${theme.text}`}>
                Daily Entries
              </span>
              {!isPastMonth && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono border ${theme.border} rounded hover:border-emerald-500 transition-colors`}
                >
                  <Plus size={12} /> ADD ENTRY
                </button>
              )}
            </div>
            <div className="overflow-x-auto custom-scrollbar bg-transparent">
              {currentHabits.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center h-96">
                  <Calendar className={`w-16 h-16 mb-6 opacity-20`} />
                  <h3 className="text-2xl font-serif mb-2">Blank Page</h3>
                  <p className={`${theme.textMuted} max-w-sm mb-8 font-light`}>
                    {isPastMonth
                      ? "No records for this month."
                      : "This month is a fresh start."}
                  </p>
                  {!isPastMonth && (
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => setShowAddModal(true)}
                        className={`px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium tracking-wide rounded-sm shadow-lg shadow-emerald-900/20`}
                      >
                        Start New Habit
                      </button>
                      {!isFirstMonth && (
                        <button
                          onClick={copyFromPreviousMonth}
                          className={`px-8 py-3 border ${theme.border} ${theme.hover} text-sm font-medium tracking-wide rounded-sm`}
                        >
                          Copy Last Month
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="inline-block min-w-full align-top">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className={`border-b ${theme.border}`}>
                        <th
                          className={`sticky left-0 z-20 ${theme.gridHeader} p-4 text-left min-w-[200px] border-r ${theme.border}`}
                        >
                          <span className="font-serif text-lg opacity-50">
                            Habits
                          </span>
                        </th>
                        {Array.from({ length: totalDaysShown }).map((_, i) => {
                          const dayNum = i + startDay;
                          const isToday =
                            dayNum === new Date().getDate() &&
                            currentMonth === new Date().getMonth() &&
                            currentYear === new Date().getFullYear();
                          return (
                            <th
                              key={i}
                              className={`p-3 text-center min-w-[48px] border-r ${theme.gridBorder} ${isToday ? "bg-emerald-500/5" : ""}`}
                            >
                              <div
                                className={`text-[10px] font-mono uppercase tracking-widest ${theme.textMuted} mb-1`}
                              >
                                {
                                  WEEK_DAYS[
                                    new Date(
                                      currentYear,
                                      currentMonth,
                                      dayNum,
                                    ).getDay()
                                  ]
                                }
                              </div>
                              <div
                                className={`text-sm font-mono ${isToday ? theme.accent : ""}`}
                              >
                                {dayNum < 10 ? `0${dayNum}` : dayNum}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {currentHabits.map((habit) => (
                        <tr
                          key={habit.id}
                          className={`group ${theme.hover} transition-colors`}
                        >
                          <td
                            className={`sticky left-0 z-10 ${theme.gridHeader} group-hover:${theme.hover} p-4 border-r ${theme.border} border-b ${theme.border} transition-colors`}
                          >
                            <div className="flex justify-between items-center group/cell">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{habit.icon}</span>
                                <span className="font-medium text-sm tracking-wide">
                                  {habit.name}
                                </span>
                              </div>
                              {!isPastMonth && (
                                <button
                                  onClick={(e) => deleteHabit(habit.id, e)}
                                  className={`opacity-0 group-hover/cell:opacity-100 p-1.5 hover:text-red-500 transition-all`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                          {Array.from({ length: totalDaysShown }).map(
                            (_, dIdx) => {
                              const dayNum = dIdx + startDay;
                              const isChecked =
                                !!checks[
                                  `${habit.id}-${currentYear}-${currentMonth}-${dayNum}`
                                ];
                              const isToday =
                                dayNum === new Date().getDate() &&
                                currentMonth === new Date().getMonth() &&
                                currentYear === new Date().getFullYear();
                              const isLocked =
                                (strictMode && !isToday) || isPastMonth;
                              return (
                                <td
                                  key={dIdx}
                                  className={`p-0 text-center border-r ${theme.gridBorder} border-b ${theme.border} relative ${isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${isToday ? "bg-emerald-500/5" : ""}`}
                                  onClick={() =>
                                    !isLocked && toggleCheck(habit.id, dayNum)
                                  }
                                >
                                  <div className="w-full h-14 flex items-center justify-center">
                                    {isChecked ? (
                                      <div
                                        className={`w-5 h-5 rounded-sm ${theme.checkFill} flex items-center justify-center shadow-sm`}
                                      >
                                        <Check
                                          className="w-3.5 h-3.5 text-white"
                                          strokeWidth={3}
                                        />
                                      </div>
                                    ) : (
                                      <div
                                        className={`w-1.5 h-1.5 rounded-full ${theme.gridBorder} bg-current opacity-10 group-hover:opacity-20`}
                                      />
                                    )}
                                  </div>
                                </td>
                              );
                            },
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "analysis" && (
        <div
          className={`w-full max-w-7xl border-y ${theme.border} md:border ${theme.card} md:rounded-lg overflow-hidden p-8 shadow-sm animate-in fade-in duration-500 min-h-[600px]`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div
              className={`lg:col-span-1 p-8 rounded-lg border ${theme.border} ${theme.cardLight} flex flex-col items-center justify-center relative overflow-hidden h-80`}
            >
              <div className="relative z-10 flex flex-col items-center">
                <p
                  className={`text-xs font-mono uppercase tracking-widest ${theme.textMuted} mb-6`}
                >
                  Month Score
                </p>
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="60"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      className="opacity-10"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="60"
                      stroke={darkMode ? "#34d399" : "#059669"}
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 60}
                      strokeDashoffset={
                        2 * Math.PI * 60 -
                        (stats.overallPercent / 100) * (2 * Math.PI * 60)
                      }
                      strokeLinecap="butt"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-serif font-light">
                      {stats.overallPercent.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute -right-12 -bottom-12 opacity-5">
                <PieChart size={200} />
              </div>
            </div>
            <div className="lg:col-span-2 flex flex-col gap-8">
              <div
                className={`flex-1 ${theme.cardLight} border ${theme.border} rounded-lg p-6 flex flex-col`}
              >
                <div className="flex justify-between items-end mb-6">
                  <h3 className="font-serif text-xl font-light">
                    Daily Rhythm
                  </h3>
                  <div
                    className={`text-xs font-mono ${theme.textMuted} flex items-center gap-2`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>{" "}
                    High Activity
                  </div>
                </div>
                <div className="flex items-end gap-1 h-40">
                  {stats.dailyStats.map((d, i) => (
                    <div
                      key={i}
                      className="flex-1 h-full flex items-end group relative"
                    >
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10 pointer-events-none left-1/2 -translate-x-1/2">
                        Day {d.day}: {d.count}
                      </div>
                      <div
                        style={{ height: `${Math.max(d.percent, 5)}%` }}
                        className={`w-full ${d.percent >= 100 ? "bg-emerald-500" : d.percent > 50 ? "bg-emerald-500/60" : d.percent > 0 ? "bg-emerald-500/30" : "bg-zinc-500/10"} min-h-[4px] rounded-t-[1px] transition-all hover:bg-emerald-400`}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3
                  className={`text-xs font-mono font-bold uppercase tracking-widest ${theme.textMuted} mb-4`}
                >
                  Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.habitStats.map((stat) => (
                    <div
                      key={stat.id}
                      className={`p-4 rounded border ${theme.border} ${theme.cardLight} flex items-center justify-between`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{stat.icon}</span>
                        <span className="font-medium text-sm">{stat.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-16 h-1 ${theme.emptyBar} rounded-full overflow-hidden`}
                        >
                          <div
                            className={`h-full ${theme.accentBg}`}
                            style={{ width: `${stat.percent}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs opacity-60">
                          {stat.percent.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`${theme.card} border ${theme.border} w-full max-w-md p-8 rounded-lg shadow-2xl`}
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-serif">New Entry</h3>
                <p className={`text-sm ${theme.textMuted} mt-1`}>
                  Add a routine for{" "}
                  {currentDate.toLocaleString("default", { month: "long" })}.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className={theme.textMuted}
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <label
                  className={`block text-xs font-mono uppercase tracking-widest mb-2 ${theme.textMuted}`}
                >
                  Name
                </label>
                <input
                  type="text"
                  value={manualHabitName}
                  onChange={(e) => setManualHabitName(e.target.value)}
                  placeholder="e.g. Morning Run"
                  className={`w-full bg-transparent border-b ${theme.border} py-2 text-lg focus:outline-none focus:border-emerald-500 transition-colors placeholder:opacity-20`}
                  autoFocus
                />
              </div>
              <div>
                <label
                  className={`block text-xs font-mono uppercase tracking-widest mb-3 ${theme.textMuted}`}
                >
                  Icon
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setManualHabitIcon(icon)}
                      className={`w-9 h-9 flex items-center justify-center rounded text-lg border transition-all ${manualHabitIcon === icon ? `border-emerald-500 ${theme.accentBg} text-white` : `${theme.border} hover:border-zinc-500 opacity-60 hover:opacity-100`}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${theme.textMuted}`}>Custom:</span>
                  <input
                    type="text"
                    value={manualHabitIcon}
                    onChange={(e) => setManualHabitIcon(e.target.value)}
                    className={`w-12 text-center bg-transparent border-b ${theme.border} py-1 text-lg focus:outline-none focus:border-emerald-500 transition-colors`}
                    maxLength={2}
                  />
                </div>
              </div>
              <button
                onClick={addManualHabit}
                disabled={!manualHabitName.trim()}
                className={`w-full py-4 mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium tracking-wide rounded-sm disabled:opacity-50 transition-all`}
              >
                Confirm Addition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
