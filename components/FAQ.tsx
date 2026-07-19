import React, { useState } from 'react';
import { ICONS } from '../constants';
import { LanguageCode, translate } from './localization';

interface FAQItem {
  id: string;
  category: 'general' | 'tasks' | 'membership' | 'finance';
  question: {
    EN: string;
    BN: string;
  };
  answer: {
    EN: string;
    BN: string;
  };
}

interface FAQProps {
  language: LanguageCode;
  selectedCountryCode: string;
  t: (text: string) => string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'gen-1',
    category: 'general',
    question: {
      EN: "What is AREARNZONE and how does it work?",
      BN: "AREARNZONE কি এবং এটি কীভাবে কাজ করে?"
    },
    answer: {
      EN: "AREARNZONE is an elite premier micro-job and rewarded-ad system. Users earn by completing small assignments, verifying social tasks, and watching ads. Advertisers get high-quality engagement, and users get a secure system to convert their spare time into passive earnings.",
      BN: "AREARNZONE হলো একটি এলিট মাইক্রো-টাস্ক এবং বিজ্ঞাপন ভিউ ভিত্তিক আর্নিং প্ল্যাটফর্ম। এখানে ছোট ছোট টাস্ক সম্পন্ন করে, সোশ্যাল টাস্ক ভেরিফাই করে এবং বিজ্ঞাপন দেখে সহজেই অর্থ উপার্জন করা যায়। বিজ্ঞাপনদাতারা তাদের কাঙ্ক্ষিত ভিজিটর পান এবং ব্যবহারকারীরা তাদের অবসর সময়কে আয়ে রূপান্তর করতে পারেন।"
    }
  },
  {
    id: 'gen-2',
    category: 'general',
    question: {
      EN: "Is it safe and legal to use AREARNZONE?",
      BN: "AREARNZONE ব্যবহার করা কি নিরাপদ এবং বৈধ?"
    },
    answer: {
      EN: "Absolutely. We run a fully secure, verified system protected by industry-standard protocols and strict firestore rules. We never sell your personal data, and we pay all verified users promptly according to our withdrawal rules.",
      BN: "হ্যাঁ, সম্পূর্ণ নিরাপদ। আমাদের সিস্টেমটি ইন্ডাস্ট্রি-স্ট্যান্ডার্ড প্রোটোকল এবং কঠোর ফায়ারস্টোর সিকিউরিটি দ্বারা সুরক্ষিত। আমরা ব্যবহারকারীদের ব্যক্তিগত তথ্যের সর্বোচ্চ নিরাপত্তা নিশ্চিত করি এবং ভেরিফাইড ইউজারদের উইথড্র রিকোয়েস্টগুলো দ্রুত পেমেন্ট করে থাকি।"
    }
  },
  {
    id: 'tasks-1',
    category: 'tasks',
    question: {
      EN: "How do I complete tasks and get rewarded?",
      BN: "আমি কীভাবে টাস্ক সম্পন্ন করব এবং রিওয়ার্ড পাব?"
    },
    answer: {
      EN: "Navigate to the 'Daily Tasks' tab, click on any task, follow the instructions (like joining a Telegram channel, watching a video, etc.), upload the required screenshot proof, and submit. Our support team or automated validators will check and approve your reward.",
      BN: "মেনু থেকে 'Daily Tasks' ট্যাবে যান, যেকোনো একটি টাস্ক নির্বাচন করুন এবং সেখানে দেওয়া নির্দেশনা ভালো করে পড়ুন (যেমন- টেলিগ্রাম চ্যানেলে যুক্ত হওয়া বা ভিডিও দেখা)। এরপর নির্দেশনা অনুযায়ী কাজের স্ক্রিনশট প্রমাণ হিসেবে আপলোড করে সাবমিট করুন। আমাদের এডমিন বা মডারেটর সেটি চেক করে রিওয়ার্ড ব্যালেন্স যোগ করে দিবেন।"
    }
  },
  {
    id: 'tasks-2',
    category: 'tasks',
    question: {
      EN: "Why was my task submission rejected?",
      BN: "আমার টাস্ক সাবমিশন কেন প্রত্যাখ্যাত (Rejected) হয়েছে?"
    },
    answer: {
      EN: "Task submissions are usually rejected if the uploaded screenshot is blurred, fake, duplicated, or if you did not follow the required instructions. Please submit genuine proofs to keep your account in good standing and avoid penalties.",
      BN: "সাধারণত ভুয়া স্ক্রিনশট দিলে, অস্পষ্ট প্রমাণ আপলোড করলে কিংবা নির্দেশনা সঠিকভাবে না মানলে টাস্ক বাতিল বা রিজেক্ট করা হয়। দয়া করে সবসময় সঠিক প্রমাণ সাবমিট করুন যাতে আপনার অ্যাকাউন্ট সুরক্ষিত থাকে এবং কোনো জরিমানা না হয়।"
    }
  },
  {
    id: 'mem-1',
    category: 'membership',
    question: {
      EN: "What are the benefits of upgrading my Membership?",
      BN: "মেম্বারশিপ আপগ্রেড করার সুবিধাগুলো কী কী?"
    },
    answer: {
      EN: "Upgrading your membership tier unlocks high-yield premium tasks, reduces withdrawal processing times, lowers cash-out fees, and increases daily task limits. It is designed to maximize your return on effort.",
      BN: "মেম্বারশিপ প্ল্যান আপগ্রেড করলে আপনি উচ্চ-মূল্যের প্রিমিয়াম টাস্ক পাবেন, উইথড্র প্রসেসিং সময় অনেক কমে যাবে, ক্যাশ-আউট ফি হ্রাস পাবে এবং প্রতিদিন বেশি টাস্ক করার সুযোগ পাবেন। এটি আপনার পরিশ্রমের সর্বোচ্চ প্রফিট নিশ্চিত করার জন্য ডিজাইন করা হয়েছে।"
    }
  },
  {
    id: 'mem-2',
    category: 'membership',
    question: {
      EN: "Do I have to purchase a membership to earn?",
      BN: "আয় করার জন্য কি মেম্বারশিপ কেনা বাধ্যতামূলক?"
    },
    answer: {
      EN: "While we have basic plans, upgrading to premium active levels ensures access to high-earning streams and complete verification on the payout system. Check the Membership screen to view current options.",
      BN: "আমাদের বেসিক লেভেলেও কাজের সুযোগ থাকে, তবে প্রিমিয়াম লেভেলে আপগ্রেড করলে দ্রুত ভেরিফিকেশন এবং বড় বড় পেমেন্ট পাওয়ার নিশ্চয়তা থাকে। বর্তমান অপশনগুলো দেখতে মেনু থেকে 'Membership' পেজ ভিজিট করুন।"
    }
  },
  {
    id: 'fin-1',
    category: 'finance',
    question: {
      EN: "How long does it take to process withdrawals?",
      BN: "উইথড্র বা টাকা উত্তোলন সম্পন্ন হতে কত সময় লাগে?"
    },
    answer: {
      EN: "Standard withdrawals are processed within 12 to 24 hours. Premium VIP membership withdraws are processed on high-priority, usually within 1 to 4 hours. Ensure your payout number (bKash/Nagad/USDT) is 100% correct.",
      BN: "সাধারণত উইথড্র রিকোয়েস্টগুলো ১২ থেকে ২৪ ঘণ্টার মধ্যে পেমেন্ট করা হয়। তবে ভিআইপি বা প্রিমিয়াম মেম্বারদের রিকোয়েস্টগুলো হাই-প্রায়োরিটি হিসেবে ১ থেকে ৪ ঘণ্টার মধ্যে পরিশোধ করা হয়। পেমেন্ট নাম্বার (বিকাশ/নগদ/USDT) দেওয়ার সময় ভালো করে চেক করে নিবেন।"
    }
  },
  {
    id: 'fin-2',
    category: 'finance',
    question: {
      EN: "What is the minimum withdrawal amount?",
      BN: "সর্বনিম্ন কত টাকা উইথড্র করা যায়?"
    },
    answer: {
      EN: "The minimum withdrawal limit depends on your country and payment method (e.g., bKash, Nagad, or Crypto). Please visit the 'Withdraw' page to check the active limit set by our finance team.",
      BN: "আপনার পেমেন্ট মেথড (যেমন- বিকাশ, নগদ বা ক্রিপ্টো) এবং দেশের উপর ভিত্তি করে সর্বনিম্ন উইথড্র এমাউন্ট ভিন্ন হতে পারে। বিস্তারিত জানতে দয়া করে 'Withdraw' পেজ ভিজিট করুন।"
    }
  }
];

export const FAQ: React.FC<FAQProps> = ({ language, selectedCountryCode, t }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'general' | 'tasks' | 'membership' | 'finance'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const isBN = language === 'BN';

  // Filter items based on Category and Search Query
  const filteredItems = FAQ_DATA.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const questionText = isBN ? item.question.BN : item.question.EN;
    const answerText = isBN ? item.answer.BN : item.answer.EN;
    const matchesSearch = 
      questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      answerText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      
      {/* Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-tr from-emerald-500/20 via-blue-500/5 to-transparent border border-white/5 p-6 rounded-3xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[9px] font-black uppercase tracking-widest">
              {isBN ? "সহায়তা কেন্দ্র" : "Support & Help Center"}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
            {isBN ? "সচরাচর জিজ্ঞাস্য প্রশ্নাবলী" : "Frequently Asked Questions"}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
            {isBN 
              ? "AREARNZONE নিয়ে সাধারণ প্রশ্ন এবং সহজে আয়ের সমস্ত সমাধান এখানে পেয়ে যাবেন।" 
              : "Find instant answers to common questions about missions, VIP tiers, and withdraw systems."}
          </p>
        </div>
      </div>

      {/* Interactive Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isBN ? "যেকোনো প্রশ্নের কি-ওয়ার্ড লিখে খুঁজুন..." : "Search questions or keywords..."}
          className="w-full pl-11 pr-5 py-4 text-xs font-bold rounded-2xl bg-slate-100 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 border border-slate-200/50 dark:border-white/5 focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-400"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-red-400 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { key: 'all', labelEN: 'All', labelBN: 'সব' },
          { key: 'general', labelEN: 'General', labelBN: 'সাধারণ' },
          { key: 'tasks', labelEN: 'Daily Tasks', labelBN: 'কাজ' },
          { key: 'membership', labelEN: 'VIP Tiers', labelBN: 'ভিআইপি' },
          { key: 'finance', labelEN: 'Withdraw', labelBN: 'টাকা উত্তোলন' }
        ].map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => {
                setActiveCategory(cat.key as any);
                setExpandedId(null);
              }}
              className={`px-4 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-300 shrink-0 cursor-pointer ${
                isActive 
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/15 scale-105'
                  : 'bg-slate-100 dark:bg-slate-900/40 border-slate-200/50 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-emerald-500/30'
              }`}
            >
              {isBN ? cat.labelBN : cat.labelEN}
            </button>
          );
        })}
      </div>

      {/* Accordion Questions List */}
      <div className="space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div 
                key={item.id}
                className={`border rounded-2xl transition-all duration-300 ${
                  isExpanded 
                    ? 'bg-slate-50 dark:bg-slate-900/60 border-emerald-500/20' 
                    : 'bg-white dark:bg-slate-950/40 border-slate-200/40 dark:border-white/5 hover:border-emerald-500/10'
                }`}
              >
                {/* Accordion Trigger */}
                <button
                  onClick={() => toggleAccordion(item.id)}
                  className="w-full flex items-center justify-between p-5 text-left gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Visual Category Icon */}
                    <div className={`p-2.5 rounded-xl shrink-0 transition-all ${
                      isExpanded ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-100 dark:bg-slate-900/60 text-slate-400'
                    }`}>
                      {item.category === 'general' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>}
                      {item.category === 'tasks' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
                      {item.category === 'membership' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                      {item.category === 'finance' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="12" y1="14" x2="12" y2="14"/></svg>}
                    </div>
                    <span className="text-[11.5px] font-black leading-tight text-slate-800 dark:text-slate-100">
                      {isBN ? item.question.BN : item.question.EN}
                    </span>
                  </div>
                  <div className={`text-slate-400 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180 text-emerald-400' : ''}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </button>

                {/* Accordion Content Panel */}
                <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="px-5 pb-5 pt-1 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed font-bold border-t border-slate-100 dark:border-white/5 flex gap-3.5">
                    <span className="text-emerald-500 font-extrabold text-sm select-none">A.</span>
                    <p className="flex-1">
                      {isBN ? item.answer.BN : item.answer.EN}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {isBN ? "কোনো মিল পাওয়া যায়নি" : "No FAQ Matched"}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              {isBN ? "অন্য কোনো শব্দ লিখে চেষ্টা করুন।" : "Try searching using different keywords."}
            </p>
          </div>
        )}
      </div>

      {/* Support & Contact Portal Box */}
      <div className="bg-gradient-to-tr from-slate-950 to-slate-900 p-6 rounded-3xl border border-white/5 space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/25">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-black text-white uppercase tracking-wider leading-none">
              {isBN ? "এখনও সাহায্য প্রয়োজন?" : "Still need help?"}
            </h4>
            <span className="text-[9px] font-bold text-slate-400">
              {isBN ? "আমাদের অফিসিয়াল চ্যানেলে যোগাযোগ করুন।" : "Contact our customer support team directly."}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          <a 
            href="https://t.me/arez_earning" 
            target="_blank" 
            referrerPolicy="no-referrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#0088cc] hover:bg-[#0088cc]/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <ICONS.Telegram size={14} />
            {isBN ? "অফিসিয়াল টেলিগ্রাম সাপোর্ট" : "Official Telegram Support"}
          </a>
          
          <div className="flex items-center justify-between p-3.5 bg-slate-900/60 rounded-xl border border-white/5">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Support Email</span>
              <span className="text-[10px] font-bold text-slate-300">support@arearnzone.com</span>
            </div>
            <span className="text-[8px] bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">
              24/7 Active
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
