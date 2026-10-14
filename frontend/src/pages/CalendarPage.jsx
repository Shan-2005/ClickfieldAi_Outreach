import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus,
  Clock, Link as LinkIcon, CheckCircle2, AlertTriangle, AlertCircle,
  Mail, Video, RefreshCw, Copy, Check, X, User
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function CalendarPage({ onOpenLeadDrawer }) {
  const { success, error, info } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'agenda'
  const [events, setEvents] = useState([]);
  const [todayItems, setTodayItems] = useState([]);
  const [overdueItems, setOverdueItems] = useState([]);
  const [feedUrl, setFeedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedFeed, setCopiedFeed] = useState(false);

  // New Meeting Modal
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [leadsList, setLeadsList] = useState([]);
  const [meetingForm, setMeetingForm] = useState({
    lead_id: '',
    title: '',
    date_str: new Date().toISOString().slice(0, 10),
    start_time: '11:00',
    end_time: '11:45',
    location_or_link: '',
    notes: ''
  });

  // Drag-and-drop state
  const [draggedEvent, setDraggedEvent] = useState(null);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/calendar/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setTodayItems(data.today_items || []);
        setOverdueItems(data.overdue_items || []);
        if (data.feed_url) setFeedUrl(window.location.origin + data.feed_url);
      }
    } catch (err) {
      console.error('Failed to load calendar events', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadsForPicker = async () => {
    try {
      const res = await fetch('/api/chennai-leads?limit=100');
      if (res.ok) {
        const data = await res.json();
        setLeadsList(data.leads || []);
      }
    } catch (err) {
      console.error('Failed to fetch leads for picker', err);
    }
  };

  useEffect(() => {
    fetchCalendarData();
    fetchLeadsForPicker();
  }, []);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Drag and drop reschedule
  const handleDragStart = (e, evt) => {
    if (evt.type !== 'followup') return;
    setDraggedEvent(evt);
    e.dataTransfer.setData('text/plain', evt.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropOnDate = async (e, targetDateStr) => {
    e.preventDefault();
    if (!draggedEvent) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    if (targetDateStr < todayStr) {
      error('Rescheduling to a past day is strictly prohibited.');
      setDraggedEvent(null);
      return;
    }

    try {
      const res = await fetch('/api/calendar/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: draggedEvent.lead_id,
          new_date: targetDateStr
        })
      });

      if (res.ok) {
        success(`Rescheduled follow-up to ${targetDateStr}.`);
        fetchCalendarData();
      } else {
        const err = await res.json();
        error(err.detail || 'Failed to reschedule.');
      }
    } catch {
      error('Connection error while rescheduling.');
    } finally {
      setDraggedEvent(null);
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!meetingForm.lead_id || !meetingForm.title) {
      error('Please select a lead and provide a meeting title.');
      return;
    }

    try {
      const res = await fetch('/api/calendar/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...meetingForm,
          lead_id: parseInt(meetingForm.lead_id, 10)
        })
      });

      if (res.ok) {
        success('Meeting scheduled! Lead advanced to Meeting stage.');
        setShowNewMeetingModal(false);
        fetchCalendarData();
      } else {
        const err = await res.json();
        error(err.detail || 'Failed to create meeting.');
      }
    } catch {
      error('Network error creating meeting.');
    }
  };

  const handleCopyFeed = () => {
    if (!feedUrl) return;
    navigator.clipboard.writeText(feedUrl);
    setCopiedFeed(true);
    success('Private .ics feed URL copied to clipboard.');
    setTimeout(() => setCopiedFeed(false), 2500);
  };

  const handleRegenerateFeed = async () => {
    try {
      const res = await fetch('/api/calendar/regenerate-feed', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setFeedUrl(window.location.origin + data.feed_url);
        success('Generated new calendar subscription token.');
      }
    } catch {
      error('Failed to regenerate token.');
    }
  };

  // Calendar Helpers (Week starts Monday)
  const getMonthDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday is 1, Sunday is 0. Shift so Monday is 0.
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days = [];

    // Preceding month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        dateStr: d.toISOString().slice(0, 10),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        dateStr: d.toISOString().slice(0, 10),
        isCurrentMonth: true
      });
    }

    // Trailing padding to fill 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dateStr: d.toISOString().slice(0, 10),
        isCurrentMonth: false
      });
    }

    return days;
  };

  const getWeekDays = (date) => {
    const cur = new Date(date);
    let day = cur.getDay() - 1;
    if (day === -1) day = 6;
    cur.setDate(cur.getDate() - day);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(cur);
      d.setDate(d.getDate() + i);
      days.push({
        date: d,
        dateStr: d.toISOString().slice(0, 10),
        isCurrentMonth: true
      });
    }
    return days;
  };

  const monthYearLabel = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const monthDays = getMonthDays(currentDate);
  const weekDays = getWeekDays(currentDate);
  const todayStr = new Date().toISOString().slice(0, 10);

  // Render event badge
  const renderEventBadge = (evt, idx) => {
    const isDraggable = evt.type === 'followup';
    let icon = <Clock className="w-3 h-3 shrink-0" />;
    let colorClass = 'bg-[var(--primary)]/15 border-[var(--primary)]/40 text-[var(--primary)]';

    if (evt.type === 'meeting') {
      icon = <Video className="w-3 h-3 shrink-0" />;
      colorClass = 'bg-[var(--success)]/15 border-[var(--success)]/40 text-[var(--success)]';
    } else if (evt.type === 'reply') {
      icon = <Mail className="w-3 h-3 shrink-0" />;
      colorClass = 'bg-[var(--warn)]/15 border-[var(--warn)]/40 text-[var(--warn)]';
    } else if (evt.type === 'tender') {
      icon = <AlertTriangle className="w-3 h-3 shrink-0" />;
      colorClass = 'bg-[var(--danger)]/15 border-[var(--danger)]/40 text-[var(--danger)]';
    }

    return (
      <div
        key={evt.id || idx}
        draggable={isDraggable}
        onDragStart={(e) => handleDragStart(e, evt)}
        onClick={(e) => {
          e.stopPropagation();
          if (evt.lead_id && onOpenLeadDrawer) {
            onOpenLeadDrawer(evt.lead_id);
          }
        }}
        className={`group px-2 py-1 rounded-[6px] border text-[11px] font-medium flex items-center gap-1.5 truncate cursor-pointer transition-all hover:scale-[1.01] ${colorClass} ${
          isDraggable ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        title={`${evt.title} (Click to open lead)`}
      >
        {icon}
        <span className="truncate">{evt.title}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-[calc(100vh-84px)] overflow-hidden">
      {/* Main Calendar View Area */}
      <div className="flex-1 flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-5 overflow-hidden">
        {/* Top Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <h2 className="text-[18px] font-semibold text-[var(--text)] tracking-tight">
              {monthYearLabel}
            </h2>
            <div className="flex items-center gap-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] p-0.5">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 rounded-[6px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-2 py-0.5 text-[12px] font-medium rounded-[6px] text-[var(--text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1 rounded-[6px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <span className="text-[12px] text-[var(--muted)] font-mono">
              (All times IST)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switch Segmented Control */}
            <div className="flex items-center bg-[var(--surface-2)] border border-[var(--border)] rounded-[8px] p-0.5">
              {['month', 'week', 'agenda'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 rounded-[6px] text-[12px] font-medium capitalize transition-all cursor-pointer ${
                    viewMode === mode
                      ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* New Meeting Button */}
            <button
              type="button"
              onClick={() => setShowNewMeetingModal(true)}
              className="h-[36px] px-3.5 rounded-[8px] bg-[var(--primary)] text-white text-[13px] font-medium flex items-center gap-1.5 hover:bg-[var(--primary)]/90 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Meeting</span>
            </button>
          </div>
        </div>

        {/* View Content with slide/fade motion */}
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode + currentDate.toISOString()}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col pt-4 overflow-y-auto"
          >
            {/* MONTH VIEW */}
            {viewMode === 'month' && (
              <div className="flex-1 flex flex-col min-h-[500px]">
                {/* Weekday headers: Mon-Sun */}
                <div className="grid grid-cols-7 border-b border-[var(--border)] pb-2 text-center text-[12px] font-medium text-[var(--muted)] uppercase tracking-wider">
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                  <div>Sun</div>
                </div>

                {/* Grid cells */}
                <div className="grid grid-cols-7 grid-rows-5 flex-1 gap-px bg-[var(--border)] border border-[var(--border)] rounded-[8px] overflow-hidden">
                  {monthDays.map((dayObj, i) => {
                    const dayEvents = events.filter((e) => e.date === dayObj.dateStr);
                    const isToday = dayObj.dateStr === todayStr;
                    const isPast = dayObj.dateStr < todayStr;

                    return (
                      <div
                        key={i}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnDate(e, dayObj.dateStr)}
                        className={`flex flex-col p-1.5 bg-[var(--surface)] min-h-[90px] transition-colors relative ${
                          !dayObj.isCurrentMonth ? 'opacity-40 bg-[var(--surface-2)]/40' : ''
                        } ${isToday ? 'ring-1 ring-inset ring-[var(--primary)]' : ''}`}
                      >
                        {/* Day Number */}
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-[12px] font-mono px-1.5 py-0.5 rounded ${
                              isToday
                                ? 'bg-[var(--primary)] text-white font-bold'
                                : 'text-[var(--muted)]'
                            }`}
                          >
                            {dayObj.date.getDate()}
                          </span>
                        </div>

                        {/* Events list */}
                        <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[85px] no-scrollbar">
                          {dayEvents.map((evt, idx) => renderEventBadge(evt, idx))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* WEEK VIEW */}
            {viewMode === 'week' && (
              <div className="flex-1 flex flex-col min-h-[500px]">
                <div className="grid grid-cols-7 border-b border-[var(--border)] pb-2 text-center text-[12px] font-medium text-[var(--muted)]">
                  {weekDays.map((w, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <span className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                        {w.date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span
                        className={`text-[14px] font-mono mt-0.5 px-2 py-0.5 rounded ${
                          w.dateStr === todayStr
                            ? 'bg-[var(--primary)] text-white font-bold'
                            : 'text-[var(--text)]'
                        }`}
                      >
                        {w.date.getDate()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 flex-1 gap-px bg-[var(--border)] border border-[var(--border)] rounded-[8px] overflow-hidden mt-2">
                  {weekDays.map((w, i) => {
                    const dayEvents = events.filter((e) => e.date === w.dateStr);
                    return (
                      <div
                        key={i}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnDate(e, w.dateStr)}
                        className={`p-2 bg-[var(--surface)] flex flex-col gap-1.5 min-h-[350px] ${
                          w.dateStr === todayStr ? 'ring-1 ring-inset ring-[var(--primary)]' : ''
                        }`}
                      >
                        {dayEvents.map((evt, idx) => renderEventBadge(evt, idx))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AGENDA VIEW */}
            {viewMode === 'agenda' && (
              <div className="flex-1 overflow-y-auto space-y-3">
                {events.length === 0 ? (
                  <div className="text-center py-12 text-[var(--muted)] text-[14px]">
                    No calendar events recorded.
                  </div>
                ) : (
                  events
                    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                    .map((evt, i) => (
                      <div
                        key={i}
                        onClick={() => evt.lead_id && onOpenLeadDrawer?.(evt.lead_id)}
                        className="p-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-4 hover:border-[var(--primary)]/50 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center font-mono text-[12px]">
                            {evt.date ? evt.date.slice(5) : 'Any'}
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold text-[var(--text)]">
                              {evt.title}
                            </div>
                            <div className="text-[12px] text-[var(--muted)]">
                              {evt.type === 'meeting' && `Location: ${evt.location || 'Online'}`}
                              {evt.type === 'followup' && `Lead Area: ${evt.area || 'Chennai'}`}
                              {evt.type === 'tender' && `Tender Category: ${evt.category || 'Tech'}`}
                              {evt.type === 'reply' && `Classification: ${evt.classification}`}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded uppercase tracking-wider bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]">
                          {evt.type}
                        </span>
                      </div>
                    ))
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 300px Right Panel: "Today", "Overdue", & .ics Sync */}
      <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4">
        {/* Today & Overdue Card */}
        <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-4 flex flex-col overflow-hidden">
          <h3 className="text-[14px] font-semibold text-[var(--text)] pb-3 border-b border-[var(--border)] flex items-center justify-between">
            <span>Today's Schedule</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--primary)]/15 text-[var(--primary)] font-bold">
              {todayItems.length} DUE
            </span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2 py-3">
            {todayItems.length === 0 ? (
              <div className="text-[12px] text-[var(--muted)] text-center py-6">
                No items scheduled for today.
              </div>
            ) : (
              todayItems.map((evt, idx) => (
                <div
                  key={idx}
                  onClick={() => evt.lead_id && onOpenLeadDrawer?.(evt.lead_id)}
                  className="p-2.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[12px] flex flex-col gap-1 cursor-pointer hover:border-[var(--primary)]/60 transition-colors"
                >
                  <div className="font-medium text-[var(--text)] truncate">{evt.title}</div>
                  <div className="text-[11px] text-[var(--muted)] flex items-center justify-between">
                    <span className="capitalize">{evt.type}</span>
                    <span className="font-mono text-[var(--primary)]">IST</span>
                  </div>
                </div>
              ))
            )}

            {/* Overdue Section */}
            {overdueItems.length > 0 && (
              <div className="pt-3 border-t border-[var(--border)] mt-2">
                <div className="text-[12px] font-semibold text-[var(--danger)] flex items-center gap-1.5 mb-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Overdue ({overdueItems.length})</span>
                </div>
                <div className="space-y-1.5">
                  {overdueItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => item.lead_id && onOpenLeadDrawer?.(item.lead_id)}
                      className="p-2 rounded-[6px] bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[11px] text-[var(--text)] flex items-center justify-between cursor-pointer hover:bg-[var(--danger)]/15"
                    >
                      <span className="truncate">{item.title}</span>
                      <span className="font-mono text-[var(--danger)] shrink-0 ml-2">
                        {item.date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Private .ics Feed Subscription Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-4 text-[12px]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-[var(--text)]">Calendar Sync (.ics)</span>
            <button
              type="button"
              onClick={handleRegenerateFeed}
              className="p-1 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              title="Regenerate private token"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-[var(--muted)] mb-3 leading-relaxed">
            Subscribe in Outlook, Apple Calendar, or Google Calendar to sync meetings, follow-ups, and tender deadlines automatically.
          </p>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={feedUrl || 'Generating feed URL...'}
              className="flex-1 h-[32px] px-2.5 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)] text-[11px] font-mono text-[var(--text)] truncate outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopyFeed}
              className="h-[32px] px-3 rounded-[6px] bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 border border-[var(--border)] text-[var(--text)] flex items-center gap-1 transition-colors cursor-pointer"
              title="Copy subscription URL"
            >
              {copiedFeed ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* New Meeting Modal */}
      {showNewMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-[480px] bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-4">
              <h3 className="text-[16px] font-semibold text-[var(--text)]">Schedule New Meeting</h3>
              <button
                type="button"
                onClick={() => setShowNewMeetingModal(false)}
                className="p-1 rounded text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-4 text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">
                  Select Lead / Company *
                </label>
                <select
                  value={meetingForm.lead_id}
                  onChange={(e) => setMeetingForm({ ...meetingForm, lead_id: e.target.value })}
                  className="w-full h-[36px] px-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] outline-none"
                  required
                >
                  <option value="">-- Choose lead --</option>
                  {leadsList.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.sector} - {l.area})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  placeholder="e.g. AI Automation Scoping Call"
                  className="w-full h-[36px] px-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Date</label>
                  <input
                    type="date"
                    value={meetingForm.date_str}
                    onChange={(e) => setMeetingForm({ ...meetingForm, date_str: e.target.value })}
                    className="w-full h-[36px] px-2.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Start Time</label>
                  <input
                    type="time"
                    value={meetingForm.start_time}
                    onChange={(e) => setMeetingForm({ ...meetingForm, start_time: e.target.value })}
                    className="w-full h-[36px] px-2.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">End Time</label>
                  <input
                    type="time"
                    value={meetingForm.end_time}
                    onChange={(e) => setMeetingForm({ ...meetingForm, end_time: e.target.value })}
                    className="w-full h-[36px] px-2.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">
                  Location or Meeting URL
                </label>
                <input
                  type="text"
                  value={meetingForm.location_or_link}
                  onChange={(e) => setMeetingForm({ ...meetingForm, location_or_link: e.target.value })}
                  placeholder="e.g. https://meet.google.com/xyz or Guindy Plant"
                  className="w-full h-[36px] px-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--muted)] mb-1">Notes / Agenda</label>
                <textarea
                  rows={3}
                  value={meetingForm.notes}
                  onChange={(e) => setMeetingForm({ ...meetingForm, notes: e.target.value })}
                  placeholder="Points to discuss during call..."
                  className="w-full p-2.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowNewMeetingModal(false)}
                  className="px-4 py-2 rounded-[8px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[8px] bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary)]/90 transition-all cursor-pointer"
                >
                  Schedule & Move to Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
