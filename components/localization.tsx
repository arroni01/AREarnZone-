import React from 'react';

export type LanguageCode = 'BN' | 'EN' | 'HI' | 'AR' | 'UR';

export interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  rateToBDT: number; // 1 BDT = rateToBDT of this currency
  languageCode: LanguageCode;
  languageName: string;
}

export const COUNTRIES: CountryConfig[] = [
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', currency: 'BDT', currencySymbol: '৳', rateToBDT: 1.0, languageCode: 'BN', languageName: 'বাংলা' },
  { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', currencySymbol: '₹', rateToBDT: 0.72, languageCode: 'HI', languageName: 'हिन्दी' },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', currencySymbol: '$', rateToBDT: 0.0085, languageCode: 'EN', languageName: 'English' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', currencySymbol: 'SR ', rateToBDT: 0.032, languageCode: 'AR', languageName: 'العربية' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', currency: 'PKR', currencySymbol: '₨', rateToBDT: 2.38, languageCode: 'UR', languageName: 'اردو' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', currencySymbol: '£', rateToBDT: 0.0067, languageCode: 'EN', languageName: 'English' }
];

export const DICTIONARY: Record<string, Record<LanguageCode, string>> = {
  // Navigation / Sidebar
  "Dashboard": {
    BN: "ড্যাশবোর্ড",
    EN: "Dashboard",
    HI: "डैशबोर्ड",
    AR: "لوحة التحكم",
    UR: "ڈیش بورڈ"
  },
  "Tasks": {
    BN: "টাস্ক",
    EN: "Tasks",
    HI: "कार्य",
    AR: "المهام",
    UR: "کام"
  },
  "Mission": {
    BN: "মিশন",
    EN: "Mission",
    HI: "मिशन",
    AR: "مهمة",
    UR: "مشن"
  },
  "Withdraw": {
    BN: "উইথড্র",
    EN: "Withdraw",
    HI: "निकासी",
    AR: "سحب",
    UR: "رقم نکالنا"
  },
  "History": {
    BN: "ইতিহাস",
    EN: "History",
    HI: "इतिहास",
    AR: "السجل",
    UR: "تاریخ"
  },
  "Profile": {
    BN: "প্রোফাইল",
    EN: "Profile",
    HI: "प्रोफ़ाइल",
    AR: "الملف الشخصي",
    UR: "پروفائل"
  },
  "Referral": {
    BN: "রেফারেল",
    EN: "Referral",
    HI: "रेफरल",
    AR: "الإحالة",
    UR: "ریفرل"
  },
  "Membership": {
    BN: "মেম্বারশিপ",
    EN: "Membership",
    HI: "सदस्यता",
    AR: "العضوية",
    UR: "ممبرشپ"
  },
  "Deposit": {
    BN: "ডিপোজিট",
    EN: "Deposit",
    HI: "जमा",
    AR: "إيداع",
    UR: "ڈپازٹ"
  },
  "Store": {
    BN: "স্টোর",
    EN: "Store",
    HI: "दुकान",
    AR: "المتجر",
    UR: "اسٹور"
  },
  "Earn Store": {
    BN: "আর্ন স্টোর",
    EN: "Earn Store",
    HI: "कमाई की दुकान",
    AR: "متجر الأرباح",
    UR: "کمائی کا اسٹور"
  },
  "Digital Shop": {
    BN: "ডিজিটাল শপ",
    EN: "Digital Shop",
    HI: "डिजिटल शॉप",
    AR: "المتجر الرقمي",
    UR: "ڈیجیٹل شاپ"
  },
  "Log Out": {
    BN: "লগ আউট",
    EN: "Log Out",
    HI: "लॉग आउट",
    AR: "تسجيل الخروج",
    UR: "لاگ آؤٹ"
  },

  // Stats / Dashboard Labels
  "Total Balance": {
    BN: "মোট ব্যালেন্স",
    EN: "Total Balance",
    HI: "कुल शेष",
    AR: "إجمالي الرصيد",
    UR: "کل بیلنس"
  },
  "Today's Earn": {
    BN: "আজকের ইনকাম",
    EN: "Today's Earn",
    HI: "आज की कमाई",
    AR: "أرباح اليوم",
    UR: "آج کی کمائی"
  },
  "Tasks Ready": {
    BN: "টাস্ক রেডি",
    EN: "Tasks Ready",
    HI: "कार्य तैयार हैं",
    AR: "المهام جاهزة",
    UR: "کام تیار ہیں"
  },
  "Referral Income": {
    BN: "রেফারেল ইনকাম",
    EN: "Referral Income",
    HI: "रेफरल आय",
    AR: "دخل الإحالة",
    UR: "ریفرل آمدنی"
  },
  "Upgrade Membership Now": {
    BN: "মেম্বারশিপ আপগ্রেড করুন",
    EN: "Upgrade Membership Now",
    HI: "सदस्यता अभी अपग्रेड करें",
    AR: "ترقية العضوية الآن",
    UR: "ابھی ممبرشپ اپ گریڈ کریں"
  },
  "Withdraw Assets": {
    BN: "উইথড্র করুন",
    EN: "Withdraw Assets",
    HI: "संपत्ति निकालें",
    AR: "سحب الأصول",
    UR: "اثاثے نکالیں"
  },
  "Start Mission": {
    BN: "মিশন শুরু করুন",
    EN: "Start Mission",
    HI: "मिशन शुरू करें",
    AR: "ابدأ المهمة",
    UR: "مشن شروع کریں"
  },
  "MISSION HUB": {
    BN: "মিশন হাব",
    EN: "MISSION HUB",
    HI: "मिशन हब",
    AR: "مركز المهام",
    UR: "مشن حب"
  },
  "Invite & Earn Commissions": {
    BN: "আমন্ত্রণ করুন ও কমিশন আয় করুন",
    EN: "Invite & Earn Commissions",
    HI: "आमंत्रित करें और कमीशन कमाएं",
    AR: "دعوة وكسب العمولات",
    UR: "دعوت دیں اور کمیشن کمائیں"
  },
  "Verified Payout System": {
    BN: "ভেরিফাইড পেমেন্ট সিস্টেম",
    EN: "Verified Payout System",
    HI: "सत्यापित भुगतान प्रणाली",
    AR: "نظام الدفع المعتمد",
    UR: "تصدیق شدہ ادائیگی کا نظام"
  },
  "Hi": {
    BN: "হ্যালো",
    EN: "Hi",
    HI: "नमस्ते",
    AR: "أهلاً",
    UR: "ہیلو"
  },
  "Welcome to the elite earning platform.": {
    BN: "এলিট আর্নিং প্ল্যাটফর্মে আপনাকে স্বাগতম।",
    EN: "Welcome to the elite earning platform.",
    HI: "अभिजात वर्ग के कमाई मंच पर आपका स्वागत है।",
    AR: "مرحبًا بك في منصة الأرباح النخبة.",
    UR: "اشرافیہ کمانے کے پلیٹ فارم میں خوش آمدید۔"
  },

  // Task Buttons / Labels
  "Pending": {
    BN: "পেন্ডিং",
    EN: "Pending",
    HI: "लंबित",
    AR: "قيد الانتظار",
    UR: "پینڈنگ"
  },
  "Approved": {
    BN: "অনুমোদিত",
    EN: "Approved",
    HI: "स्वीकृत",
    AR: "تمت الموافقة",
    UR: "منظور شدہ"
  },
  "Rejected": {
    BN: "প্রত্যাখ্যাত",
    EN: "Rejected",
    HI: "अस्वीकृत",
    AR: "مرفوض",
    UR: "مسترد"
  },
  "Join Official Telegram": {
    BN: "অফিসিয়াল টেলিগ্রামে যুক্ত হন",
    EN: "Join Official Telegram",
    HI: "आधिकारिक टेलीग्राम से जुड़ें",
    AR: "انضم إلى التلغرام الرسمي",
    UR: "آفیشل ٹیلی گرام میں شامل ہوں"
  },
  "Join our official channel for premium updates.": {
    BN: "প্রিমিয়াম আপডেটের জন্য আমাদের অফিসিয়াল চ্যানেলে যুক্ত হন।",
    EN: "Join our official channel for premium updates.",
    HI: "प्रीमियम अपडेट के लिए हमारे आधिकारिक चैनल से जुड़ें।",
    AR: "انضم إلى قناتنا الرسمية للحصول على تحديثات مميزة.",
    UR: "پریمیم اپڈیٹس کے لیے ہمارے آفیشل چینل میں شامل ہوں۔"
  },
  "Click Join": {
    BN: "যুক্ত হতে ক্লিক করুন",
    EN: "Click Join",
    HI: "जॉइन पर क्लिक करें",
    AR: "اضغط على انضمام",
    UR: "شامل ہونے پر کلک کریں"
  },
  "Take Screenshot": {
    BN: "স্ক্রিনশট নিন",
    EN: "Take Screenshot",
    HI: "स्क्रीनशॉट लें",
    AR: "خذ لقطة شاشة",
    UR: "اسکرین شاٹ لیں"
  },
  "Upload Proof": {
    BN: "প্রমাণ আপলোড করুন",
    EN: "Upload Proof",
    HI: "प्रमाण अपलोड करें",
    AR: "تحميل الإثبات",
    UR: "ثبوت اپلوڈ کریں"
  },
  "Watch & Earn": {
    BN: "ভিডিও দেখে আয় করুন",
    EN: "Watch & Earn",
    HI: "देखें और कमाएं",
    AR: "شاهد واربح",
    UR: "دیکھیں اور کمائیں"
  },
  "Watch 2 minutes": {
    BN: "২ মিনিট দেখুন",
    EN: "Watch 2 minutes",
    HI: "2 मिनट देखें",
    AR: "شاهد لمدة دقيقتين",
    UR: "2 منٹ دیکھیں"
  },
  "Like video": {
    BN: "ভিডিও লাইক করুন",
    EN: "Like video",
    HI: "वीडियो लाइक करें",
    AR: "أعجب بالفيديو",
    UR: "ویڈیو لائک کریں"
  },
  "Upload proof": {
    BN: "প্রমাণ আপলোড করুন",
    EN: "Upload proof",
    HI: "प्रमाण अपलोड करें",
    AR: "تحميل الإثبات",
    UR: "ثبوت اپلوڈ کریں"
  },
  "Active": {
    BN: "সক্রিয়",
    EN: "Active",
    HI: "सक्रिय",
    AR: "نشط",
    UR: "سرگرم"
  },
  "Price": {
    BN: "মূল্য",
    EN: "Price",
    HI: "कीमत",
    AR: "السعر",
    UR: "قیمت"
  },
  "Reward": {
    BN: "পুরস্কার",
    EN: "Reward",
    HI: "पुरस्कार",
    AR: "المكافأة",
    UR: "انعام"
  },
  "Submit Details": {
    BN: "তথ্য জমা দিন",
    EN: "Submit Details",
    HI: "विवरण जमा करें",
    AR: "إرسال التفاصيل",
    UR: "تفصیلات جمع کروائیں"
  },
  "Purchase": {
    BN: "ক্রয়",
    EN: "Purchase",
    HI: "खरीदें",
    AR: "شراء",
    UR: "خریداری"
  },
  "Available": {
    BN: "উপলব্ধ",
    EN: "Available",
    HI: "उपलब्ध",
    AR: "متاح",
    UR: "دستیاب"
  },
  "Sold": {
    BN: "বিক্রি হয়ে গেছে",
    EN: "Sold",
    HI: "बिक चुका है",
    AR: "مباع",
    UR: "فروخت شدہ"
  },
  "Upgrade Now": {
    BN: "এখনই আপগ্রেড করুন",
    EN: "Upgrade Now",
    HI: "अभी अपग्रेड करें",
    AR: "الترقية الآن",
    UR: "ابھی اپ گریڈ کریں"
  },
  "Total Bonus": {
    BN: "মোট বোনাস",
    EN: "Total Bonus",
    HI: "कुल बोनस",
    AR: "إجمالي المكافأة",
    UR: "کل بونس"
  },
  "Refer Code": {
    BN: "রেফার কোড",
    EN: "Refer Code",
    HI: "रेफरल कोड",
    AR: "كود الإحالة",
    UR: "ریفرل کوڈ"
  },
  "Copy Code": {
    BN: "কোড কপি করুন",
    EN: "Copy Code",
    HI: "कोड कॉपी करें",
    AR: "نسخ الكود",
    UR: "کوڈ کاپی کریں"
  },
  "Referral Link": {
    BN: "রেফারেল লিংক",
    EN: "Referral Link",
    HI: "रेफरल लिंक",
    AR: "رابط الإحالة",
    UR: "ریفرل لنک"
  },
  "Copy Link": {
    BN: "লিংক কপি করুন",
    EN: "Copy Link",
    HI: "लिंक कॉपी करें",
    AR: "نسخ الرابط",
    UR: "لنک کاپی کریں"
  },
  "Official Telegram": {
    BN: "অফিসিয়াল টেলিগ্রাম",
    EN: "Official Telegram",
    HI: "आधिकारिक टेलीग्राम",
    AR: "التلغرام الرسمي",
    UR: "آفیشل ٹیلی گرام"
  },
  "Facebook Group": {
    BN: "ফেসবুক গ্রুপ",
    EN: "Facebook Group",
    HI: "फेसबुक ग्रुप",
    AR: "مجموعة الفيسبوك",
    UR: "فیس بک گروپ"
  },
  "Live Alerts": {
    BN: "লাইভ নোটিফিকেশন",
    EN: "Live Alerts",
    HI: "लाइव अलर्ट",
    AR: "تنبيهات مباشرة",
    UR: "لائیو الرٹس"
  },
  "No new alerts": {
    BN: "নতুন কোনো এলার্ট নেই",
    EN: "No new alerts",
    HI: "कोई नया अलर्ट नहीं",
    AR: "لا توجد تنبيهات جديدة",
    UR: "کوئی نیا الرٹ نہیں"
  },
  "Close History": {
    BN: "বন্ধ করুন",
    EN: "Close History",
    HI: "इतिहास बंद करें",
    AR: "إغلاق السجل",
    UR: "تاریخ بند کریں"
  },
  "Leaderboard": {
    BN: "লিডারবোর্ড",
    EN: "Leaderboard",
    HI: "लीडरबोर्ड",
    AR: "لوحة الصدارة",
    UR: "لیڈر بورڈ"
  },
  "Weekly": {
    BN: "সাপ্তাহিক",
    EN: "Weekly",
    HI: "साप्ताहिक",
    AR: "أسبوعي",
    UR: "ہفتہ وار"
  },
  "All Time": {
    BN: "সর্বকালের",
    EN: "All Time",
    HI: "सर्वकालिक",
    AR: "كل الأوقات",
    UR: "ہر وقت"
  },
  "Rank": {
    BN: "র‍্যাংক",
    EN: "Rank",
    HI: "रैंक",
    AR: "المرتبة",
    UR: "رینک"
  },
  "User": {
    BN: "ইউজার",
    EN: "User",
    HI: "उपयोगकर्ता",
    AR: "المستخدم",
    UR: "صارف"
  },
  "Earned": {
    BN: "উপার্জিত",
    EN: "Earned",
    HI: "कमाई",
    AR: "الأرباح",
    UR: "کمایا"
  },
  "Switch Language": {
    BN: "ভাষা পরিবর্তন করুন",
    EN: "Switch Language",
    HI: "भाषा बदलें",
    AR: "تغيير اللغة",
    UR: "زبان تبدیل کریں"
  },
  "Select Country": {
    BN: "দেশ নির্বাচন করুন",
    EN: "Select Country",
    HI: "देश चुनें",
    AR: "اختر الدولة",
    UR: "ملک منتخب کریں"
  }
};

// Global translation function that maps exact dictionary lookup,
// and falls back to dynamic word replacement for unknown strings
export const translate = (text: string | null | undefined, lang: LanguageCode): string => {
  if (!text) return '';
  const trimmed = text.trim();
  
  // Try exact dictionary match
  if (DICTIONARY[trimmed]?.[lang]) {
    return DICTIONARY[trimmed][lang];
  }
  
  // Try matching inside dictionary
  for (const [key, translations] of Object.entries(DICTIONARY)) {
    if (trimmed.toLowerCase() === key.toLowerCase() && translations[lang]) {
      return translations[lang];
    }
  }

  // Dynamic regex replacements for common prefixes/suffixes
  let result = trimmed;

  if (lang === 'HI') {
    result = result
      .replace(/Join/g, 'जुड़ें')
      .replace(/Telegram/g, 'टेलीग्राम')
      .replace(/Official/g, 'आधिकारिक')
      .replace(/Watch/g, 'देखें')
      .replace(/Earn/g, 'कमाएं')
      .replace(/YouTube/g, 'यूट्यूब')
      .replace(/Tutorial/g, 'ट्यूटोरियल')
      .replace(/Like/g, 'लाइक करें')
      .replace(/Video/g, 'वीडियो')
      .replace(/Channel/g, 'चैनल')
      .replace(/Upload/g, 'अपलोड करें')
      .replace(/Proof/g, 'प्रमाण')
      .replace(/Screenshots/g, 'स्क्रीनशॉट')
      .replace(/Instructions/g, 'निर्देश')
      .replace(/Verify/g, 'सत्यापित करें')
      .replace(/Membership/g, 'सदस्यता')
      .replace(/Option/g, 'विकल्प')
      .replace(/Withdraw/g, 'निकासी')
      .replace(/All/g, 'सभी')
      .replace(/Completed/g, 'पूर्ण')
      .replace(/Daily/g, 'दैनिक')
      .replace(/Unlimited/g, 'असीमित')
      .replace(/Support/g, 'सहायता')
      .replace(/bKash/g, 'बिकाश')
      .replace(/Nagad/g, 'नगद')
      .replace(/Account/g, 'खाता')
      .replace(/Verification/g, 'सत्यापन')
      .replace(/Success/g, 'सफल');
  } else if (lang === 'AR') {
    result = result
      .replace(/Join/g, 'انضم إلى')
      .replace(/Telegram/g, 'تلغرام')
      .replace(/Official/g, 'الرسمي')
      .replace(/Watch/g, 'شاهد')
      .replace(/Earn/g, 'اربح')
      .replace(/YouTube/g, 'يوتيوب')
      .replace(/Tutorial/g, 'درس تعليمي')
      .replace(/Like/g, 'أعجب بـ')
      .replace(/Video/g, 'فيديو')
      .replace(/Channel/g, 'قناة')
      .replace(/Upload/g, 'تحميل')
      .replace(/Proof/g, 'إثبات')
      .replace(/Screenshots/g, 'لقطات الشاشة')
      .replace(/Instructions/g, 'تعليمات')
      .replace(/Verify/g, 'تحقق')
      .replace(/Membership/g, 'عضوية')
      .replace(/Option/g, 'خيار')
      .replace(/Withdraw/g, 'سحب')
      .replace(/All/g, 'الكل')
      .replace(/Completed/g, 'مكتمل')
      .replace(/Daily/g, 'يومياً')
      .replace(/Unlimited/g, 'غير محدود')
      .replace(/Support/g, 'الدعم')
      .replace(/Account/g, 'حساب')
      .replace(/Verification/g, 'التحقق')
      .replace(/Success/g, 'نجاح');
  } else if (lang === 'UR') {
    result = result
      .replace(/Join/g, 'شامل ہوں')
      .replace(/Telegram/g, 'ٹیلی گرام')
      .replace(/Official/g, 'آفیشل')
      .replace(/Watch/g, 'دیکھیں')
      .replace(/Earn/g, 'کمائیں')
      .replace(/YouTube/g, 'یوٹیوب')
      .replace(/Tutorial/g, 'ٹیوٹوریل')
      .replace(/Like/g, 'لائک کریں')
      .replace(/Video/g, 'ویڈیو')
      .replace(/Channel/g, 'چینل')
      .replace(/Upload/g, 'اپلوڈ کریں')
      .replace(/Proof/g, 'ثبوت')
      .replace(/Screenshots/g, 'اسکرین شاٹس')
      .replace(/Instructions/g, 'ہدایات')
      .replace(/Verify/g, 'تصدیق کریں')
      .replace(/Membership/g, 'ممبرشپ')
      .replace(/Option/g, 'آپشن')
      .replace(/Withdraw/g, 'رقم نکالیں')
      .replace(/All/g, 'تمام')
      .replace(/Completed/g, 'مکمل')
      .replace(/Daily/g, 'روزانہ')
      .replace(/Unlimited/g, 'لامحدود')
      .replace(/Support/g, 'سپورٹ')
      .replace(/Account/g, 'اکاؤنٹ')
      .replace(/Verification/g, 'تصدیق')
      .replace(/Success/g, 'کامیابی');
  } else if (lang === 'BN') {
    // Basic fallback dynamic replacements for BN
    result = result
      .replace(/Join/g, 'যুক্ত হোন')
      .replace(/Telegram/g, 'টেলিগ্রাম')
      .replace(/Official/g, 'অফিসিয়াল')
      .replace(/Watch/g, 'দেখুন')
      .replace(/Earn/g, 'আয় করুন')
      .replace(/YouTube/g, 'ইউটিউব')
      .replace(/Like/g, 'লাইক দিন')
      .replace(/Video/g, 'ভিডিও')
      .replace(/Channel/g, 'চ্যানেল')
      .replace(/Upload/g, 'আপলোড করুন')
      .replace(/Proof/g, 'প্রমাণ')
      .replace(/Screenshots/g, 'স্ক্রিনশট')
      .replace(/Instructions/g, 'নির্দেশাবলী')
      .replace(/Verify/g, 'ভেরিফাই')
      .replace(/Membership/g, 'মেম্বারশিপ')
      .replace(/Withdraw/g, 'উইথড্র')
      .replace(/All/g, 'সব')
      .replace(/Completed/g, 'সম্পন্ন')
      .replace(/Daily/g, 'দৈনিক');
  }

  // Remove BDT symbols or convert them to general words if translating
  if (lang !== 'BN') {
    result = result.replace(/৳/g, '');
  }

  return result;
};

// Conversion helper
export const convertCurrency = (bdtValue: number, countryCode: string) => {
  const country = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];
  const mainVal = bdtValue * country.rateToBDT;
  const usdVal = bdtValue * 0.0085; // 1 BDT = ~0.0085 USD
  
  return {
    mainVal,
    usdVal,
    symbol: country.currencySymbol,
    currencyCode: country.currency
  };
};

interface LocalizedRewardProps {
  bdtAmount: number;
  countryCode: string;
  className?: string;
  isReward?: boolean; // if true, prepends '+' or similar if needed
  textClassName?: string;
  usdClassName?: string;
}

export const LocalizedReward: React.FC<LocalizedRewardProps> = ({
  bdtAmount,
  countryCode,
  className = "flex flex-col items-center",
  textClassName = "font-black text-white text-lg leading-none",
  usdClassName = "text-[10px] font-bold text-slate-400 mt-1"
}) => {
  const { mainVal, usdVal, symbol } = convertCurrency(bdtAmount, countryCode);
  const formattedMain = `${symbol}${mainVal.toFixed(2)}`;
  const formattedUsd = `$${usdVal.toFixed(2)}`;

  // If country is BD, we just show standard ৳ value and NO dollar underneath (since user says "যখন তারা বাংলাদেশ বাদে অন্য কোনো country Select করবে তখন তাদের... নিচে dollar দেখাবে")
  if (countryCode === 'BD') {
    return (
      <div className={className}>
        <span className={textClassName}>৳{bdtAmount.toFixed(0)}</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <span className={textClassName}>{formattedMain}</span>
      <span className={usdClassName}>{formattedUsd}</span>
    </div>
  );
};
