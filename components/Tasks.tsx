
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, User, TaskSubmission } from '../types';
import { ICONS } from '../constants';
import { useNavigate } from 'react-router-dom';
import { compressImage } from '../utils/imageCompressor';
import { LocalizedReward } from './localization';

export const isTelegramTask = (task: Task): boolean => {
  if (!task) return false;
  const typeStr = String(task.type || '').toLowerCase();
  if (typeStr === 'telegram') return true;

  const titleStr = String(task.title || '').toLowerCase();
  const descStr = String(task.description || '').toLowerCase();
  const linkStr = String(task.youtubeLink || '').toLowerCase();

  return (
    titleStr.includes('telegram') ||
    titleStr.includes('টেলিগ্রাম') ||
    titleStr.includes('t.me') ||
    descStr.includes('telegram') ||
    descStr.includes('টেলিগ্রাম') ||
    descStr.includes('t.me') ||
    linkStr.includes('telegram') ||
    linkStr.includes('t.me')
  );
};

// Ensure we have a unique device fingerprint id in localStorage
const getOrInitializeDeviceId = (): string => {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('arez_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
    localStorage.setItem('arez_device_id', id);
  }
  return id;
};

interface TasksProps {
  tasks: Task[];
  user: User;
  submissions: TaskSubmission[];
  setSubmissions: React.Dispatch<React.SetStateAction<TaskSubmission[]>>;
  notify: (msg: string) => void;
  // Added translation helper prop
  t: (key: any) => string;
  selectedCountryCode?: string;
}

const Tasks: React.FC<TasksProps> = ({ tasks, user, submissions, setSubmissions, notify, t, selectedCountryCode = 'BD' }) => {
  const navigate = useNavigate();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [textProof, setTextProof] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [showSuccessModal, setShowSuccessModal] = useState<{ title: string; reward: number; securityHash: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVerified = user.status === 'Verified' || user.role === 'admin';
  const deviceId = getOrInitializeDeviceId();

  const safeSubmissions = submissions || [];
  const baseTasks = tasks.filter(t => {
    if (!t.isActive) return false;
    
    // Telegram task check
    if (isTelegramTask(t) && !user.isTelegramVerified) return false;
    
    // Check if current user already submitted (pending or approved) this task
    const userSubmitted = safeSubmissions.some(
      s => s.taskId === t.id && s.userId === user.id && (s.status === 'pending' || s.status === 'approved')
    );
    if (userSubmitted) return false;

    // "1 Device= 1 Task" checks
    if (t.type === '1 Device= 1 Task') {
      const deviceOrIpSubmitted = safeSubmissions.some(s => {
        if (s.taskId !== t.id) return false;
        if (s.status !== 'pending' && s.status !== 'approved') return false;
        
        // Match by IP or Device Fingerprint
        const ipMatch = s.clientIp && user.ip && s.clientIp === user.ip;
        const deviceMatch = s.deviceFingerprint && deviceId && s.deviceFingerprint === deviceId;
        
        return ipMatch || deviceMatch;
      });
      
      if (deviceOrIpSubmitted) return false;
    }
    
    return true;
  });

  let availableTasks = [...baseTasks];
  if (typeFilter !== 'All') {
    availableTasks = availableTasks.filter(t => t.type === typeFilter);
  }

  const handleLaunchTask = (task: Task) => {
    const isTelegram = isTelegramTask(task);

    if (isTelegram && !user.isTelegramVerified) {
      notify("টেলিগ্রাম টাস্ক করার আগে টেলিগ্রাম অ্যাকাউন্ট ভেরিফাই করা বাধ্যতামূলক।");
      navigate('/telegram-verify');
      return;
    }
    if (!isVerified) {
      notify("টাস্ক শুরু করতে মেম্বারশিপ আপগ্রেড করুন।");
      navigate('/membership');
      return;
    }
    setSelectedTask(task);
    setCompletedSteps([]);
    setScreenshots([]);
    setTextProof('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const filesArray = Array.from(files) as File[];
      if (screenshots.length + filesArray.length > 5) {
        notify("Maximum 5 screenshots allowed.");
        return;
      }
      
      notify("স্ক্রিনশট প্রসেস করা হচ্ছে...");
      Promise.all(filesArray.map(file => compressImage(file)))
        .then(compressedUrls => {
          setScreenshots(prev => [...prev, ...compressedUrls]);
          notify("স্ক্রিনশট প্রসেস করা হয়েছে এবং যুক্ত করা হয়েছে!");
        })
        .catch(err => {
          console.error("Image processing error:", err);
          notify("স্ক্রিনশট প্রসেস করতে ব্যর্থ হয়েছে।");
        });
      e.target.value = '';
    }
  };

  const handleSubmit = () => {
    if (!selectedTask) return;
    if (completedSteps.length < selectedTask.instructions.length) {
      notify("সবগুলো নির্দেশাবলী সম্পন্ন করুন।");
      return;
    }
    if (screenshots.length === 0) {
      notify("কমপক্ষে ১টি স্ক্রিনশট আপলোড করুন।");
      return;
    }

    setIsSubmitting(true);
    
    // Security & Fake Task Detection: Generating a Hash based on Client Data
    const securityHash = btoa(`${user.id}-${selectedTask.id}-${Date.now()}-${user.ip}`).substring(0, 16);

    setTimeout(() => {
      const newSubmission: TaskSubmission = {
        id: Math.random().toString(36).substr(2, 9),
        taskId: selectedTask.id,
        userId: user.id,
        userName: user.name,
        taskTitle: selectedTask.title,
        reward: selectedTask.reward,
        screenshots: [...screenshots],
        textProof: textProof,
        status: 'pending',
        submittedAt: new Date().toLocaleString(),
        securityHash: securityHash,
        clientIp: user.ip,
        telegramIdUsed: selectedTask.type === 'Telegram' ? user.telegramId : undefined,
        deviceFingerprint: deviceId
      };
      setSubmissions(prev => [newSubmission, ...(prev || [])]);
      setShowSuccessModal({
        title: selectedTask.title,
        reward: selectedTask.reward,
        securityHash: securityHash
      });
      setSelectedTask(null);
      setIsSubmitting(false);
    }, 1500);
  };


  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 px-2 max-w-6xl mx-auto">
      {/* SECURITY SHIELD INDICATOR */}
      <div className="bg-slate-900 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ICONS.Shield size={16} className="text-emerald-500" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest italic">VPS SECURED DATABASE • ANTI-FRAUD ACTIVE</span>
        </div>
        <div className="hidden sm:block">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">UID: {user.uid}</span>
        </div>
      </div>

      {!isVerified && (
        <div className="bg-orange-500/10 border-2 border-orange-500/20 p-6 rounded-3xl flex items-center justify-between gap-4 mb-4">
          <p className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-tight italic">
            Upgrade your membership to unlock high-paying missions.
          </p>
          <button onClick={() => navigate('/membership')} className="bg-orange-500 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">UPGRADE</button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">MISSION <span className="text-[#10b981]">HUB</span></h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic opacity-60">Complete tasks to earn daily assets</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 overflow-x-auto no-scrollbar">
          {(user.isTelegramVerified 
            ? ['All', 'App Install', 'Link Open', 'Watch & Earn', 'Social', 'Telegram', '1 Device= 1 Task']
            : ['All', 'App Install', 'Link Open', 'Watch & Earn', 'Social', '1 Device= 1 Task']
          ).map(type => (
            <button key={type} onClick={() => setTypeFilter(type)} className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${typeFilter === type ? 'bg-[#10b981] text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableTasks.map(task => {
          const isTelegramLocked = isTelegramTask(task) && !user.isTelegramVerified;
          return (
            <div 
              key={task.id} 
              className={`bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border transition-all duration-300 hover:-translate-y-1 flex flex-col h-full min-h-[340px] relative overflow-hidden ${
                isTelegramLocked 
                  ? 'border-blue-500/30 bg-slate-50/50 dark:bg-slate-950/20' 
                  : 'border-slate-100 dark:border-white/5'
              }`}
            >
              {isTelegramLocked && (
                <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1.5 rounded-full text-[8.5px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md shadow-blue-500/10">
                  <ICONS.Lock size={11} className="animate-pulse" /> TELEGRAM LOCKED
                </div>
              )}

              <div className="flex justify-between items-start mb-8">
                <div className={`p-3.5 rounded-2xl shadow-inner ${
                  isTelegramLocked 
                    ? 'bg-blue-500/10 text-blue-500' 
                    : task.type === 'Watch & Earn' 
                      ? 'bg-rose-500/10 text-rose-500' 
                      : 'bg-[#10b981]/10 text-[#10b981]'
                }`}>
                  {isTelegramLocked ? (
                    <div className="relative">
                      <ICONS.Telegram size={24} />
                      <div className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 border border-white dark:border-slate-900">
                        <ICONS.Lock size={10} />
                      </div>
                    </div>
                  ) : task.type === 'Telegram' ? (
                    <ICONS.Telegram size={24} />
                  ) : task.type === 'Watch & Earn' ? (
                    <ICONS.Youtube size={24} />
                  ) : (
                    <ICONS.Zap size={24} />
                  )}
                </div>
                <div className="text-right flex flex-col items-end justify-center">
                  <LocalizedReward bdtAmount={task.reward} countryCode={selectedCountryCode} className="flex flex-col items-end" textClassName={`text-2xl font-black italic tracking-tighter leading-none ${isTelegramLocked ? 'text-blue-500' : 'text-[#10b981]'}`} usdClassName="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider" />
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 italic">Reward</p>
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3 uppercase italic tracking-tight">
                {task.title}
                {isTelegramLocked && <ICONS.Lock size={14} className="text-blue-500 inline ml-1.5" />}
              </h3>
              
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed flex-1 line-clamp-3 mb-8">
                {task.description}
              </p>

              {isTelegramLocked && (
                <div className="mb-4 p-3.5 bg-blue-500/10 border border-blue-500/25 rounded-2xl text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide leading-relaxed text-left flex items-start gap-1.5">
                  <span className="flex-shrink-0">🔒</span>
                  <span>টেলিগ্রাম ভেরিফিকেশন করা নেই! টাস্কটি সম্পন্ন করতে প্রথমে আপনার টেলিগ্রাম অ্যাকাউন্ট ভেরিফাই করুন।</span>
                </div>
              )}

              <button 
                onClick={() => handleLaunchTask(task)} 
                className={`w-full font-black py-4 rounded-xl shadow-xl uppercase text-[10px] tracking-[0.15em] active:scale-95 transition-all ${
                  isTelegramLocked 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-blue-500/10' 
                    : !isVerified 
                      ? 'bg-slate-950 text-white dark:bg-slate-800' 
                      : 'bg-slate-900 dark:bg-[#10b981] text-white'
                }`}
              >
                {isTelegramLocked 
                  ? 'Verify Telegram to Unlock' 
                  : !isVerified 
                    ? 'Upgrade to Unlock' 
                    : 'Start Mission'
                }
              </button>
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] border border-white/10 overflow-hidden relative">
            <div className="p-8 border-b border-slate-50 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[#10b981] text-white shadow-lg"><ICONS.Zap size={20} /></div>
                <div>
                  <h3 className="text-sm font-black dark:text-white uppercase tracking-tight italic truncate max-w-[200px]">{selectedTask.title}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ESTIMATED:</span>
                     <LocalizedReward bdtAmount={selectedTask.reward} countryCode={selectedCountryCode} className="flex flex-row items-center gap-1.5" textClassName="text-[10px] font-black text-[#10b981]" usdClassName="text-[8px] font-bold text-slate-400" />
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-slate-300 hover:text-red-500 transition-colors p-2"><ICONS.Close size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 flex items-center gap-3">
                 <ICONS.Shield size={16} className="text-emerald-500" />
                 <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest italic">FRAUD PROTECTION: This session is encrypted.</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Mission Briefing</h4>
                  {selectedTask.youtubeLink && (
                    <button 
                      onClick={() => window.open(selectedTask.youtubeLink, '_blank')} 
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        selectedTask.type === 'Telegram' 
                          ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500/20 shadow-lg shadow-blue-500/20 animate-pulse' 
                          : 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20'
                      }`}
                    >
                      {selectedTask.type === 'Telegram' ? (
                        <>
                          <ICONS.Telegram size={14} /> ক্লিক করুন (Go to Link)
                        </>
                      ) : (
                        <>
                          <ICONS.Youtube size={14} /> Video Guide
                        </>
                      )}
                    </button>
                  )}
                </div>

                {selectedTask.type === 'Telegram' && (
                  <div className="bg-blue-500/10 p-5 rounded-3xl border border-blue-500/20 space-y-2 animate-in zoom-in text-left">
                    <div className="flex items-center gap-2 text-blue-500 font-black text-xs uppercase italic">
                      <ICONS.Telegram size={16} /> ভেরিফাইড টেলিগ্রাম আইডি লক
                    </div>
                    <p className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed uppercase">
                      ⚠️ আপনি শুধুমাত্র আপনার ভেরিফাইড টেলিগ্রাম আইডিটি দিয়েই এই কাজ করতে পারবেন। অন্য কোনো আইডি ব্যবহার করলে পেমেন্ট রিজেক্ট হবে এবং অ্যাকাউন্ট ব্যান হতে পারে। প্রতি বার খেয়াল রাখবেন সঠিক আইডি দিয়ে কাজ করছেন কি না।
                    </p>
                    <div className="p-3 bg-slate-50 dark:bg-black/30 rounded-2xl border border-blue-500/10 font-mono text-[10px] space-y-1">
                      <p className="text-slate-500">ইউজারনেম: <span className="text-blue-500 font-black">@{user.telegramUsername || 'None'}</span></p>
                      <p className="text-slate-500">ইউজার আইডি: <span className="text-blue-500 font-black">{user.telegramId || 'None'}</span></p>
                      <p className="text-slate-500">ফোন নম্বর: <span className="text-emerald-500 font-black">+{user.telegramPhone || 'None'}</span></p>
                    </div>
                  </div>
                )}

                <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed italic bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border-l-4 border-[#10b981] text-left">
                  {selectedTask.description}
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Instructions</h4>
                {selectedTask.instructions.map((step, i) => (
                  <div key={i} onClick={() => setCompletedSteps(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])} className={`p-5 rounded-[1.8rem] border-2 transition-all cursor-pointer flex items-center gap-5 ${completedSteps.includes(i) ? 'bg-[#10b981]/5 border-[#10b981]' : 'bg-slate-50 dark:bg-white/5 border-transparent'}`}>
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${completedSteps.includes(i) ? 'bg-[#10b981] text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>{i+1}</div>
                    <span className={`text-[11px] font-black uppercase tracking-tight ${completedSteps.includes(i) ? 'text-[#10b981]' : 'text-slate-500'}`}>{step}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-6 pt-4">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic ml-2">Verification Data</h4>
                  <input value={textProof} onChange={e => setTextProof(e.target.value)} placeholder="Username / TRX ID / Profile Link..." className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-[#10b981]/30 rounded-[1.5rem] py-5 px-6 font-black text-xs dark:text-white outline-none shadow-inner" />
                </div>
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic ml-2">Upload Screenshots (1-5)</h4>
                  <div className="flex flex-wrap gap-3">
                    {screenshots.map((s, i) => (
                      <div key={i} className="relative group">
                        <img src={s} className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/30" alt="P" />
                        <button onClick={() => setScreenshots(p => p.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg"><ICONS.Close size={12} /></button>
                      </div>
                    ))}
                    {screenshots.length < 5 && (
                      <button onClick={() => fileInputRef.current?.click()} className="w-20 h-20 bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center text-slate-300 hover:border-[#10b981] hover:text-[#10b981] transition-all gap-1">
                        <ICONS.Image size={24} />
                        <span className="text-[7px] font-black uppercase">ADD PIC</span>
                      </button>
                    )}
                  </div>
                  <input type="file" hidden ref={fileInputRef} accept="image/*" multiple onChange={handleFileChange} />
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-white/5">
               <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-[#10b981] text-white font-black py-5 rounded-[1.8rem] shadow-2xl shadow-emerald-500/30 uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95 transition-all">
                 {isSubmitting ? <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div> : <><ICONS.Zap size={20} /> Submit Proof</>}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* ANIMATED SUCCESS MODAL */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-[0_0_80px_rgba(16,185,129,0.25)] border border-emerald-500/20 p-8 text-center relative overflow-hidden"
            >
              {/* Animated decorative glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Success Checkmark Ring with Micro-animations */}
              <motion.div 
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 150, damping: 10 }}
                className="w-24 h-24 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20 border-4 border-white dark:border-slate-800 relative z-10"
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.div>

              {/* Title & Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="space-y-2 relative z-10"
              >
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Secured Proof Upload
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                  MISSION SUBMITTED!
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed max-w-sm mx-auto uppercase">
                  Your work proof has been uploaded successfully to our database and is currently queued for priority audit.
                </p>
              </motion.div>

              {/* Digital Receipt Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-6 bg-slate-50 dark:bg-slate-950/60 rounded-3xl p-6 border border-slate-200/50 dark:border-white/5 space-y-4 text-left font-sans relative z-10"
              >
                <div className="flex justify-between items-center pb-3.5 border-b border-dashed border-slate-200 dark:border-white/5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mission Title</span>
                  <span className="text-[11px] font-black text-slate-800 dark:text-white truncate max-w-[200px]">{showSuccessModal.title}</span>
                </div>

                <div className="flex justify-between items-center pb-3.5 border-b border-dashed border-slate-200 dark:border-white/5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Security ID Hash</span>
                  <span className="text-[10px] font-mono font-bold text-blue-500 bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/10">{showSuccessModal.securityHash}</span>
                </div>

                <div className="flex justify-between items-center pb-3.5 border-b border-dashed border-slate-200 dark:border-white/5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Est. Payout</span>
                  <LocalizedReward bdtAmount={showSuccessModal.reward} countryCode={selectedCountryCode} className="flex flex-row items-center gap-1.5" textClassName="text-sm font-black text-[#10b981]" usdClassName="text-[9px] font-bold text-slate-400" />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Audit Status</span>
                  <span className="text-[8px] font-black uppercase bg-orange-500/10 border border-orange-500/25 text-orange-500 px-3 py-1 rounded-full animate-pulse">
                    PENDING REVIEW
                  </span>
                </div>
              </motion.div>

              {/* Action Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="mt-6 relative z-10"
              >
                <button
                  onClick={() => setShowSuccessModal(null)}
                  className="w-full bg-[#10b981] hover:bg-emerald-600 text-white font-black py-4.5 rounded-[1.8rem] shadow-xl shadow-emerald-500/20 uppercase text-[11px] tracking-[0.25em] active:scale-95 transition-all cursor-pointer"
                >
                  Understood & Close
                </button>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Tasks;
