import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar, Check, X, Moon, Sun, ChevronLeft, ChevronRight, Plus, Lock, Unlock,
  PieChart, Activity, TrendingUp, Award, Zap, LogOut, User, Loader2, AlertTriangle,
  Menu, ArrowLeft, Flame, Image as ImageIcon, Upload, HelpCircle,
  ChevronRight as ChevronRightIcon, Edit2, Ban, Trash2, GripVertical, BookOpen, Skull,
  Search, Filter, Circle, CheckCircle, XCircle, Trophy
} from "lucide-react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

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
  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("YOUR_API_KEY")) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    isConfigured = true;
  }
} catch (e) { console.error(e); }

const PRESET_ICONS = ["💪", "🏃", "💧", "🧘", "📚", "💤", "🥗", "🚭", "💰", "💻", "🎨", "🎵", "🧹", "💊", "⚙️", "📝", "📵", "🚶"];
const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const TARGET_MONTHLY_XP = 2500;

const TUTORIAL_STEPS = [
  { title: "Welcome to Your System", desc: "This isn't just a checklist. It's a system to visualize your discipline." },
  { title: "Vices & Logbook", desc: "Mark habits as 'Vices' (Anti-Habits) to track things you want to avoid. Access your Log from the Profile page." },
  { title: "Daily Habits & Rules", desc: "Checking a box gives you XP. For Vices, NOT checking the box gives you XP (Success = Green Check). Checking a Vice means failure (Red Cross). Past months are PERMANENTLY LOCKED (except on the 1st of the new month until 9 AM)." },
  { title: "Strict Locks", desc: "You can freely edit the current month, but history is sacred. Late entries count for streaks but give 0 XP." },
  { title: "Mid-Month Starts", desc: "Starting a habit halfway through? Days before creation are marked as 'Void' and don't hurt your score." },
  { title: "The Vision Board", desc: "Upload a goal photo. It starts blurry and clarifies as you level up." },
  { title: "The Code of Honor", desc: "This is a one-time tool to achieve your goal. Access is limited to 2 years from your start date." },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [joinedDate, setJoinedDate] = useState(null);
  const [monthlyHabits, setMonthlyHabits] = useState({});
  const [checks, setChecks] = useState({});
  const [logbook, setLogbook] = useState({});
  const [visionBoardImg, setVisionBoardImg] = useState(null);
  const [userXP, setUserXP] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [viewMode, setViewMode] = useState("app");
  const [imgError, setImgError] = useState(false);
  const [xpPopups, setXpPopups] = useState([]);
  const [draggedHabitIndex, setDraggedHabitIndex] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(() => JSON.parse(localStorage.getItem("ht_tutorial_seen") || "false"));
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedLogDate, setSelectedLogDate] = useState(null);
  const [logEntryText, setLogEntryText] = useState("");
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [manualHabitName, setManualHabitName] = useState("");
  const [manualHabitIcon, setManualHabitIcon] = useState("✨");
  const [manualRestDays, setManualRestDays] = useState([]);
  const [manualIsVice, setManualIsVice] = useState(false);
  const [darkMode, setDarkMode] = useState(() => JSON.parse(localStorage.getItem("ht_dark") || "true"));
  const [strictMode, setStrictMode] = useState(() => JSON.parse(localStorage.getItem("ht_strict") || "true"));
  const [activeTab, setActiveTab] = useState("tracker");
  const [logSearch, setLogSearch] = useState("");
  const [logFilter, setLogFilter] = useState("all");
  
  const [notifications, setNotifications] = useState([]);
  const prevLevelRef = useRef(0);

  const profileRef = useRef(null);
  const fileInputRef = useRef(null);

  const theme = darkMode ? {
    bg: "bg-[#09090b]", text: "text-zinc-100", textMuted: "text-zinc-500", card: "bg-[#121214]", cardLight: "bg-[#18181b]",
    border: "border-zinc-800", tabBorder: "border-zinc-800", accent: "text-emerald-400", accentBg: "bg-emerald-500",
    hover: "hover:bg-zinc-800", gridHeader: "bg-[#09090b]", gridBorder: "border-zinc-800", checkBg: "bg-emerald-900/30",
    checkBgZero: "bg-zinc-800/80 border border-zinc-700",
    checkFill: "text-emerald-400", checkFillZero: "text-zinc-400", viceFail: "bg-red-900/40 border border-red-900", viceSuccess: "text-emerald-500",
    scrollThumb: "#3f3f46", scrollTrack: "#18181b", heatmapEmpty: "bg-zinc-800/50 border border-zinc-800",
    emptyBar: "bg-zinc-800", voidPattern: `repeating-linear-gradient(45deg, #18181b, #18181b 10px, #27272a 10px, #27272a 20px)`,
  } : {
    bg: "bg-[#fafafa]", text: "text-zinc-900", textMuted: "text-zinc-400", card: "bg-white", cardLight: "bg-zinc-50",
    border: "border-zinc-200", tabBorder: "border-zinc-200", accent: "text-emerald-700", accentBg: "bg-emerald-600",
    hover: "hover:bg-zinc-50", gridHeader: "bg-[#fafafa]", gridBorder: "border-zinc-200", checkBg: "bg-emerald-50",
    checkBgZero: "bg-zinc-200/80 border border-zinc-300",
    checkFill: "text-emerald-600", checkFillZero: "text-zinc-500", viceFail: "bg-red-100 border border-red-200", viceSuccess: "text-emerald-600",
    scrollThumb: "#d4d4d8", scrollTrack: "transparent", heatmapEmpty: "bg-zinc-200",
    emptyBar: "bg-zinc-200", voidPattern: `repeating-linear-gradient(45deg, #f4f4f5, #f4f4f5 10px, #e4e4e7 10px, #e4e4e7 20px)`,
  };

  useEffect(() => {
    if (!isConfigured) { setLoadingAuth(false); return; }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setImgError(false);
      if (currentUser) {
        const metaRef = doc(db, "users", currentUser.uid, "data", "metadata");
        try {
          const metaSnap = await getDoc(metaRef);
          if (metaSnap.exists()) {
            const data = metaSnap.data();
            if (data.joined) setJoinedDate(new Date(data.joined));
            if (data.visionBoard) setVisionBoardImg(data.visionBoard);
            if (data.xp !== undefined) setUserXP(data.xp);
            if (data.tutorialSeen) setHasSeenTutorial(true);
            else if (!hasSeenTutorial) setShowTutorial(true);
          } else {
            const now = new Date();
            await setDoc(metaRef, { joined: now.toISOString(), tutorialSeen: false, xp: 0 }, { merge: true });
            setJoinedDate(now);
            setShowTutorial(true);
          }
        } catch (e) { setJoinedDate(new Date()); }
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setMonthlyHabits({}); setChecks({}); setLogbook({}); return; }
    const unsubHabits = onSnapshot(doc(db, "users", user.uid, "data", "habits"), (doc) => setMonthlyHabits(doc.exists() ? doc.data() : {}));
    const unsubChecks = onSnapshot(doc(db, "users", user.uid, "data", "checks"), (doc) => setChecks(doc.exists() ? doc.data() : {}));
    const unsubLogbook = onSnapshot(doc(db, "users", user.uid, "data", "logbook"), (doc) => setLogbook(doc.exists() ? doc.data() : {}));
    const unsubMeta = onSnapshot(doc(db, "users", user.uid, "data", "metadata"), (doc) => {
      if (doc.exists()) {
        if (doc.data().visionBoard) setVisionBoardImg(doc.data().visionBoard);
        if (doc.data().xp !== undefined) setUserXP(doc.data().xp);
      }
    });
    return () => { unsubHabits(); unsubChecks(); unsubMeta(); unsubLogbook(); };
  }, [user]);

  useEffect(() => { localStorage.setItem("ht_dark", JSON.stringify(darkMode)); }, [darkMode]);
  useEffect(() => { localStorage.setItem("ht_strict", JSON.stringify(strictMode)); }, [strictMode]);
  useEffect(() => { localStorage.setItem("ht_tutorial_seen", JSON.stringify(hasSeenTutorial)); }, [hasSeenTutorial]);
  
  useEffect(() => {
    const handleClickOutside = (event) => { if (profileRef.current && !profileRef.current.contains(event.target)) setIsProfileOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileRef]);

  useEffect(() => {
    const t = setTimeout(() => setShowIntro(false), 2200);
    return () => clearTimeout(t);
  }, []);

  const getMonthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentMonthKey = getMonthKey(currentDate);
  const currentHabits = monthlyHabits[currentMonthKey] || [];
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  let startDay = 1;
  let isBeforeJoinedMonth = false;
  let isFirstMonth = true;

  if (joinedDate) {
    const joinedYear = joinedDate.getFullYear();
    const joinedMonth = joinedDate.getMonth();
    if (currentYear < joinedYear || (currentYear === joinedYear && currentMonth < joinedMonth)) {
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
  const isPastMonth = currentYear < today.getFullYear() || (currentYear === today.getFullYear() && currentMonth < today.getMonth());
  const isMinDate = isBeforeJoinedMonth;

  const now = new Date();
  const monthDiff = (currentYear - now.getFullYear()) * 12 + (currentMonth - now.getMonth());
  const isTooFarFuture = monthDiff > 2;
  let isMaxDate = false;
  if (joinedDate) {
    const maxDate = new Date(joinedDate);
    maxDate.setFullYear(maxDate.getFullYear() + 2);
    const currentMonthTime = new Date(currentYear, currentMonth, 1).getTime();
    const maxMonthTime = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1).getTime();
    if (currentMonthTime >= maxMonthTime) isMaxDate = true;
  }

  const isCurrentMonth = currentYear === now.getFullYear() && currentMonth === now.getMonth();
  const isFirstDayOfNewMonth = now.getDate() === 1;
  const isViewingLastMonth = (currentMonth === now.getMonth() - 1 && currentYear === now.getFullYear()) || (now.getMonth() === 0 && currentMonth === 11 && currentYear === now.getFullYear() - 1);
  const isFutureMonth = currentYear > now.getFullYear() || (currentYear === now.getFullYear() && currentMonth > now.getMonth());
  const isGracePeriodActive = isFirstDayOfNewMonth && isViewingLastMonth && now.getHours() < 9;
  const showLockButton = isCurrentMonth || isGracePeriodActive;

  const getMonthlyXpWeight = (year, month, habits) => {
    if (!habits || habits.length === 0) return 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let totalOps = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const currentDay = new Date(year, month, d);
      habits.forEach(h => {
        let isCreated = true;
        if (h.createdAt) {
          const cDate = new Date(h.createdAt);
          cDate.setHours(0, 0, 0, 0);
          if (currentDay < cDate) isCreated = false;
        }
        const dayOfWeek = currentDay.getDay();
        const isRest = h.restDays && h.restDays.includes(dayOfWeek);
        if (isCreated && !isRest) totalOps++;
      });
    }
    return totalOps > 0 ? TARGET_MONTHLY_XP / totalOps : 0;
  };

  useEffect(() => {
    if ((currentHabits.length === 0 || isFutureMonth) && activeTab === 'analysis') {
      setActiveTab('tracker');
    }
  }, [currentHabits.length, activeTab, isFutureMonth]);

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    if (joinedDate) {
      const joinedReset = new Date(joinedDate.getFullYear(), joinedDate.getMonth(), 1);
      if (newDate < joinedReset) return;
      const maxDate = new Date(joinedDate);
      maxDate.setFullYear(maxDate.getFullYear() + 2);
      const newMonthTime = new Date(newDate.getFullYear(), newDate.getMonth(), 1).getTime();
      const maxMonthTime = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1).getTime();
      if (newMonthTime > maxMonthTime) return;
    }
    setCurrentDate(newDate);
  };

  const handleLogin = async () => {
    if (!isConfigured) return;
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (error) { if (error.code === "auth/unauthorized-domain") alert(`Login Blocked: Add "${window.location.hostname}" to Firebase.`); }
  };
  const handleLogout = () => { signOut(auth); setViewMode("app"); setIsProfileOpen(false); };
  
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setVisionBoardImg(compressedDataUrl);
        if (user) setDoc(doc(db, "users", user.uid, "data", "metadata"), { visionBoard: compressedDataUrl }, { merge: true });
      };
    };
  };

  const removeVisionBoard = async () => {
    setVisionBoardImg(null);
    if (user) try { await setDoc(doc(db, "users", user.uid, "data", "metadata"), { visionBoard: null }, { merge: true }); } catch (e) {}
  };

  const saveHabitsToCloud = async (newHabits) => {
    if (!user) return;
    setMonthlyHabits(newHabits);
    try { await setDoc(doc(db, "users", user.uid, "data", "habits"), newHabits); } catch (e) {}
  };

  const saveChecksToCloud = async (newChecks, xpDelta = 0) => {
    if (!user) return;
    setChecks(newChecks);
    try {
      await setDoc(doc(db, "users", user.uid, "data", "checks"), newChecks);
      if (xpDelta !== 0) {
        const newXP = Math.max(0, userXP + xpDelta);
        setUserXP(newXP);
        await setDoc(doc(db, "users", user.uid, "data", "metadata"), { xp: newXP }, { merge: true });
      }
    } catch (e) {}
  };

  const openLogbook = (day) => {
    const now = new Date();
    const isFirstDayOfNewMonth = now.getDate() === 1;
    const isViewingLastMonth = (currentMonth === now.getMonth() - 1 && currentYear === now.getFullYear()) || (now.getMonth() === 0 && currentMonth === 11 && currentYear === now.getFullYear() - 1);
    const isLastDayOfPrevMonth = day === new Date(currentYear, currentMonth + 1, 0).getDate();
    const allowLateEdit = isFirstDayOfNewMonth && isViewingLastMonth && isLastDayOfPrevMonth && now.getHours() < 9;
    
    const targetDate = new Date(currentYear, currentMonth, day);
    const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isToday = targetDate.getTime() === nowStartOfDay.getTime();
    const isFuture = targetDate > nowStartOfDay;
    
    const isLocked = (strictMode && !isToday && !allowLateEdit) || (isPastMonth && !allowLateEdit);

    if (isFuture) return; 
    if (isLocked) return;

    const dateStr = `${currentYear}-${currentMonth}-${day}`;
    setSelectedLogDate(dateStr);
    setLogEntryText(logbook[dateStr] || "");
    setShowLogModal(true);
  };

  const handleLogChange = (e) => {
    const text = e.target.value;
    const words = text.trim().split(/\s+/);
    if (words.length <= 100) {
      setLogEntryText(text);
    }
  };

  const saveLogEntry = async () => {
    if (!user || !selectedLogDate) return;
    const newLogbook = { ...logbook, [selectedLogDate]: logEntryText };
    if (!logEntryText.trim()) delete newLogbook[selectedLogDate];
    setLogbook(newLogbook);
    setShowLogModal(false);
    try { await setDoc(doc(db, "users", user.uid, "data", "logbook"), newLogbook); } catch (e) {}
  };

  const toggleCheck = (habit, day, event) => {
    const habitId = habit.id;
    const isVice = habit.isVice;
    const targetDate = new Date(currentYear, currentMonth, day);
    const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isLastDayOfPrevMonth = day === new Date(currentYear, currentMonth + 1, 0).getDate();
    const allowLateEdit = isGracePeriodActive && isLastDayOfPrevMonth;

    if (targetDate > nowStartOfDay) return;
    if (isPastMonth && !allowLateEdit) return;
    const isToday = targetDate.getTime() === nowStartOfDay.getTime();
    if (strictMode && !isToday && !allowLateEdit) return;

    const key = `${habitId}-${currentYear}-${currentMonth}-${day}`;
    const newChecks = { ...checks };
    const entry = newChecks[key];
    const isChecked = typeof entry === "object" ? entry.completed : !!entry;
    
    let awardsXP = false;
    if (!isVice && isToday) awardsXP = true; 

    if (isChecked) {
      delete newChecks[key]; 
    } else {
      newChecks[key] = { completed: true, xpAwarded: awardsXP }; 
      let popupAmount = 0;
      if (awardsXP) {
         const weight = getMonthlyXpWeight(currentYear, currentMonth, currentHabits);
         popupAmount = parseFloat(weight.toFixed(1));
      }
      if (popupAmount > 0) {
        const newPopup = { id: Date.now(), x: event.clientX, y: event.clientY, amount: popupAmount, isZero: false };
        setXpPopups((prev) => [...prev, newPopup]);
        setTimeout(() => setXpPopups((prev) => prev.filter((p) => p.id !== newPopup.id)), 1000);
      }
    }
    saveChecksToCloud(newChecks);
  };

  const deleteHabit = (id, e) => {
    e.stopPropagation();
    if (isPastMonth) return;
    const newMonthHabits = { ...monthlyHabits, [currentMonthKey]: (monthlyHabits[currentMonthKey] || []).filter((h) => h.id !== id) };
    saveHabitsToCloud(newMonthHabits);
  };

  const openEditHabit = (habit) => {
    if (isPastMonth) return;
    setEditingHabitId(habit.id);
    setManualHabitName(habit.name);
    setManualHabitIcon(habit.icon);
    setManualRestDays(habit.restDays || []);
    setManualIsVice(habit.isVice || false);
    setShowAddModal(true);
  };

  const openAddHabit = () => {
    if (isPastMonth) return;
    setEditingHabitId(null);
    setManualHabitName("");
    setManualHabitIcon("✨");
    setManualRestDays([]);
    setManualIsVice(false);
    setShowAddModal(true);
  };

  const handleDragStart = (e, index) => setDraggedHabitIndex(index);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedHabitIndex === null || draggedHabitIndex === dropIndex) return;
    const newHabits = [...currentHabits];
    const [draggedItem] = newHabits.splice(draggedHabitIndex, 1);
    newHabits.splice(dropIndex, 0, draggedItem);
    const newMonthHabits = { ...monthlyHabits, [currentMonthKey]: newHabits };
    saveHabitsToCloud(newMonthHabits);
    setDraggedHabitIndex(null);
  };

  const saveHabit = () => {
    if (!manualHabitName.trim() || isPastMonth) return;
    const currentList = monthlyHabits[currentMonthKey] || [];
    if (editingHabitId) {
      const updatedList = currentList.map((h) => h.id === editingHabitId ? { ...h, name: manualHabitName, icon: manualHabitIcon, restDays: manualRestDays, isVice: manualIsVice, editCount: (h.editCount || 0) + 1 } : h);
      saveHabitsToCloud({ ...monthlyHabits, [currentMonthKey]: updatedList });
    } else {
      if (currentList.some((h) => h.name.trim().toLowerCase() === manualHabitName.trim().toLowerCase())) return alert("Habit already exists.");
      const newHabit = { id: Date.now(), name: manualHabitName, icon: manualHabitIcon, restDays: manualRestDays, isVice: manualIsVice, createdAt: new Date().toISOString(), editCount: 0 };
      saveHabitsToCloud({ ...monthlyHabits, [currentMonthKey]: [...currentList, newHabit] });
    }
    setShowAddModal(false);
  };

  const copyFromPreviousMonth = () => {
    if (isPastMonth) return;
    const prevDate = new Date(currentDate);
    prevDate.setMonth(currentDate.getMonth() - 1);
    const prevKey = getMonthKey(prevDate);
    const prevHabits = monthlyHabits[prevKey] || [];
    if (prevHabits.length === 0) return alert("No habits found in previous month.");
    saveHabitsToCloud({ ...monthlyHabits, [currentMonthKey]: [...(monthlyHabits[currentMonthKey] || []), ...prevHabits] });
  };

  const { heatmapData, currentStreak, bestStreak, activeDays, monthsLabels, calculatedXP } = useMemo(() => {
    const data = [];
    let streak = 0, active = 0, totalXP = 0;
    const nowTS = new Date(); nowTS.setHours(0, 0, 0, 0);
    const startOfJoinedDate = joinedDate ? new Date(joinedDate) : new Date(); startOfJoinedDate.setHours(0, 0, 0, 0);
    const labels = Array(53).fill(null);
    const monthWeights = {};

    for (let i = 364; i >= 0; i--) {
      const d = new Date(nowTS);
      d.setDate(d.getDate() - i);
      const yr = d.getFullYear(), mo = d.getMonth(), dy = d.getDate();
      const colIndex = Math.floor((364 - i) / 7);
      if (dy === 1) labels[colIndex] = d.toLocaleString("default", { month: "short" });
      
      const mKey = `${yr}-${mo}`;
      const hForMonth = monthlyHabits[mKey] || [];
      if (monthWeights[mKey] === undefined) monthWeights[mKey] = getMonthlyXpWeight(yr, mo, hForMonth);
      const xpVal = monthWeights[mKey];

      const activeH = hForMonth.filter((h) => {
        const dayOfWeek = d.getDay();
        const isRest = h.restDays && h.restDays.includes(dayOfWeek);
        let isCreated = true;
        if (h.createdAt) {
          const cDate = new Date(h.createdAt); cDate.setHours(0, 0, 0, 0);
          if (d < cDate) isCreated = false;
        }
        return !isRest && isCreated;
      });

      const existingHabitsCount = hForMonth.filter(h => {
        let isCreated = true;
        if (h.createdAt) {
          const cDate = new Date(h.createdAt); cDate.setHours(0,0,0,0);
          if (d < cDate) isCreated = false;
        }
        return isCreated;
      }).length;

      const totalForDay = activeH.length;
      let count = 0; 
      let viceFailures = 0;

      activeH.forEach((h) => {
        const k = `${h.id}-${yr}-${mo}-${dy}`;
        const e = checks[k];
        const isChecked = e ? (typeof e === "object" ? e.completed : !!e) : false;
        
        if (h.isVice) {
            if (!isChecked) {
                count++;
                if (d <= nowTS) totalXP += xpVal; 
            } else {
                viceFailures++;
            }
        } else {
            if (isChecked) {
                count++;
                if (typeof e === "object" ? e.xpAwarded : true) totalXP += xpVal;
            }
        }
      });

      if (count > 0 || viceFailures > 0) active++; 
      
      let isPerfect = false;
      if (d >= startOfJoinedDate) {
         if (totalForDay > 0) {
             isPerfect = count === totalForDay;
         } else {
             if (existingHabitsCount > 0) isPerfect = true;
             else isPerfect = false;
         }
      }
      data.push({ date: d, count, isPerfect });
    }

    for (let i = 364; i >= 0; i--) {
      if (data[i].isPerfect) streak++; else if (i !== 364) break;
    }
    let maxStreak = 0, tempStreak = 0;
    data.forEach((d) => {
      if (d.isPerfect) { tempStreak++; if (tempStreak > maxStreak) maxStreak = tempStreak; } else tempStreak = 0;
    });

    return { heatmapData: data, currentStreak: streak, bestStreak: maxStreak, activeDays: active, monthsLabels: labels, calculatedXP: totalXP };
  }, [checks, monthlyHabits, joinedDate]);

  const currentLevel = Math.min(100, Math.floor(100 * Math.pow(calculatedXP / 36500, 0.6)));
  
  useEffect(() => {
    if (prevLevelRef.current > 0 && currentLevel > prevLevelRef.current) {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message: `Level Up! You reached Level ${currentLevel}` }]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
    }
    prevLevelRef.current = currentLevel;
  }, [currentLevel]);

  const nextLevelXP = Math.ceil(36500 * Math.pow((currentLevel + 1) / 100, 1 / 0.6));
  const currentLevelBaseXP = Math.ceil(36500 * Math.pow(currentLevel / 100, 1 / 0.6));
  const levelProgress = currentLevel === 100 ? 100 : Math.max(0, Math.min(100, ((calculatedXP - currentLevelBaseXP) / (nextLevelXP - currentLevelBaseXP)) * 100));
  const blurAmount = currentLevel === 100 ? 0 : Math.max(10, 60 - currentLevel * 0.5);

  const stats = useMemo(() => {
    let totalChecks = 0, totalPossible = 0;
    const now = new Date();
    const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const habitStats = currentHabits.map((h) => {
      let habitPossible = 0, count = 0;
      const createdDate = h.createdAt ? new Date(h.createdAt) : null;
      if (createdDate) createdDate.setHours(0, 0, 0, 0);
      for (let d = startDay; d <= endDay; d++) {
        const currentDateObj = new Date(currentYear, currentMonth, d);
        if (createdDate && currentDateObj < createdDate) continue;
        if (currentDateObj > nowStartOfDay) continue; 

        const dayOfWeek = currentDateObj.getDay();
        if (h.restDays && h.restDays.includes(dayOfWeek)) continue;

        habitPossible++;
        const key = `${h.id}-${currentYear}-${currentMonth}-${d}`;
        const entry = checks[key];
        const isChecked = (typeof entry === "object" ? entry.completed : !!entry);
        
        if (h.isVice) {
            if (!isChecked) count++; 
        } else {
            if (isChecked) count++; 
        }
      }
      totalPossible += habitPossible;
      totalChecks += count;
      return { ...h, count, percent: habitPossible > 0 ? (count / habitPossible) * 100 : 0 };
    });
    
    const dailyStats = Array.from({ length: totalDaysShown }).map((_, i) => {
      const day = i + startDay;
      let completedToday = 0, habitsActiveToday = 0;
      const dayDate = new Date(currentYear, currentMonth, day);
      const isFuture = dayDate > nowStartOfDay;

      if (isFuture) return { day, count: 0, percent: 0 }; 

      currentHabits.forEach((h) => {
        if (h.createdAt) {
          const cDate = new Date(h.createdAt); cDate.setHours(0, 0, 0, 0);
          if (dayDate < cDate) return;
        }

        const dayOfWeek = dayDate.getDay();
        const isRest = h.restDays && h.restDays.includes(dayOfWeek);
        if (isRest) return; 

        habitsActiveToday++;
        const key = `${h.id}-${currentYear}-${currentMonth}-${day}`;
        const entry = checks[key];
        const isChecked = (typeof entry === "object" ? entry.completed : !!entry);
        
        if (h.isVice) {
            if (!isChecked) completedToday++;
        } else {
            if (isChecked) completedToday++;
        }
      });
      return { day, count: completedToday, percent: habitsActiveToday > 0 ? (completedToday / habitsActiveToday) * 100 : 0 };
    });
    return { totalChecks, totalPossible, overallPercent: totalPossible > 0 ? (totalChecks / totalPossible) * 100 : 0, habitStats, dailyStats };
  }, [checks, currentHabits, currentYear, currentMonth, startDay, endDay]);

  const timelineLogs = useMemo(() => {
    const logs = [];
    if (!joinedDate) return [];
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(joinedDate);
    start.setHours(0,0,0,0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (let d = new Date(yesterday); d >= start; d.setDate(d.getDate() - 1)) {
        const year = d.getFullYear();
        const month = d.getMonth();
        const day = d.getDate();
        const dateKey = `${year}-${month}-${day}`;
        const logContent = logbook[dateKey];
        
        const mKey = `${year}-${month}`;
        const monthHabits = monthlyHabits[mKey] || [];
        const monthWeights = getMonthlyXpWeight(year, month, monthHabits);
        
        let activeHabits = 0;
        let successCount = 0;
        let missedCount = 0;
        let dailyXP = 0;
        let habitsDetails = [];

        monthHabits.forEach(h => {
             if(h.createdAt) {
                const cDate = new Date(h.createdAt); cDate.setHours(0,0,0,0);
                if(d < cDate) return;
             }
             const dayOfWeek = d.getDay();
             const isRest = h.restDays && h.restDays.includes(dayOfWeek);
             if(isRest) return;

             activeHabits++;
             
             const k = `${h.id}-${year}-${month}-${day}`;
             const entry = checks[k];
             const isChecked = entry ? (typeof entry === "object" ? entry.completed : !!entry) : false;
             const isXpAwarded = entry ? (typeof entry === "object" ? entry.xpAwarded : true) : false;
             
             let status = 'missed';
             if (h.isVice) {
                 if (!isChecked) {
                   status = 'success';
                   dailyXP += monthWeights; 
                 } else status = 'fail';
             } else {
                 if (isChecked) {
                   status = 'success';
                   if(isXpAwarded) dailyXP += monthWeights; 
                 }
             }

             if (status === 'success') successCount++;
             else missedCount++;
             
             if (status === 'fail' || status === 'missed') {
                habitsDetails.push({ name: h.name, icon: h.icon, status, isVice: h.isVice });
             }
        });

        let show = true;
        if (logFilter === 'notes' && !logContent) show = false;
        if (logFilter === 'perfect' && (missedCount > 0 || activeHabits === 0)) show = false;
        if (logFilter === 'missed' && missedCount === 0) show = false;
        if (logSearch && (!logContent || !logContent.toLowerCase().includes(logSearch.toLowerCase()))) show = false;

        if (show) {
            logs.push({
                date: new Date(d),
                dateStr: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                logContent,
                activeHabits,
                successCount,
                missedCount,
                habitsDetails,
                dailyXP: Math.round(dailyXP),
                isPerfect: activeHabits > 0 && missedCount === 0
            });
        }
    }
    return logs;
  }, [joinedDate, logbook, monthlyHabits, checks, logFilter, logSearch]);

  const renderTutorial = () => {
    if (!showTutorial) return null;
    const safeStepIndex = (tutorialStep >= 0 && tutorialStep < TUTORIAL_STEPS.length) ? tutorialStep : 0;
    const step = TUTORIAL_STEPS[safeStepIndex];
    const isLastStep = safeStepIndex === TUTORIAL_STEPS.length - 1;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-500" onClick={() => { setShowTutorial(false); setHasSeenTutorial(true); if (user) setDoc(doc(db, "users", user.uid, "data", "metadata"), { tutorialSeen: true }, { merge: true }); }}>
        <div className={`max-w-md w-full ${theme.card} border ${theme.border} p-8 rounded-lg shadow-2xl text-center animate-in fade-in zoom-in duration-300 relative`} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setShowTutorial(false); setHasSeenTutorial(true); if (user) setDoc(doc(db, "users", user.uid, "data", "metadata"), { tutorialSeen: true }, { merge: true }); }} className={`absolute top-4 right-4 ${theme.textMuted} hover:text-white transition-colors`}><X size={20} /></button>
          <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400"><Zap size={24} /></div>
          <h3 className="text-2xl font-serif mb-2">{step.title}</h3>
          <p className={`text-sm ${theme.textMuted} leading-relaxed mb-8`}>{step.desc}</p>
          <div className="flex gap-4 justify-center items-center">
            <button onClick={() => { if (safeStepIndex > 0) setTutorialStep((s) => s - 1); }} disabled={safeStepIndex === 0} className={`p-3 rounded-full border ${theme.border} transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${safeStepIndex > 0 ? "hover:bg-zinc-800 text-white" : "text-zinc-600"}`}><ChevronLeft size={20} /></button>
            <div className="flex gap-2">{TUTORIAL_STEPS.map((_, i) => (<div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === safeStepIndex ? "bg-emerald-500 w-3" : "bg-zinc-700"}`} />))}</div>
            <button onClick={() => { if (!isLastStep) setTutorialStep((s) => s + 1); }} disabled={isLastStep} className={`p-3 rounded-full border ${theme.border} transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${!isLastStep ? "hover:bg-zinc-800 text-white" : "text-zinc-600"}`}><ChevronRightIcon size={20} /></button>
          </div>
        </div>
      </div>
    );
  };

  const startTutorial = () => { setTutorialStep(0); setShowTutorial(true); };

  if (showIntro) {
    return (
      <div className={`min-h-screen ${theme.bg} flex flex-col items-center justify-center`}>
        <div className="animate-in fade-in zoom-in duration-1000 flex flex-col items-center">
          <h1 className={`text-5xl md:text-7xl font-serif font-thin tracking-tighter ${theme.text} mb-4`}>Habit Tracker</h1>
          <div className={`h-px w-24 ${theme.accentBg} mb-4 animate-in slide-in-from-left duration-1000`}></div>
          <p className={`text-xs font-mono uppercase tracking-[0.3em] ${theme.textMuted} animate-in fade-in duration-1000 delay-300`}>Build Your System</p>
        </div>
      </div>
    );
  }

  if (!loadingAuth && !user) {
    return (
      <div className={`min-h-screen ${theme.bg} ${theme.text} flex flex-col items-center justify-center p-4`}>
        <div className={`w-full max-w-md p-8 rounded-lg border ${theme.border} ${theme.card} text-center shadow-2xl`}>
          <h2 className="text-3xl font-serif mb-2">Welcome Back</h2>
          <p className={`${theme.textMuted} mb-8 font-mono text-xs uppercase tracking-widest`}>Sync your progress across devices</p>
          <button onClick={handleLogin} className={`w-full py-4 ${theme.accentBg} hover:opacity-90 text-white font-medium rounded-md flex items-center justify-center gap-3 transition-all`}>
            <User size={18} /> Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === "profile") {
    return (
      <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans p-4 md:p-12 flex flex-col items-center justify-center`}>
        <style>{`.custom-scrollbar::-webkit-scrollbar { height: 8px; } .custom-scrollbar::-webkit-scrollbar-track { background: ${theme.scrollTrack}; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${theme.scrollThumb}; border-radius: 99px; } .heatmap-grid { display: grid; grid-template-rows: repeat(7, 1fr); grid-auto-flow: column; gap: 4px; }`}</style>
        {renderTutorial()}
        <div className="w-full max-w-6xl mb-8 flex items-center justify-between">
          <div>
            <button onClick={() => setViewMode("app")} className={`flex items-center gap-2 text-sm ${theme.textMuted} hover:text-white transition-colors mb-2`}><ArrowLeft size={16} /> Back to Dashboard</button>
            <h1 className="text-4xl font-serif font-light">PROFILE</h1>
            <p className={`text-xs font-mono uppercase tracking-widest ${theme.textMuted} mt-1`}>YOUR JOURNEY SO FAR</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setDarkMode(!darkMode)} className={`p-3 rounded-full border ${theme.border} ${theme.hover} transition-all`}>{darkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
            <div className={`w-10 h-10 rounded-full border ${theme.border} overflow-hidden bg-black flex items-center justify-center text-sm font-bold ${theme.text}`}>
              {user?.photoURL && !imgError ? <img src={user.photoURL} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={() => setImgError(true)} /> : user?.displayName ? user.displayName[0].toUpperCase() : <User size={18} />}
            </div>
          </div>
        </div>
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
          <div className={`md:col-span-1 ${theme.card} border ${theme.border} rounded-lg p-8 flex flex-col items-center justify-between text-center shadow-sm`}>
            <div>
              <div className={`w-32 h-32 rounded-full border-4 ${theme.border} overflow-hidden mb-6 flex items-center justify-center bg-black text-4xl font-serif mx-auto`}>
                {user?.photoURL && !imgError ? <img src={user.photoURL} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={() => setImgError(true)} /> : user?.displayName ? user.displayName[0].toUpperCase() : <User size={40} />}
              </div>
              <h2 className="text-2xl font-serif">{user?.displayName || "User"}</h2>
              <p className={`text-sm ${theme.textMuted} mt-2`}>Level {currentLevel}</p>
              <div className="mt-6">
                <div className="flex justify-between text-xs font-mono mb-2 text-emerald-400"><span>{Math.floor(calculatedXP)} XP</span><span>{nextLevelXP} XP</span></div>
                <div className={`w-full h-1.5 ${theme.heatmapEmpty} rounded-full overflow-hidden`}><div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${levelProgress}%` }}></div></div>
              </div>
            </div>
            <button onClick={() => setViewMode("logbook")} className={`mt-6 w-full py-3 border ${theme.border} ${theme.hover} flex items-center justify-center gap-2 text-sm rounded transition-colors text-emerald-400 font-medium tracking-wide`}><BookOpen size={16} /> {user?.displayName ? user.displayName.split(' ')[0] + "'s" : "User's"} Log</button>
            <button onClick={handleLogout} className={`mt-4 w-full py-3 border ${theme.border} ${theme.hover} text-red-400 flex items-center justify-center gap-2 text-sm rounded transition-colors`}><LogOut size={16} /> Sign Out</button>
          </div>
          <div className="md:col-span-2 flex flex-col gap-6">
            <div className={`flex-1 ${theme.card} border ${theme.border} rounded-lg p-8 overflow-hidden flex flex-col relative group min-h-[300px]`}>
              <div className="flex justify-between items-start z-10">
                <h3 className="text-lg font-serif">Vision Board</h3>
                {visionBoardImg ? (
                  <button onClick={removeVisionBoard} className="text-xs font-mono border border-red-900/30 text-red-500 px-2 py-1 rounded hover:bg-red-500/10 transition-colors flex items-center gap-1"><Trash2 size={10} /> REMOVE</button>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} className="text-xs font-mono border border-zinc-700 px-2 py-1 rounded hover:bg-zinc-800 transition-colors flex items-center gap-1"><Upload size={10} /> UPLOAD</button>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>
              <div className="flex-1 mt-4 rounded-lg bg-black/50 relative overflow-hidden flex items-center justify-center border border-zinc-800 min-h-[200px]" onContextMenu={(e) => e.preventDefault()}>
                {visionBoardImg ? (
                  <>
                    <img src={visionBoardImg} alt="Vision" className="absolute w-full h-full object-contain transition-all duration-1000 ease-out pointer-events-none" style={{ filter: `blur(${blurAmount}px)` }} />
                    <div className="absolute inset-0 z-20"></div>
                  </>
                ) : (
                  <div className="text-center p-6 opacity-30"><ImageIcon className="w-12 h-12 mx-auto mb-2" /><p className="text-xs font-mono">UPLOAD YOUR GOAL</p></div>
                )}
                {visionBoardImg && blurAmount > 0 && <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm z-30"><p className="text-[10px] font-mono text-emerald-400">CLARITY: {currentLevel}%</p></div>}
              </div>
            </div>
            <div className={`${theme.card} border ${theme.border} rounded-lg p-8 overflow-hidden`}>
              <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-serif">Consistency Grid</h3><p className={`text-xs font-mono ${theme.textMuted}`}>LAST 365 DAYS</p></div>
              <div className="overflow-x-auto custom-scrollbar pb-2">
                <div className="w-max">
                  <div className="heatmap-grid h-24">
                    {heatmapData.map((day, i) => (
                      <div key={i} title={`${day.date.toDateString()}: ${day.count} habits`} className={`w-2.5 h-2.5 rounded-[2px] ${day.count === 0 ? theme.heatmapEmpty : day.count < 3 ? "bg-emerald-900" : day.count < 5 ? "bg-emerald-600" : "bg-emerald-400"}`} />
                    ))}
                  </div>
                  <div className="flex mt-2 h-4 relative">
                    {monthsLabels.map((label, idx) => label && <span key={idx} className={`absolute text-[9px] font-mono ${theme.textMuted}`} style={{ left: `${idx * 14}px` }}>{label}</span>)}
                  </div>
                </div>
              </div>
              <div className={`flex items-center gap-2 mt-4 text-[10px] font-mono ${theme.textMuted}`}>
                <span>Less</span><div className={`w-2.5 h-2.5 rounded-[2px] ${theme.heatmapEmpty}`} /><div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-900" /><div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600" /><div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400" /><span>More</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className={`${theme.card} border ${theme.border} rounded-lg p-6 text-center`}><Flame className={`w-6 h-6 mx-auto mb-2 ${currentStreak > 0 ? "text-orange-500" : theme.textMuted}`} /><h4 className="text-2xl font-mono font-bold">{currentStreak}</h4><p className={`text-[10px] uppercase tracking-widest ${theme.textMuted}`}>Current Streak</p></div>
              <div className={`${theme.card} border ${theme.border} rounded-lg p-6 text-center`}><Award className={`w-6 h-6 mx-auto mb-2 ${theme.textMuted}`} /><h4 className="text-2xl font-mono font-bold">{bestStreak}</h4><p className={`text-[10px] uppercase tracking-widest ${theme.textMuted}`}>Best Streak</p></div>
              <div className={`${theme.card} border ${theme.border} rounded-lg p-6 text-center`}><Calendar className={`w-6 h-6 mx-auto mb-2 ${theme.textMuted}`} /><h4 className="text-2xl font-mono font-bold">{activeDays}</h4><p className={`text-[10px] uppercase tracking-widest ${theme.textMuted}`}>Active Days</p></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "logbook") {
    return (
      <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans p-4 md:p-12 flex flex-col items-center justify-center`}>
        <style>{`.custom-scrollbar::-webkit-scrollbar { height: 8px; } .custom-scrollbar::-webkit-scrollbar-track { background: ${theme.scrollTrack}; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${theme.scrollThumb}; border-radius: 99px; }`}</style>
        <div className="w-full max-w-4xl h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <div>
                   <button onClick={() => setViewMode("profile")} className={`flex items-center gap-2 text-sm ${theme.textMuted} hover:text-white transition-colors mb-2`}><ArrowLeft size={16} /> Back to Profile</button>
                   <h2 className="text-3xl font-serif">{user?.displayName ? user.displayName.split(' ')[0] + "'s" : "User's"} Log</h2>
                </div>
                <div className="flex items-center gap-3">
                   <div className={`relative flex items-center ${theme.cardLight} border ${theme.border} rounded-md px-3 py-1.5`}>
                       <Search size={14} className={theme.textMuted} />
                       <input type="text" placeholder="Search logs..." className="bg-transparent border-none outline-none text-sm ml-2 w-32 md:w-48 placeholder:text-zinc-600" value={logSearch} onChange={(e) => setLogSearch(e.target.value)} />
                   </div>
                   <div className="flex gap-1">
                      {['all', 'notes', 'perfect', 'missed'].map(f => (
                          <button key={f} onClick={() => setLogFilter(f)} className={`text-[10px] font-mono uppercase px-3 py-1.5 rounded border transition-colors ${logFilter === f ? `border-emerald-500 ${theme.text}` : `${theme.border} ${theme.textMuted} hover:text-zinc-300`}`}>{f}</button>
                      ))}
                   </div>
                </div>
            </div>

            <div className={`flex-1 overflow-y-auto custom-scrollbar ${theme.card} border ${theme.border} rounded-lg p-8 shadow-lg`}>
                 <div className="relative border-l border-zinc-800 ml-4 md:ml-8 space-y-8">
                    {timelineLogs.map((log, idx) => (
                        <div key={idx} className="relative pl-8 md:pl-12 group">
                            <div className={`absolute -left-[5px] top-6 w-2.5 h-2.5 rounded-full border-2 ${theme.bg} ${log.isPerfect ? "bg-emerald-500 border-emerald-500" : log.missedCount > 0 ? "bg-red-500 border-red-500" : "bg-zinc-600 border-zinc-600"} transition-transform group-hover:scale-125 z-10`} />
                            <div className={`flex flex-col gap-3 ${theme.cardLight} border ${theme.border} rounded-lg p-5 hover:border-zinc-600 transition-colors`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="font-mono text-xs opacity-50">{log.dateStr}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            {log.isPerfect ? (
                                                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1"><Award size={12} /> PERFECT DAY</span>
                                            ) : log.missedCount > 0 ? (
                                                <span className="text-xs font-bold text-red-400">MISSED {log.missedCount}</span>
                                            ) : (
                                                <span className="text-xs font-bold text-zinc-400">{log.activeHabits} Active</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex -space-x-2">
                                            {log.habitsDetails.slice(0, 5).map((h, i) => (
                                                <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border ${theme.border} ${theme.bg} relative`} title={h.name}>
                                                    {h.icon}
                                                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border ${theme.border} flex items-center justify-center ${h.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                                </div>
                                            ))}
                                            {log.habitsDetails.length > 5 && <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] border ${theme.border} ${theme.bg} text-zinc-500`}>+{log.habitsDetails.length - 5}</div>}
                                        </div>
                                    </div>
                                </div>
                                {log.logContent && <p className="text-sm leading-relaxed mt-2 pl-3 border-l-2 border-zinc-700/50 italic opacity-80">"{log.logContent}"</p>}
                                <div className={`mt-2 pt-3 border-t ${theme.border} flex justify-between items-center`}>
                                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Daily Summary</span>
                                    <span className={`text-[10px] font-mono font-bold ${log.dailyXP > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>{log.dailyXP > 0 ? `+${log.dailyXP} XP` : '0 XP'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {timelineLogs.length === 0 && <div className="pl-12 text-sm opacity-50 italic">No logs found for this period.</div>}
                 </div>
             </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans p-4 md:p-12 flex flex-col items-center justify-center relative transition-colors duration-500 selection:bg-emerald-500/20 animate-in fade-in duration-700`}>
      <style>{`.custom-scrollbar::-webkit-scrollbar { height: 10px; width: 10px; } .custom-scrollbar::-webkit-scrollbar-track { background: ${theme.scrollTrack}; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${theme.scrollThumb}; border-radius: 9999px; border: 3px solid transparent; background-clip: content-box; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: ${darkMode ? "#52525b" : "#a1a1aa"}; } @keyframes floatUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-20px) scale(1.1); } }`}</style>
      {renderTutorial()}
      {xpPopups.map((p) => (<div key={p.id} className={`fixed pointer-events-none font-mono font-bold text-sm z-[60] ${p.isZero ? "text-zinc-500" : "text-emerald-400"}`} style={{ left: p.x + 10, top: p.y - 20, animation: "floatUp 0.8s ease-out forwards" }}>{p.amount >= 0 ? "+" : ""}{p.amount} XP</div>))}
      {notifications.map((n) => (
        <div key={n.id} className={`fixed top-4 right-4 z-[70] ${theme.cardLight} border border-emerald-500 text-emerald-400 px-4 py-3 rounded-md shadow-lg flex items-center gap-3 animate-in slide-in-from-right duration-300`}>
          <Trophy size={18} />
          <span className="text-sm font-bold font-mono">{n.message}</span>
        </div>
      ))}
      <div className="w-full max-w-7xl mb-8 flex flex-col-reverse md:flex-row justify-between items-center gap-6 mt-12 md:mt-0">
        <div className="w-full md:w-auto">
          <div className="flex items-center gap-6 mb-2">
            <div className="flex items-center gap-1">
              <button onClick={() => navigateMonth(-1)} disabled={isMinDate} className={`p-2 rounded-md transition-all ${isMinDate ? "opacity-20 cursor-not-allowed" : theme.hover}`}><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => navigateMonth(1)} disabled={isMaxDate} className={`p-2 rounded-md transition-all ${isMaxDate ? "opacity-20 cursor-not-allowed" : theme.hover}`}><ChevronRight className="w-5 h-5" /></button>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-light tracking-tight">{currentDate.toLocaleString("default", { month: "long" })}<span className={`text-lg font-mono ml-3 opacity-40 font-normal align-top`}>{currentYear}</span></h1>
          </div>
          <p className={`font-mono text-xs uppercase tracking-widest ${theme.textMuted} ml-1`}>MAINTAIN CONSISTENCY</p>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          <button onClick={() => startTutorial()} className={`p-2 rounded-full border ${theme.border} ${theme.hover} transition-all text-emerald-400`} title="Help"><HelpCircle size={16} /></button>
          {showLockButton && (
            <button onClick={() => setStrictMode(!strictMode)} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-mono font-medium transition-all ${strictMode ? "border-red-900/30 text-red-500 bg-red-500/5" : `${theme.border} ${theme.textMuted}`}`}>
              {strictMode ? <Lock size={12} /> : <Unlock size={12} />} <span className="hidden sm:inline">{strictMode ? "LOCKED" : "UNLOCKED"}</span>
            </button>
          )}
          <button onClick={() => setDarkMode(!darkMode)} className={`p-3 rounded-full border ${theme.border} ${theme.hover} transition-all`}>{darkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
          <button onClick={() => setViewMode("profile")} className={`w-10 h-10 rounded-full border ${theme.border} overflow-hidden transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-black`}>
            {user?.photoURL && !imgError ? <img src={user.photoURL} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={() => setImgError(true)} /> : <div className={`w-full h-full ${theme.cardLight} flex items-center justify-center text-sm font-bold ${theme.text}`}>{user?.displayName ? user.displayName[0].toUpperCase() : <User size={18} />}</div>}
          </button>
        </div>
      </div>
      <div className={`w-full max-w-7xl mb-6 flex gap-6 border-b ${theme.tabBorder}`}>
        <button onClick={() => setActiveTab("tracker")} className={`pb-2 text-sm font-mono tracking-wider uppercase transition-colors border-b-2 ${activeTab === "tracker" ? `border-emerald-500 ${theme.text}` : `border-transparent ${theme.textMuted} hover:text-zinc-300`}`}>// Journal</button>
        {currentHabits.length > 0 && !isFutureMonth && (<button onClick={() => setActiveTab("analysis")} className={`pb-2 text-sm font-mono tracking-wider uppercase transition-colors border-b-2 ${activeTab === "analysis" ? `border-emerald-500 ${theme.text}` : `border-transparent ${theme.textMuted} hover:text-zinc-300`}`}>// Analytics</button>)}
      </div>
      {activeTab === "tracker" && (
        <div className={`w-full max-w-7xl border-y ${theme.border} md:border ${theme.card} md:rounded-lg overflow-hidden flex flex-col h-fit shadow-sm animate-in fade-in duration-500`}>
          <div className="flex-1 flex flex-col min-w-0">
            <div className={`p-4 border-b ${theme.border} flex justify-between items-center ${theme.bg}`}>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-4">
                <span className={`font-serif text-xl font-light ${theme.text}`}>Daily Entries</span>
                {(currentHabits.length > 0 && !isTooFarFuture) && (
                  <div className={`flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase tracking-wider ${theme.textMuted}`}>
                    <div className="flex items-center gap-1.5"><div className={`w-4 h-4 flex items-center justify-center rounded-[2px] ${theme.checkBg} border border-emerald-900/30`}><Check size={10} strokeWidth={4} className={theme.checkFill}/></div><span>XP</span></div>
                    <div className="flex items-center gap-1.5"><div className={`w-4 h-4 flex items-center justify-center rounded-[2px] ${theme.checkBgZero}`}><Check size={10} strokeWidth={4} className={theme.checkFillZero}/></div><span>No XP</span></div>
                    <div className="flex items-center gap-1.5"><div className={`w-4 h-4 flex items-center justify-center rounded-[2px] ${theme.viceFail}`}><X size={10} strokeWidth={4} className="text-white"/></div><span>Vice Fail</span></div>
                  </div>
                )}
              </div>
              {!isPastMonth && !isTooFarFuture && (<button onClick={() => openAddHabit()} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono border ${theme.border} rounded hover:border-emerald-500 transition-colors`}><Plus size={12} /> ADD ENTRY</button>)}
            </div>
            <div className="overflow-x-auto custom-scrollbar bg-transparent">
              {currentHabits.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center h-96">
                  <Calendar className={`w-16 h-16 mb-6 opacity-20`} /><h3 className="text-2xl font-serif mb-2">Blank Page</h3>
                  <p className={`${theme.textMuted} max-w-sm mb-8 font-light`}>{isPastMonth ? "No records for this month." : "This month is a fresh start."}</p>
                  {!isPastMonth && !isTooFarFuture && (
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button onClick={() => openAddHabit()} className={`px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium tracking-wide rounded-sm shadow-lg shadow-emerald-900/20`}>Start New Habit</button>
                      {!isFirstMonth && (<button onClick={copyFromPreviousMonth} className={`px-8 py-3 border ${theme.border} ${theme.hover} text-sm font-medium tracking-wide rounded-sm`}>Copy Last Month</button>)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="inline-block min-w-full align-top">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className={`border-b ${theme.border}`}>
                        <th className={`sticky left-0 z-20 ${theme.gridHeader} p-4 text-left min-w-[200px] border-r ${theme.border}`}><span className="font-serif text-lg opacity-50">Habits</span></th>
                        {Array.from({ length: totalDaysShown }).map((_, i) => {
                          const dayNum = i + startDay; const isToday = dayNum === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
                          const dateKey = `${currentYear}-${currentMonth}-${dayNum}`;
                          const hasNote = logbook[dateKey];
                          return (<th key={i} onClick={() => openLogbook(dayNum)} className={`p-3 text-center min-w-[48px] border-r ${theme.gridBorder} ${isToday ? "bg-emerald-500/5" : ""} cursor-pointer hover:bg-white/5 transition-colors group relative`}><div className={`text-[10px] font-mono uppercase tracking-widest ${theme.textMuted} mb-1`}>{WEEK_DAYS[new Date(currentYear, currentMonth, dayNum).getDay()]}</div><div className={`text-sm font-mono flex items-center justify-center gap-1 ${isToday ? theme.accent : ""}`}>{dayNum < 10 ? `0${dayNum}` : dayNum}{hasNote && <span className="w-1 h-1 rounded-full bg-blue-400"></span>}</div></th>);
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {currentHabits.map((habit, index) => {
                        const isDraggable = !isPastMonth && currentHabits.length > 1;
                        return (
                          <tr key={habit.id} draggable={isDraggable} onDragStart={(e) => handleDragStart(e, index)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, index)} onDragEnd={() => setDraggedHabitIndex(null)} className={`group ${theme.hover} transition-colors ${draggedHabitIndex === index ? 'opacity-50' : ''}`}>
                            <td className={`sticky left-0 z-10 ${theme.gridHeader} group-hover:${theme.hover} p-4 border-r ${theme.border} border-b ${theme.border} transition-colors`}>
                              <div className="flex justify-between items-center group/cell">
                                <div className="flex items-center gap-3">{isDraggable && (<span className="cursor-grab active:cursor-grabbing text-zinc-500/30 hover:text-zinc-500 transition-colors"><GripVertical size={14} /></span>)}<span className="text-xl">{habit.icon}</span><span className="font-medium text-sm tracking-wide flex items-center gap-2">{habit.name}{habit.isVice && <Skull size={12} className="text-red-400 flex-shrink-0"/>}</span>{habit.restDays && habit.restDays.length > 0 && (<span className="text-[10px] text-zinc-500 ml-2 border border-zinc-700 px-1 rounded">REST: {habit.restDays.length}</span>)}</div>
                                {!isPastMonth && !isTooFarFuture && (<div className="flex gap-1 opacity-0 group-hover/cell:opacity-100 transition-opacity"><button onClick={() => openEditHabit(habit)} className="p-1 hover:text-emerald-400"><Edit2 size={12} /></button><button onClick={(e) => deleteHabit(habit.id, e)} className="p-1 hover:text-red-500"><X size={14} /></button></div>)}
                              </div>
                            </td>
                            {Array.from({ length: totalDaysShown }).map((_, dIdx) => {
                              const dayNum = dIdx + startDay; const key = `${habit.id}-${currentYear}-${currentMonth}-${dayNum}`; const entry = checks[key]; const isChecked = typeof entry === "object" ? entry.completed : !!entry;
                              const isToday = dayNum === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
                              const now = new Date(); const isFirstDayOfNewMonth = now.getDate() === 1; const isLastDayOfPrevMonth = dayNum === new Date(currentYear, currentMonth + 1, 0).getDate();
                              const isViewingLastMonth = (currentMonth === now.getMonth() - 1 && currentYear === now.getFullYear()) || (now.getMonth() === 0 && currentMonth === 11 && currentYear === now.getFullYear() - 1);
                              const allowLateEdit = isFirstDayOfNewMonth && isViewingLastMonth && isLastDayOfPrevMonth && now.getHours() < 9;
                              const isLocked = (strictMode && !isToday && !allowLateEdit) || (isPastMonth && !allowLateEdit);
                              const dayOfWeek = new Date(currentYear, currentMonth, dayNum).getDay();
                              const isRestDay = habit.restDays && habit.restDays.includes(dayOfWeek);
                              
                              let isVoid = false;
                              if (habit.createdAt) { const createdDate = new Date(habit.createdAt); createdDate.setHours(0, 0, 0, 0); const currentGridDate = new Date(currentYear, currentMonth, dayNum); if (currentGridDate < createdDate) isVoid = true; }
                              
                              const currentGridDate = new Date(currentYear, currentMonth, dayNum);
                              const nowStartOfDay = new Date(); nowStartOfDay.setHours(0,0,0,0);
                              const isFutureDate = currentGridDate > nowStartOfDay;

                              if (isVoid) return (<td key={dIdx} className={`p-0 text-center border-r ${theme.gridBorder} border-b ${theme.border}`} style={{ background: theme.voidPattern }}></td>);
                              if (isRestDay) return (<td key={dIdx} className={`p-0 text-center border-r ${theme.gridBorder} border-b ${theme.border} bg-zinc-900/30`}><div className="w-full h-14 flex items-center justify-center opacity-20"><Ban size={12} /></div></td>);
                              
                              const isZeroXP = isChecked && typeof entry === "object" && !entry.xpAwarded;
                              let checkColor = isZeroXP ? theme.checkFillZero : theme.checkFill;
                              let checkBgColor = isZeroXP ? theme.checkBgZero : theme.checkBg;
                              if(habit.isVice && isChecked) checkColor = theme.viceFail;

                              let cellContent = null;
                              if (habit.isVice) {
                                  if (isFutureDate) {
                                      cellContent = <div className={`w-1.5 h-1.5 rounded-full ${theme.gridBorder} bg-current opacity-10 group-hover:opacity-20`} />;
                                  } else if (isChecked) {
                                      cellContent = <div className={`w-5 h-5 rounded-sm ${checkColor} flex items-center justify-center shadow-sm`}><X className="w-3.5 h-3.5 text-white" strokeWidth={3} /></div>;
                                  } else {
                                      cellContent = <div className={`w-5 h-5 flex items-center justify-center`}><Check className={`w-4 h-4 ${theme.viceSuccess}`} /></div>;
                                  }
                              } else {
                                  if (isChecked) {
                                      cellContent = <div className={`w-5 h-5 rounded-sm ${checkBgColor} flex items-center justify-center shadow-sm border ${isZeroXP ? 'border-zinc-700' : 'border-emerald-900/50'}`}><Check className={`w-3.5 h-3.5 ${checkColor}`} strokeWidth={3} /></div>;
                                  } else {
                                      cellContent = <div className={`w-1.5 h-1.5 rounded-full ${theme.gridBorder} bg-current opacity-10 group-hover:opacity-20`} />;
                                  }
                              }

                              return (<td key={dIdx} className={`p-0 text-center border-r ${theme.gridBorder} border-b ${theme.border} relative ${isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${isToday ? "bg-emerald-500/5" : ""}`} onClick={(e) => !isLocked && toggleCheck(habit, dayNum, e)}><div className="w-full h-14 flex items-center justify-center">{cellContent}</div></td>);
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {activeTab === "analysis" && (
        <div className={`w-full max-w-7xl border-y ${theme.border} md:border ${theme.card} md:rounded-lg overflow-hidden p-8 shadow-sm animate-in fade-in duration-500 min-h-[600px]`}>
          {currentHabits.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-center p-12">
               <PieChart className={`w-16 h-16 mb-4 ${theme.textMuted}`} />
               <h3 className="text-2xl font-serif mb-2">No Data Yet</h3>
               <p className={`${theme.textMuted} max-w-sm`}>Add some habits in the Journal to see your analytics.</p>
             </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`lg:col-span-1 p-8 rounded-lg border ${theme.border} ${theme.cardLight} flex flex-col items-center justify-center relative overflow-hidden h-80`}>
              <div className="relative z-10 flex flex-col items-center"><p className={`text-xs font-mono uppercase tracking-widest ${theme.textMuted} mb-6`}>Month Score</p><div className="relative w-48 h-48"><svg className="w-full h-full transform -rotate-90"><circle cx="96" cy="96" r="60" stroke="currentColor" strokeWidth="12" fill="transparent" className="opacity-10" /><circle cx="96" cy="96" r="60" stroke={darkMode ? "#34d399" : "#059669"} strokeWidth="12" fill="transparent" strokeDasharray={2 * Math.PI * 60} strokeDashoffset={2 * Math.PI * 60 - (stats.overallPercent / 100) * (2 * Math.PI * 60)} strokeLinecap="butt" className="transition-all duration-1000 ease-out" /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-5xl font-serif font-light">{stats.overallPercent.toFixed(0)}%</span></div></div></div>
              <div className="absolute -right-12 -bottom-12 opacity-5"><PieChart size={200} /></div>
            </div>
            <div className="lg:col-span-2 flex flex-col gap-8">
              <div className={`flex-1 ${theme.cardLight} border ${theme.border} rounded-lg p-6 flex flex-col`}>
                <div className="flex justify-between items-end mb-6"><h3 className="font-serif text-xl font-light">Daily Rhythm</h3><div className={`text-xs font-mono ${theme.textMuted} flex items-center gap-2`}><span className="w-2 h-2 rounded-full bg-emerald-500"></span> High Activity</div></div>
                <div className="flex items-end gap-1 h-40">{stats.dailyStats.map((d, i) => (<div key={i} className="flex-1 h-full flex items-end group relative"><div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10 pointer-events-none left-1/2 -translate-x-1/2">Day {d.day}: {d.count}</div><div style={{ height: `${Math.max(d.percent, 5)}%` }} className={`w-full ${d.percent >= 100 ? "bg-emerald-500" : d.percent > 50 ? "bg-emerald-500/60" : d.percent > 0 ? "bg-emerald-500/30" : "bg-zinc-500/10"} min-h-[4px] rounded-t-[1px] transition-all hover:bg-emerald-400`} /></div>))}</div>
              </div>
              <div>
                <h3 className={`text-xs font-mono font-bold uppercase tracking-widest ${theme.textMuted} mb-4`}>Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{stats.habitStats.map((stat) => (<div key={stat.id} className={`p-4 rounded border ${theme.border} ${theme.cardLight} flex items-center justify-between`}><div className="flex items-center gap-3"><span className="text-xl">{stat.icon}</span><span className="font-medium text-sm">{stat.name}</span></div><div className="flex items-center gap-3"><div className={`w-16 h-1 ${theme.emptyBar} rounded-full overflow-hidden`}><div className={`h-full ${theme.accentBg}`} style={{ width: `${stat.percent}%` }} /></div><span className="font-mono text-xs opacity-60">{stat.percent.toFixed(0)}%</span></div></div>))}</div>
              </div>
            </div>
          </div>
          )}
        </div>
      )}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${theme.card} border ${theme.border} w-full max-w-md p-8 rounded-lg shadow-2xl`}>
            <div className="flex justify-between items-start mb-8">
              <div><h3 className="text-2xl font-serif">{editingHabitId ? "Edit Routine" : "New Entry"}</h3><p className={`text-sm ${theme.textMuted} mt-1`}>{editingHabitId ? "Modify your habits." : "Add a routine for " + currentDate.toLocaleString("default", { month: "long" })}</p></div>
              <button onClick={() => setShowAddModal(false)} className={theme.textMuted}><X size={20} /></button>
            </div>
            <div className="space-y-6">
              <div><label className={`block text-xs font-mono uppercase tracking-widest mb-2 ${theme.textMuted}`}>Name</label><input type="text" value={manualHabitName} onChange={(e) => setManualHabitName(e.target.value)} placeholder="e.g. Morning Run" className={`w-full bg-transparent border-b ${theme.border} py-2 text-lg focus:outline-none focus:border-emerald-500 transition-colors placeholder:opacity-20`} autoFocus /></div>
              <div>
                <label className={`block text-xs font-mono uppercase tracking-widest mb-3 ${theme.textMuted}`}>Icon</label>
                <div className="flex flex-wrap gap-2 mb-3">{PRESET_ICONS.map((icon) => (<button key={icon} onClick={() => setManualHabitIcon(icon)} className={`w-9 h-9 flex items-center justify-center rounded text-lg border transition-all ${manualHabitIcon === icon ? `border-emerald-500 ${theme.accentBg} text-white` : `${theme.border} hover:border-zinc-500 opacity-60 hover:opacity-100`}`}>{icon}</button>))}</div>
                <div className="flex items-center gap-2"><span className={`text-xs ${theme.textMuted}`}>Custom:</span><input type="text" value={manualHabitIcon} onChange={(e) => setManualHabitIcon(e.target.value)} className={`w-12 text-center bg-transparent border-b ${theme.border} py-1 text-lg focus:outline-none focus:border-emerald-500 transition-colors`} maxLength={2} /></div>
              </div>
              <div className="flex items-center justify-between border border-zinc-700 p-3 rounded">
                  <div><span className="block text-sm font-medium">Vice Mode</span><span className={`text-xs ${theme.textMuted}`}>Bad habit to break (e.g. Smoking)</span></div>
                  <button onClick={() => setManualIsVice(!manualIsVice)} className={`w-10 h-6 rounded-full transition-colors relative ${manualIsVice ? "bg-rose-500" : "bg-zinc-600"}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${manualIsVice ? "translate-x-4" : ""}`} /></button>
              </div>
              {!manualIsVice && (<div>
                <label className={`block text-xs font-mono uppercase tracking-widest mb-3 ${theme.textMuted}`}>Frequency (Days Active)</label>
                <div className="flex gap-2">{WEEK_DAYS.map((day, index) => { const isRest = manualRestDays.includes(index); return (<button key={day} onClick={() => { if (isRest) setManualRestDays((prev) => prev.filter((d) => d !== index)); else { setManualRestDays((prev) => [...prev, index]); } }} className={`w-9 h-9 text-xs font-bold rounded transition-all ${!isRest ? `bg-emerald-600 text-white` : `bg-zinc-800 text-zinc-500 line-through border ${theme.border}`}`}>{day}</button>); })}</div>
              </div>)}
              <button onClick={saveHabit} disabled={!manualHabitName.trim()} className={`w-full py-4 mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium tracking-wide rounded-sm disabled:opacity-50 transition-all`}>{editingHabitId ? "Save Changes" : "Confirm Addition"}</button>
            </div>
          </div>
        </div>
      )}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${theme.card} border ${theme.border} w-full max-w-md p-8 rounded-lg shadow-2xl`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-serif flex items-center gap-2"><BookOpen size={20} /> Daily Log: <span className="font-mono text-base opacity-70">{new Date(selectedLogDate.split('-')[0], selectedLogDate.split('-')[1], selectedLogDate.split('-')[2]).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span></h3>
                    <button onClick={() => setShowLogModal(false)} className={theme.textMuted}><X size={20} /></button>
                </div>
                <textarea className={`w-full h-32 bg-transparent border ${theme.border} rounded p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none mb-4`} placeholder="Log" value={logEntryText} onChange={handleLogChange} />
                <button onClick={saveLogEntry} className={`w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-sm transition-all`}>Save Entry</button>
            </div>
        </div>
      )}
    </div>
  );
}
