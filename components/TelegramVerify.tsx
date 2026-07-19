import React, { useState, useRef } from 'react';
import { User, TelegramVerificationRequest, Task, TaskSubmission } from '../types';
import { ICONS } from '../constants';
import { compressImage } from '../utils/imageCompressor';

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

interface TelegramVerifyProps {
  user: User;
  onUpdateUser: (user: User) => void;
  notify: (msg: string) => void;
  telegramRequests: TelegramVerificationRequest[];
  setTelegramRequests: React.Dispatch<React.SetStateAction<TelegramVerificationRequest[]>>;
  tasks?: Task[];
  submissions?: TaskSubmission[];
  setSubmissions?: React.Dispatch<React.SetStateAction<TaskSubmission[]>>;
  t?: (key: any) => string;
}

const TelegramVerify: React.FC<TelegramVerifyProps> = ({ 
  user, 
  onUpdateUser, 
  notify, 
  telegramRequests = [], 
  setTelegramRequests,
  tasks = [],
  submissions = [],
  setSubmissions,
  t
}) => {
  const [telegramUsername, setTelegramUsername] = useState(user.telegramUsername || '');
  const [telegramId, setTelegramId] = useState(user.telegramId || '');
  const [telegramPhone, setTelegramPhone] = useState(user.telegramPhone || '');
  const [isChannelJoined, setIsChannelJoined] = useState(user.hasJoinedTelegramChannel || false);
  const [isCheckingChannel, setIsCheckingChannel] = useState(false);
  const [screenshot, setScreenshot] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(user.telegramVerificationCode ? 2 : 1);
  const [verificationCode, setVerificationCode] = useState(user.telegramVerificationCode || '');

  // Sync state with user prop when it updates dynamically (e.g. approved by admin)
  React.useEffect(() => {
    setTelegramUsername(user.telegramUsername || '');
    setTelegramId(user.telegramId || '');
    setTelegramPhone(user.telegramPhone || '');
    setIsChannelJoined(user.hasJoinedTelegramChannel || false);
    setStep(user.telegramVerificationCode ? 2 : 1);
    setVerificationCode(user.telegramVerificationCode || '');
  }, [user]);

  // Telegram tasks execution states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [taskScreenshots, setTaskScreenshots] = useState<string[]>([]);
  const [textProof, setTextProof] = useState('');
  const taskFileInputRef = useRef<HTMLInputElement>(null);

  const safeSubmissions = submissions || [];
  const telegramTasks = tasks.filter(t => 
    t.isActive && 
    isTelegramTask(t) &&
    !safeSubmissions.find(s => s.taskId === t.id && s.userId === user.id && (s.status === 'pending' || s.status === 'approved'))
  );

  const handleLaunchTask = (task: Task) => {
    const isVerified = user.status === 'Verified' || user.role === 'admin';
    if (!isVerified) {
      notify("টাস্ক শুরু করতে মেম্বারশিপ আপগ্রেড করুন।");
      return;
    }
    setSelectedTask(task);
    setCompletedSteps([]);
    setTaskScreenshots([]);
    setTextProof('');
  };

  const handleTaskFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const filesArray = Array.from(files) as File[];
      if (taskScreenshots.length + filesArray.length > 5) {
        notify("Maximum 5 screenshots allowed.");
        return;
      }
      
      notify("স্ক্রিনশট প্রসেস করা হচ্ছে...");
      Promise.all(filesArray.map(file => compressImage(file)))
        .then(compressedUrls => {
          setTaskScreenshots(prev => [...prev, ...compressedUrls]);
          notify("স্ক্রিনশট প্রসেস করা হয়েছে এবং যুক্ত করা হয়েছে!");
        })
        .catch(err => {
          console.error("Image processing error:", err);
          notify("স্ক্রিনশট প্রসেস করতে ব্যর্থ হয়েছে।");
        });
      e.target.value = '';
    }
  };

  const handleTaskSubmit = () => {
    if (!selectedTask || !setSubmissions) return;
    if (completedSteps.length < selectedTask.instructions.length) {
      notify("সবগুলো নির্দেশাবলী সম্পন্ন করুন।");
      return;
    }
    if (taskScreenshots.length === 0) {
      notify("কমপক্ষে ১টি স্ক্রিনশট আপলোড করুন।");
      return;
    }

    setIsSubmittingTask(true);
    
    const securityHash = btoa(`${user.id}-${selectedTask.id}-${Date.now()}-${user.ip}`).substring(0, 16);

    setTimeout(() => {
      const newSubmission: TaskSubmission = {
        id: Math.random().toString(36).substr(2, 9),
        taskId: selectedTask.id,
        userId: user.id,
        userName: user.name,
        taskTitle: selectedTask.title,
        reward: selectedTask.reward,
        screenshots: [...taskScreenshots],
        textProof: textProof,
        status: 'pending',
        submittedAt: new Date().toLocaleString(),
        securityHash: securityHash,
        clientIp: user.ip,
        telegramIdUsed: user.telegramId
      };
      setSubmissions(prev => [newSubmission, ...(prev || [])]);
      notify("Proof submitted with Security Hash ID: " + securityHash);
      setSelectedTask(null);
      setIsSubmittingTask(false);
    }, 1500);
  };

  const [botConfig, setBotConfig] = useState({
    isConfigured: false,
    botUsername: "@AREARNZONE_Support_Bot",
    channelLink: "https://t.me/AREARNZONE_OFFICIAL",
    isBotOnline: true
  });
  const [isBotConnected, setIsBotConnected] = useState(!!user.telegramId);
  const [isCheckingBot, setIsCheckingBot] = useState(false);
  const [isManualInput, setIsManualInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load backend Telegram configuration dynamically
  React.useEffect(() => {
    fetch('/api/telegram/config')
      .then(r => {
        if (!r.ok) throw new Error("HTTP error " + r.status);
        return r.json();
      })
      .then(data => {
        const configured = !!data.isConfigured;
        setBotConfig({
          isConfigured: configured,
          botUsername: data.botUsername || '@AREarnZone_bot',
          channelLink: data.channelLink || 'https://t.me/arearnzone',
          isBotOnline: data.isBotOnline !== false
        });
      })
      .catch(err => {
        console.warn("Error loading bot config, using defaults:", err);
        setBotConfig({
          isConfigured: false,
          botUsername: '@AREarnZone_bot',
          channelLink: 'https://t.me/arearnzone',
          isBotOnline: true
        });
      });
  }, []);

  // Poll/Verify the verification code inside bot database
  const handleVerifyBotConnection = () => {
    if (!verificationCode) return;
    setIsCheckingBot(true);
    fetch(`/api/telegram/check-code?code=${verificationCode}`)
      .then(r => {
        if (!r.ok) throw new Error("HTTP error " + r.status);
        return r.json();
      })
      .then(data => {
        setIsCheckingBot(false);
        if (data.success) {
          setTelegramUsername(data.telegramUsername);
          setTelegramId(data.telegramId);
          if (data.telegramPhone) {
            setTelegramPhone(data.telegramPhone);
          }
          setIsBotConnected(true);
          notify("সফলভাবে টেলিগ্রাম বটের সাথে কানেক্ট করা হয়েছে! ✅");
        } else {
          notify(data.message || "কোডটি এখনও বটে পাঠানো হয়নি। অনুগ্রহ করে প্রথমে বটে মেসেজ করুন।");
        }
      })
      .catch(err => {
        setIsCheckingBot(false);
        console.error("Error verifying bot connection:", err);
        notify("সংযোগ পরীক্ষা করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
      });
  };

  const handleVerifyChannelMembership = () => {
    if (!telegramId) {
      notify("প্রথমে টেলিগ্রাম বটের সাথে কানেক্ট করুন!");
      return;
    }
    setIsCheckingChannel(true);
    fetch(`/api/telegram/check-join?userId=${telegramId}`)
      .then(async r => {
        const data = await r.json();
        if (!r.ok) {
          throw new Error(data.error || "চ্যানেলে জয়েন করা হয়নি");
        }
        return data;
      })
      .then(data => {
        setIsCheckingChannel(false);
        setIsChannelJoined(true);
        notify(data.message || "অভিনন্দন! আপনি আমাদের টেলিগ্রাম চ্যানেলে জয়েন করেছেন। ✅");
      })
      .catch(err => {
        setIsCheckingChannel(false);
        console.error("Error verifying channel status:", err);
        notify(err.message || "আপনি এখনও আমাদের টেলিগ্রাম চ্যানেলে জয়েন করেননি! ❌");
      });
  };

  const BOT_USERNAME = botConfig.botUsername;
  const CHANNEL_LINK = botConfig.channelLink;

  // Check if there is already a pending request
  const pendingRequest = telegramRequests.find(req => req.userId === user.id && req.status === 'pending');
  const rejectedRequest = telegramRequests.find(req => req.userId === user.id && req.status === 'rejected');

  const handleGenerateCode = () => {
    if (!telegramPhone || telegramPhone.trim().length < 8) {
      notify("অনুগ্রহ করে আপনার সঠিক টেলিগ্রাম মোবাইল নম্বরটি আগে প্রদান করুন! ❌");
      return;
    }

    const code = 'AREZ-' + Math.floor(100000 + Math.random() * 900000);
    setVerificationCode(code);

    fetch('/api/telegram/register-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code,
        expectedPhone: telegramPhone
      })
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to register code on server.");
        return res.json();
      })
      .then(() => {
        setIsBotConnected(false);
        setTelegramUsername('');
        setTelegramId('');
        setIsChannelJoined(false);
        onUpdateUser({ 
          ...user, 
          telegramVerificationCode: code,
          telegramPhone: telegramPhone.replace('+', '').trim(),
          telegramUsername: '',
          telegramId: '',
          hasJoinedTelegramChannel: false
        });
        setStep(2);
        notify("টোকেন সফলভাবে তৈরি হয়েছে এবং সার্ভারে সেভ করা হয়েছে! ✅");
      })
      .catch(err => {
        console.error(err);
        notify("সার্ভারে কোড রেজিস্টার করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
      });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      notify("স্ক্রিনশট প্রসেস করা হচ্ছে...");
      compressImage(files[0])
        .then(compressedUrl => {
          setScreenshot(compressedUrl);
          notify("স্ক্রিনশট সফলভাবে যুক্ত করা হয়েছে!");
        })
        .catch(err => {
          console.error("Screenshot process error:", err);
          notify("স্ক্রিনশট প্রসেস করতে ব্যর্থ হয়েছে।");
        });
      e.target.value = '';
    }
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();

    const formattedUsername = telegramUsername.trim().toLowerCase();
    const cleanUsername = formattedUsername.startsWith('@') ? formattedUsername : '@' + formattedUsername;
    const cleanId = telegramId.trim();

    if (!cleanUsername || cleanUsername === '@') {
      notify("অনুগ্রহ করে একটি সঠিক টেলিগ্রাম ইউজারনেম দিন (e.g. @username)।");
      return;
    }

    if (!/^\d+$/.test(cleanId)) {
      notify("টেলিগ্রাম ইউজার আইডি অবশ্যই সংখ্যা হতে হবে।");
      return;
    }

    if (botConfig.isConfigured && !isManualInput && !isBotConnected) {
      notify("টেলিগ্রাম ভেরিফিকেশন সফল করতে প্রথমে বটের সাথে কানেক্ট করুন এবং 'Verify Bot Connection' সম্পন্ন করুন! ❌");
      return;
    }

    if (botConfig.isConfigured && !isManualInput && !isChannelJoined) {
      notify("টেলিগ্রাম ভেরিফিকেশন সফল করতে প্রথমে আমাদের চ্যানেলে জয়েন করে 'Verify Channel Join' বাটনে ক্লিক করতে হবে! ❌");
      return;
    }

    if (!screenshot) {
      notify("অনুগ্রহ করে আপনার স্ক্রিনশট প্রুফ আপলোড করুন।");
      return;
    }

    setIsSubmitting(true);

    // Dynamic 1:1 Duplicate check across users database
    const allUsers: User[] = JSON.parse(localStorage.getItem('arez_users') || '[]');
    
    const isUsernameTaken = allUsers.some(u => 
      u.isTelegramVerified && u.telegramUsername?.trim().toLowerCase() === cleanUsername && u.id !== user.id
    );
    const isIdTaken = allUsers.some(u => 
      u.isTelegramVerified && u.telegramId?.trim() === cleanId && u.id !== user.id
    );
    const isPhoneTaken = telegramPhone ? allUsers.some(u => 
      u.isTelegramVerified && u.telegramPhone?.trim() === telegramPhone.trim() && u.id !== user.id
    ) : false;

    // Duplicate check across existing approved/pending telegram requests
    const isReqUsernameTaken = telegramRequests.some(req => 
      req.telegramUsername.trim().toLowerCase() === cleanUsername && 
      req.userId !== user.id && 
      req.status !== 'rejected'
    );
    const isReqIdTaken = telegramRequests.some(req => 
      req.telegramId.trim() === cleanId && 
      req.userId !== user.id && 
      req.status !== 'rejected'
    );
    const isReqPhoneTaken = telegramPhone ? telegramRequests.some(req => 
      req.telegramPhone?.trim() === telegramPhone.trim() && 
      req.userId !== user.id && 
      req.status !== 'rejected'
    ) : false;

    if (isUsernameTaken || isReqUsernameTaken) {
      notify("Error: এই টেলিগ্রাম ইউজারনেমটি ইতিমধ্যে অন্য একটি অ্যাকাউন্টে লিংক করা আছে!");
      setIsSubmitting(false);
      return;
    }

    if (isIdTaken || isReqIdTaken) {
      notify("Error: এই টেলিগ্রাম আইডিটি ইতিমধ্যে অন্য একটি অ্যাকাউন্টে লিংক করা আছে!");
      setIsSubmitting(false);
      return;
    }

    if (isPhoneTaken || isReqPhoneTaken) {
      notify("Error: এই টেলিগ্রাম ফোন নম্বরটি ইতিমধ্যে অন্য একটি অ্যাকাউন্টে লিংক করা আছে!");
      setIsSubmitting(false);
      return;
    }

    // Submit request
    setTimeout(() => {
      const newRequest: TelegramVerificationRequest = {
        id: 'TGR-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        telegramUsername: cleanUsername,
        telegramId: cleanId,
        telegramPhone: telegramPhone,
        verificationCode: verificationCode,
        screenshot: screenshot,
        status: 'pending',
        submittedAt: new Date().toLocaleString()
      };

      setTelegramRequests(prev => [newRequest, ...prev]);
      
      // Update local user's telegram fields but keep verified FALSE until approved
      onUpdateUser({
        ...user,
        telegramUsername: cleanUsername,
        telegramId: cleanId,
        telegramPhone: telegramPhone,
        hasJoinedTelegramChannel: true,
        isTelegramVerified: false
      });

      setIsSubmitting(false);
      notify("ভেরিফিকেশন রিকোয়েস্ট সফলভাবে সাবমিট করা হয়েছে!");
    }, 1500);
  };

  if (user.isTelegramVerified && user.telegramUsername && user.telegramId) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24 px-4">
        {/* TOP STATUS CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="w-20 h-20 bg-blue-500 text-white rounded-[1.8rem] flex items-center justify-center shadow-2xl shadow-blue-500/30 shrink-0">
              <ICONS.Telegram size={44} />
            </div>
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Telegram <span className="text-blue-500">Verified</span>
                </h2>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">আপনার টেলিগ্রাম অ্যাকাউন্টটি সম্পূর্ণ ভেরিফাইড এবং লক করা আছে।</p>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap justify-center gap-3 bg-slate-50 dark:bg-white/5 p-4 rounded-3xl border border-slate-100 dark:border-white/5 font-mono text-[11px] min-w-[280px]">
            <div className="w-full flex justify-between gap-4">
              <span className="text-slate-400">USERNAME:</span>
              <span className="text-blue-500 font-bold">@{user.telegramUsername}</span>
            </div>
            <div className="w-full flex justify-between gap-4">
              <span className="text-slate-400">TELEGRAM ID:</span>
              <span className="text-slate-750 dark:text-white font-bold">{user.telegramId}</span>
            </div>
            {user.telegramPhone && (
              <div className="w-full flex justify-between gap-4">
                <span className="text-slate-400">PHONE:</span>
                <span className="text-slate-750 dark:text-white font-bold">+{user.telegramPhone}</span>
              </div>
            )}
          </div>
        </div>

        {/* TELEGRAM MISSIONS HEADER */}
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
            TELEGRAM <span className="text-blue-500">TASKS</span>
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic opacity-60">
            টেলিগ্রাম অ্যাকাউন্ট দিয়ে মিশনগুলো সম্পন্ন করে অতিরিক্ত অর্থ উপার্জন করুন
          </p>
        </div>

        {/* TELEGRAM TASKS GRID */}
        {telegramTasks.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 text-center border border-slate-100 dark:border-white/5 shadow-sm">
            <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ICONS.Telegram size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase italic">কোনো টেলিগ্রাম টাস্ক উপলব্ধ নেই</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">সবগুলো টেলিগ্রাম মিশন সফলভাবে সম্পন্ন হয়েছে! নতুন মিশনের জন্য অপেক্ষা করুন।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {telegramTasks.map(task => (
              <div 
                key={task.id} 
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-white/5 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full min-h-[340px] relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-8">
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-500">
                    <ICONS.Telegram size={24} />
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black italic tracking-tighter text-blue-500">৳{task.reward}</span>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 italic">Reward</p>
                  </div>
                </div>

                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3 uppercase italic tracking-tight">
                  {task.title}
                </h3>
                
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed flex-1 line-clamp-3 mb-8">
                  {task.description}
                </p>

                <button 
                  onClick={() => handleLaunchTask(task)} 
                  className="w-full font-black py-4 rounded-xl shadow-xl uppercase text-[10px] tracking-[0.15em] active:scale-95 transition-all bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-blue-500/10"
                >
                  Start Mission
                </button>
              </div>
            ))}
          </div>
        )}

        {/* RULE CARD BELOW */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 space-y-6">
            <div className="flex items-center gap-3 text-white border-b border-white/5 pb-4">
              <ICONS.Shield size={20} className="text-blue-500" />
              <h3 className="text-xs font-black uppercase italic tracking-[0.2em]">Platform Telegram Rules</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 font-sans">
               <SecurityRule text="One Telegram ID & Username per AREARNZONE account strictly enforced (1:1 Mapping)." />
               <SecurityRule text="Same Telegram details on more than one account will result in immediate permanent suspension." />
               <SecurityRule text="Fake verification submissions are rejected automatically - screenshot verification is manual and strict." />
               <SecurityRule text="Only fully verified Telegram members are allowed to view, unlock and perform Telegram tasks." />
            </div>
        </div>

        {/* MISSION LAUNCH / SUBMISSION MODAL */}
        {selectedTask && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] border border-white/10 overflow-hidden relative">
              <div className="p-8 border-b border-slate-50 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500 text-white shadow-lg"><ICONS.Telegram size={20} /></div>
                  <div>
                    <h3 className="text-sm font-black dark:text-white uppercase tracking-tight italic truncate max-w-[200px]">{selectedTask.title}</h3>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">ESTIMATED: ৳{selectedTask.reward}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedTask(null)} className="text-slate-300 hover:text-red-500 transition-colors p-2"><ICONS.Close size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar text-left">
                <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 flex items-center gap-3">
                   <ICONS.Shield size={16} className="text-blue-500" />
                   <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest italic">FRAUD PROTECTION: This session is encrypted.</span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Mission Briefing</h4>
                    {selectedTask.youtubeLink && (
                      <button 
                        onClick={() => window.open(selectedTask.youtubeLink, '_blank')} 
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all bg-blue-500 hover:bg-blue-600 text-white border-blue-500/20 shadow-lg shadow-blue-500/20 animate-pulse"
                      >
                        <ICONS.Telegram size={14} /> ক্লিক করুন (Go to Link)
                      </button>
                    )}
                  </div>

                  <div className="bg-blue-500/10 p-5 rounded-3xl border border-blue-500/20 space-y-2 animate-in zoom-in">
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

                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed italic bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border-l-4 border-blue-500 text-left">
                    {selectedTask.description}
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Instructions</h4>
                  {selectedTask.instructions.map((step, i) => (
                    <div key={i} onClick={() => setCompletedSteps(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])} className={`p-5 rounded-[1.8rem] border-2 transition-all cursor-pointer flex items-center gap-5 ${completedSteps.includes(i) ? 'bg-blue-500/5 border-blue-500' : 'bg-slate-50 dark:bg-white/5 border-transparent'}`}>
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${completedSteps.includes(i) ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>{i+1}</div>
                      <span className={`text-[11px] font-black uppercase tracking-tight ${completedSteps.includes(i) ? 'text-blue-500' : 'text-slate-500'}`}>{step}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-6 pt-4">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic ml-2">Verification Data</h4>
                    <input value={textProof} onChange={e => setTextProof(e.target.value)} placeholder="Username / TRX ID / Profile Link..." className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-blue-500/30 rounded-[1.5rem] py-5 px-6 font-black text-xs dark:text-white outline-none shadow-inner" />
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic ml-2">Upload Screenshots (1-5)</h4>
                    <div className="flex flex-wrap gap-3">
                      {taskScreenshots.map((s, i) => (
                        <div key={i} className="relative group">
                          <img src={s} className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500/30" alt="P" />
                          <button onClick={() => setTaskScreenshots(p => p.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg"><ICONS.Close size={12} /></button>
                        </div>
                      ))}
                      {taskScreenshots.length < 5 && (
                        <button onClick={() => taskFileInputRef.current?.click()} className="w-20 h-20 bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center text-slate-300 hover:border-blue-500 hover:text-blue-500 transition-all gap-1">
                          <ICONS.Image size={24} />
                          <span className="text-[7px] font-black uppercase">ADD PIC</span>
                        </button>
                      )}
                    </div>
                    <input type="file" hidden ref={taskFileInputRef} accept="image/*" multiple onChange={handleTaskFileChange} />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-white/5">
                 <button onClick={handleTaskSubmit} disabled={isSubmittingTask} className="w-full bg-blue-500 text-white font-black py-5 rounded-[1.8rem] shadow-2xl shadow-blue-500/30 uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95 transition-all">
                   {isSubmittingTask ? <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div> : <><ICONS.Zap size={20} /> Submit Proof</>}
                 </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none"></div>
        
        <div className="relative z-10 text-center">
          <div className="w-24 h-24 bg-blue-500 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/30">
            <ICONS.Telegram size={56} />
          </div>

          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none mb-3">
            Telegram <span className="text-blue-500">Verification</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold italic text-xs uppercase tracking-tight">
            1 Telegram Account = 1 AREARNZONE Account Strictly.
          </p>

          {pendingRequest ? (
            <div className="mt-12 p-10 rounded-[2.5rem] bg-amber-500/5 border-2 border-amber-500/20 animate-in zoom-in space-y-6">
              <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg animate-pulse">
                <ICONS.Pending size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-amber-500 uppercase italic">ভেরিফিকেশন পেন্ডিং আছে</h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-wide">
                  আপনার রিকোয়েস্টটি সফলভাবে সাবমিট হয়েছে। এডমিন প্যানেল থেকে খুব শীঘ্রই আপনার স্ক্রিনশট এবং সিকিউরিটি কোড যাচাই করে আপনার অ্যাকাউন্টটি ভেরিফাই করা হবে। অনুগ্রহ করে অপেক্ষা করুন।
                </p>
              </div>

              <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-3xl text-left border border-slate-100 dark:border-white/5 font-mono text-[11px] space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase">SUBMITTED USERNAME:</span>
                  <span className="text-slate-800 dark:text-emerald-400 font-bold">{pendingRequest.telegramUsername}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase">TELEGRAM ID:</span>
                  <span className="text-slate-800 dark:text-emerald-400 font-bold">{pendingRequest.telegramId}</span>
                </div>
                {pendingRequest.telegramPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 uppercase">PHONE NUMBER:</span>
                    <span className="text-slate-800 dark:text-emerald-400 font-bold">+{pendingRequest.telegramPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase">SECURITY CODE:</span>
                  <span className="text-slate-800 dark:text-emerald-400 font-bold text-xs">{pendingRequest.verificationCode}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-white/5">
                  <span className="text-slate-400 uppercase">STATUS:</span>
                  <span className="px-2.5 py-1 bg-amber-500/20 text-amber-500 rounded-lg text-[9px] font-black uppercase">PENDING REVIEW</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-10 space-y-8">
              {rejectedRequest && (
                <div className="p-5 bg-rose-500/10 border-2 border-rose-500/25 rounded-2xl text-left space-y-2">
                  <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                    <ICONS.Close size={14} /> রিকোয়েস্ট রিজেক্ট করা হয়েছে
                  </h4>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-snug">
                    আপনার পূর্বে পাঠানো রিকোয়েস্টটি এডমিন বাতিল করেছেন। সম্ভবত আপনার স্ক্রিনশট ভুল ছিল বা আপনি সিকিউরিটি কোডটি গ্রুপে পাঠাননি। অনুগ্রহ করে পুনরায় সঠিক তথ্য দিয়ে নিচে সাবমিট করুন।
                  </p>
                </div>
              )}

              {/* Stepper Visualization */}
              <div className="flex items-center justify-center gap-4">
                {(botConfig.isConfigured ? [1, 2, 3] : [1, 2]).map(i => (
                  <React.Fragment key={i}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                      i === 1
                        ? 'bg-blue-500 text-white shadow-lg'
                        : i === 2
                        ? (isBotConnected ? 'bg-blue-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400')
                        : (isChannelJoined ? 'bg-blue-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400')
                    }`}>
                      0{i}
                    </div>
                    {i < (botConfig.isConfigured ? 3 : 2) && (
                      <div className={`h-1 w-8 rounded-full ${
                        i === 1 && isBotConnected
                          ? 'bg-blue-500'
                          : i === 2 && isChannelJoined
                          ? 'bg-blue-500'
                          : 'bg-slate-100 dark:bg-slate-800'
                      }`}></div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-6 py-4 animate-in slide-in-from-bottom-4 text-left">
                  <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">ধাপ ১: সিকিউরিটি যাচাইকরণ কোড তৈরি করুন</h4>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight leading-loose">
                      প্রথমে আপনার অ্যাকাউন্ট সুরক্ষিত করার জন্য এবং সঠিক টেলিগ্রাম ম্যাচিং নিশ্চিত করতে নিচের বক্সে আপনার সঠিক <span className="text-blue-500 font-bold">টেলিগ্রাম মোবাইল নম্বর</span> দিন, তারপর সিকিউরিটি টোকেন জেনারেট করুন।
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 block">টেলিগ্রাম ফোন নম্বর (Telegram Phone Number)</label>
                    <input 
                      type="text" 
                      required 
                      value={telegramPhone ? (telegramPhone.startsWith('+') ? telegramPhone : `+${telegramPhone}`) : ''} 
                      onChange={e => setTelegramPhone(e.target.value.replace('+', ''))}
                      placeholder="e.g. +8801712345678"
                      className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-blue-500/30 rounded-2xl py-4 px-6 font-bold outline-none transition-all shadow-inner text-xs text-slate-900 dark:text-white"
                    />
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-normal mt-1.5 ml-2">
                      ⚠️ অবশ্যই আপনার ব্যবহৃত সঠিক টেলিগ্রাম নম্বর দিবেন। বট দিয়ে মোবাইল নম্বর শেয়ার করার সময় এই নম্বরের সাথে যাচাই করা হবে। অন্য নম্বর দিলে কাজ করবে না।
                    </p>
                  </div>

                  <button 
                    onClick={handleGenerateCode}
                    className="w-full bg-blue-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/30 uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Generate Security Token
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8 py-4 animate-in slide-in-from-bottom-4 text-left">
                  <div className="space-y-4">
                    {!botConfig.isBotOnline && (
                      <div className="bg-rose-500/10 border-2 border-rose-500/20 p-5 rounded-2xl space-y-2 animate-in zoom-in-95">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                          ⚠️ টেলিগ্রাম বট সাময়িকভাবে অফলাইন (Telegram Bot Offline)
                        </span>
                        <p className="text-[10.5px] font-bold text-rose-700 dark:text-rose-450 leading-relaxed uppercase tracking-tight">
                          বর্তমানে আমাদের অটোমেটিক টেলিগ্রাম বট সার্ভারটি নতুন টোকেন আপডেটের জন্য অফলাইনে রয়েছে। 
                        </p>
                        <p className="text-[10.5px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                          <b>বিকল্প সমাধান:</b> আপনি দয়া করে নিচে থাকা <b>"⚠️ বটের সাথে কানেক্ট করতে সমস্যা হচ্ছে? ম্যানুয়ালি তথ্য দিন"</b> বাটনে ক্লিক করুন। এরপর আপনার টেলিগ্রাম ইউজারনেম, ইউজার আইডি এবং বটের স্ক্রিনশট বা প্রোফাইল স্ক্রিনশট দিয়ে সাবমিট করুন। এডমিন আপনার তথ্য দেখে ম্যানুয়ালি এপ্রুভ করে দেবেন।
                        </p>
                      </div>
                    )}

                    <div className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20 space-y-2">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block">নির্দেশাবলী এবং নিয়ম (অটোমেটিক ভেরিফিকেশন):</span>
                      <p className="text-[10.5px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed uppercase tracking-tight">
                        ১। প্রথমে নিচের সিকিউরিটি কোডটি কপি করে আমাদের অফিশিয়াল টেলিগ্রাম বটের <a href={`https://t.me/${BOT_USERNAME.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-blue-500 font-black underline">{BOT_USERNAME}</a> চ্যাটে পাঠিয়ে দিন।
                      </p>
                      <p className="text-[10.5px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed uppercase tracking-tight">
                        ২। কোডটি বটে পাঠানোর পর নিচের <span className="text-blue-500 font-bold">"Verify Bot Connection"</span> বাটনে ক্লিক করুন। এটি আপনার আইডি ও ইউজারনেম অটো-ফিল করে দিবে।
                      </p>
                      <p className="text-[10.5px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed uppercase tracking-tight text-amber-500 font-bold">
                        ৩। বটের সাথে সফলভাবে লিঙ্ক হওয়ার পর, বটের কনফার্মেশন মেসেজের একটি স্ক্রিনশট নিচে আপলোড করে প্রুফ হিসেবে সাবমিট করুন।
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch gap-3">
                      <div className="flex-1 flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-blue-500/20">
                        <div className="flex-1 font-mono font-black text-2xl text-blue-500 tracking-[0.2em] p-4 text-center select-all italic">
                          {verificationCode}
                        </div>
                        <button 
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(verificationCode); notify("Token Copied!"); }}
                          className="bg-blue-500 text-white p-4 rounded-xl shadow-lg hover:bg-blue-650 active:scale-90 transition-all"
                        >
                          <ICONS.Link size={20} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleVerifyBotConnection}
                        disabled={isCheckingBot || isBotConnected}
                        className={`px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center justify-center gap-2 shrink-0 ${
                          isBotConnected
                            ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                            : 'bg-blue-500 hover:bg-blue-650 text-white shadow-lg shadow-blue-500/20 active:scale-95'
                        }`}
                      >
                        {isCheckingBot ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> Checking...
                          </>
                        ) : isBotConnected ? (
                          <>
                            <ICONS.Check size={14} /> Bot Verified ✅
                          </>
                        ) : (
                          <>
                            <ICONS.Telegram size={14} /> Verify Bot Connection
                          </>
                        )}
                      </button>
                    </div>

                    {isBotConnected && (
                      <div className="bg-blue-500/5 border-2 border-dashed border-blue-500/20 rounded-[2rem] p-6 text-center space-y-4 animate-in zoom-in-95 mt-4">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping"></span>
                          <h4 className="text-sm font-black text-blue-500 uppercase italic">ধাপ ৩: টেলিগ্রাম চ্যানেলে জয়েন করুন</h4>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight max-w-md mx-auto leading-relaxed">
                          টেলিগ্রামের কাজগুলো আনলক করতে আমাদের অফিশিয়াল চ্যানেলে যুক্ত থাকা বাধ্যতামূলক। নিচের লিংকে ক্লিক করে চ্যানেলে জয়েন করুন, তারপর যাচাই করুন।
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-3">
                          <a 
                            href={CHANNEL_LINK} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="bg-[#24A1DE] text-white font-black py-3 px-6 rounded-xl hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                          >
                            <ICONS.Telegram size={14} /> Join Telegram Channel
                          </a>

                          <button
                            type="button"
                            onClick={handleVerifyChannelMembership}
                            disabled={isCheckingChannel || isChannelJoined}
                            className={`py-3 px-6 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                              isChannelJoined 
                                ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                                : 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-600 active:scale-95'
                            }`}
                          >
                            {isCheckingChannel ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> verifying...
                              </>
                            ) : isChannelJoined ? (
                              <>
                                <ICONS.Check size={14} /> Verified Member ✅
                              </>
                            ) : (
                              <>
                                <ICONS.Shield size={14} /> Verify Channel Join
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualInput(!isManualInput);
                        if (!isManualInput) {
                          notify("ম্যানুয়াল মোড সক্রিয় করা হয়েছে! আপনি এখন ইউজারনেম ও আইডি হাতে লিখতে পারবেন। ✍️");
                        } else {
                          notify("অটোমেটিক ভেরিফিকেশন মোড সক্রিয় করা হয়েছে। 🤖");
                        }
                      }}
                      className="px-6 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/25 hover:border-amber-500/50 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      {isManualInput ? "🤖 অটোমেটিক ভেরিফিকেশনে ফিরে যান" : "⚠️ বটের সাথে কানেক্ট করতে সমস্যা হচ্ছে? ম্যানুয়ালি তথ্য দিন (Alternative)"}
                    </button>
                  </div>

                  <form onSubmit={handleSubmitRequest} className="space-y-6">
                    {isManualInput ? (
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-750 dark:text-amber-400 p-4 rounded-2xl text-xs font-bold leading-relaxed space-y-1 animate-in fade-in duration-300">
                        <p className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <ICONS.Shield size={14} /> ম্যানুয়াল মোড সক্রিয় (Manual Entry Mode Active)
                        </p>
                        <p className="text-[11px] opacity-90 font-medium">
                          অনুগ্রহ করে আপনার সঠিক টেলিগ্রাম ইউজারনেম এবং আইডি টাইপ করে দিন, এবং স্ক্রিনশট প্রুফ সাবমিট করুন। এডমিন আপনার দেওয়া তথ্য ম্যানুয়ালি মিলিয়ে এপ্রুভ করে দেবেন।
                        </p>
                      </div>
                    ) : (
                      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-750 dark:text-blue-400 p-4 rounded-2xl text-xs font-bold leading-relaxed space-y-1">
                        <p className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <ICONS.Shield size={14} /> তথ্য স্বয়ংক্রিয়ভাবে লক করা (Automatic Fields Locked)
                        </p>
                        <p className="text-[11px] opacity-90 font-medium">
                          নিরাপত্তা ও নির্ভুলতা নিশ্চিত করতে ম্যানুয়াল টাইপিং বন্ধ করা হয়েছে। উপরে বটের চ্যাটে কোড পাঠিয়ে ভেরিফাই করলে আপনার ইউজারনেম এবং আইডি স্বয়ংক্রিয়ভাবে সেট হয়ে যাবে।
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-1">
                          ১। ইউজারনেম (Username) {isManualInput ? <ICONS.Edit size={10} className="text-amber-500" /> : <ICONS.Lock size={10} className="text-slate-400" />}
                        </label>
                        <input 
                          type="text" 
                          required 
                          readOnly={!isManualInput}
                          value={telegramUsername} 
                          onChange={e => setTelegramUsername(e.target.value)}
                          placeholder={isManualInput ? "e.g. @username" : "Verify via Bot first 🤖"}
                          className={`w-full border rounded-2xl py-4 px-6 font-bold outline-none text-xs transition-all ${
                            isManualInput 
                              ? 'bg-white dark:bg-slate-950 border-amber-500/30 text-slate-850 dark:text-white focus:border-amber-500'
                              : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 cursor-not-allowed select-all'
                          }`}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-1">
                          ২। ইউজার আইডি (User ID) {isManualInput ? <ICONS.Edit size={10} className="text-amber-500" /> : <ICONS.Lock size={10} className="text-slate-400" />}
                        </label>
                        <input 
                          type="text" 
                          required 
                          readOnly={!isManualInput}
                          value={telegramId} 
                          onChange={e => setTelegramId(e.target.value)}
                          placeholder={isManualInput ? "e.g. 123456789" : "Verify via Bot first 🤖"}
                          className={`w-full border rounded-2xl py-4 px-6 font-bold outline-none text-xs transition-all ${
                            isManualInput 
                              ? 'bg-white dark:bg-slate-950 border-amber-500/30 text-slate-850 dark:text-white focus:border-amber-500'
                              : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 cursor-not-allowed select-all'
                          }`}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-1">
                          ৩। ফোন নম্বর (Phone) {isManualInput ? <ICONS.Edit size={10} className="text-amber-500" /> : <ICONS.Lock size={10} className="text-slate-400" />}
                        </label>
                        <input 
                          type="text" 
                          required 
                          readOnly={!isManualInput}
                          value={telegramPhone ? (telegramPhone.startsWith('+') ? telegramPhone : `+${telegramPhone}`) : ''} 
                          onChange={e => setTelegramPhone(e.target.value.replace('+', ''))}
                          placeholder="e.g. +8801712345678"
                          className={`w-full border rounded-2xl py-4 px-6 font-bold outline-none text-xs transition-all ${
                            isManualInput 
                              ? 'bg-white dark:bg-slate-950 border-amber-500/30 text-slate-850 dark:text-white focus:border-amber-500'
                              : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 cursor-not-allowed select-all'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 block">৪। স্ক্রিনশট প্রুফ আপলোড করুন (Bio code or Bot chat screenshot)</label>
                      <div className="flex items-center gap-4">
                        {screenshot ? (
                          <div className="relative">
                            <img src={screenshot} className="w-24 h-24 rounded-2xl object-cover border-2 border-[#10b981]" alt="telegram-proof" />
                            <button 
                              type="button" 
                              onClick={() => setScreenshot('')} 
                              className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                            >
                              <ICONS.Close size={12} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()} 
                            className="w-full h-24 bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all gap-1"
                          >
                            <ICONS.Upload size={24} />
                            <span className="text-[8px] font-black uppercase tracking-wider">Upload Proof Screenshot</span>
                          </button>
                        )}
                        <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileChange} />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button 
                        type="button" 
                        onClick={() => setStep(1)} 
                        className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest"
                      >
                        Back
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/30 uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all"
                      >
                        {isSubmitting ? <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div> : "Submit Verification Proof"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 space-y-6">
          <div className="flex items-center gap-3 text-white border-b border-white/5 pb-4">
            <ICONS.Shield size={20} className="text-blue-500" />
            <h3 className="text-xs font-black uppercase italic tracking-[0.2em]">Platform Telegram Rules</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 font-sans">
             <SecurityRule text="One Telegram ID & Username per AREARNZONE account strictly enforced (1:1 Mapping)." />
             <SecurityRule text="Same Telegram details on more than one account will result in immediate permanent suspension." />
             <SecurityRule text="Fake verification submissions are rejected automatically - screenshot verification is manual and strict." />
             <SecurityRule text="Only fully verified Telegram members are allowed to view, unlock and perform Telegram tasks." />
          </div>
      </div>
    </div>
  );
};

const SecurityRule: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-start gap-4 p-5 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0 shadow-[0_0_10px_#3b82f6]"></div>
    <p className="text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight italic group-hover:text-white transition-colors">{text}</p>
  </div>
);

export default TelegramVerify;
