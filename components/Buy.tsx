import React, { useState } from 'react';
import { User, SellItem, SellCategory, Transaction, StoreOrder } from '../types';
import { ICONS } from '../constants';
import { LocalizedReward, convertCurrency } from './localization';

interface BuyProps {
  user: User;
  onUpdateUser: (user: User) => void;
  sellItems: SellItem[];
  setSellItems: React.Dispatch<React.SetStateAction<SellItem[]>>;
  sellCategories: SellCategory[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  notify: (msg: string) => void;
  t: (key: any) => string;
  storeOrders: StoreOrder[];
  setStoreOrders: React.Dispatch<React.SetStateAction<StoreOrder[]>>;
  selectedCountryCode?: string;
}

const Buy: React.FC<BuyProps> = ({
  user,
  onUpdateUser,
  sellItems,
  setSellItems,
  sellCategories,
  setTransactions,
  notify,
  t,
  storeOrders,
  setStoreOrders,
  selectedCountryCode = 'BD'
}) => {
  const [activeTab, setActiveTab] = useState<'store' | 'purchases'>('store');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals / forms states
  const [buyingItem, setBuyingItem] = useState<SellItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // SD Form States
  const [showSDForm, setShowSDForm] = useState(false);
  const [sdDetailsInput, setSdDetailsInput] = useState('');
  const [sdLinkInput, setSdLinkInput] = useState('');
  const [sdScreenshotBase64, setSdScreenshotBase64] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Available items for the selected category and search query
  const availableItems = sellItems.filter(item => {
    // Check limit
    const limit = item.purchaseLimit || 0;
    const count = item.purchasedCount || 0;
    const isSoldOut = (limit > 0 && count >= limit) || item.status === 'sold';
    
    if (isSoldOut) return false;
    
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // User's standard purchased items
  const standardPurchasedItems = sellItems.filter(item => item.soldTo === user.id);
  
  // User's custom submitted store orders
  const myStoreOrders = storeOrders.filter(order => order.userId === user.id);

  // Confirm standard or open SD form
  const handleInitiatePurchase = () => {
    if (!buyingItem) return;

    if (user.balance < buyingItem.price) {
      notify("আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই! দয়া করে ডিপোজিট করুন।");
      setBuyingItem(null);
      return;
    }

    if (buyingItem.enableSD) {
      // Show details submission form instead of instant buy
      setShowSDForm(true);
    } else {
      // Normal instant processing
      executeStandardPurchase(buyingItem);
    }
  };

  // Standard Instant Purchase Handler
  const executeStandardPurchase = (item: SellItem) => {
    setIsProcessing(true);
    setTimeout(() => {
      const nextBalance = user.balance - item.price;
      const updatedUser = { ...user, balance: nextBalance };
      onUpdateUser(updatedUser);

      // Save sell items updates
      setSellItems(prev => prev.map(si => {
        if (si.id === item.id) {
          const newCount = (si.purchasedCount || 0) + 1;
          const limit = si.purchaseLimit || 0;
          const isSoldOut = limit > 0 && newCount >= limit;
          return {
            ...si,
            purchasedCount: newCount,
            status: isSoldOut ? 'sold' as const : si.status,
            soldTo: user.id,
            soldDate: new Date().toLocaleDateString()
          };
        }
        return si;
      }));

      // Log transaction
      const newTx: Transaction = {
        id: 'tx_pur_' + Math.random().toString(36).substr(2, 9),
        userId: user.id,
        type: 'Purchase',
        amount: item.price,
        date: new Date().toLocaleString(),
        description: `Purchased Item: ${item.title} (${item.category})`,
        status: 'completed'
      };
      setTransactions(prev => [newTx, ...prev]);

      setIsProcessing(false);
      setBuyingItem(null);
      setActiveTab('purchases');
      notify(`সফলভাবে "${item.title}" কেনা হয়েছে! "My Purchases" থেকে বিবরণ দেখুন।`);
    }, 1500);
  };

  // Custom SD Option Purchase Handler
  const executeSDPurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyingItem) return;

    if (!sdDetailsInput.trim()) {
      notify("দয়া করে আপনার সাবমিট ডিটেইলস/আইডি ডিটেইলস পূরণ করুন।");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      // Charge wallet balance
      const nextBalance = user.balance - buyingItem.price;
      const updatedUser = { ...user, balance: nextBalance };
      onUpdateUser(updatedUser);

      // Create new StoreOrder
      const newOrder: StoreOrder = {
        id: 'order_' + Date.now() + Math.random().toString(36).substr(2, 5),
        itemId: buyingItem.id,
        itemTitle: buyingItem.title,
        itemPrice: buyingItem.price,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        submitDetails: sdDetailsInput,
        submitLink: sdLinkInput.trim() || undefined,
        screenshot: sdScreenshotBase64 || undefined,
        status: 'pending',
        submittedAt: new Date().toLocaleString()
      };

      setStoreOrders(prev => [newOrder, ...prev]);

      // Update product purchased count
      setSellItems(prev => prev.map(si => {
        if (si.id === buyingItem.id) {
          const newCount = (si.purchasedCount || 0) + 1;
          const limit = si.purchaseLimit || 0;
          const isSoldOut = limit > 0 && newCount >= limit;
          return {
            ...si,
            purchasedCount: newCount,
            status: isSoldOut ? 'sold' as const : si.status,
            soldDate: new Date().toLocaleDateString()
          };
        }
        return si;
      }));

      // Append transaction
      const newTx: Transaction = {
        id: 'tx_pur_sd_' + Math.random().toString(36).substr(2, 9),
        userId: user.id,
        type: 'Purchase',
        amount: buyingItem.price,
        date: new Date().toLocaleString(),
        description: `Order Placed (Pending): ${buyingItem.title}`,
        status: 'completed'
      };
      setTransactions(prev => [newTx, ...prev]);

      // Reset SD form
      setSdDetailsInput('');
      setSdLinkInput('');
      setSdScreenshotBase64('');
      setShowSDForm(false);
      setBuyingItem(null);
      setIsProcessing(false);
      setActiveTab('purchases');
      notify("আপনার ডিটেইলস সফলভাবে সাবমিট হয়েছে! এডমিন শীঘ্রই অর্ডারটি সম্পন্ন করবেন।");
    }, 1200);
  };

  // Drag-and-drop screenshot handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      notify("দয়া করে শুধুমাত্র ছবি ফাইল আপলোড করুন!");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setSdScreenshotBase64(reader.result as string);
      notify("স্ক্রিনশট ক্রিয়েট হয়েছে!");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 px-4 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">
          E-Store <span className="text-[#10b981]">Portal</span>
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto font-medium text-sm">
          আপনার ওয়ালেট ব্যালেন্স ব্যবহার করে প্রয়োজনীয় সোশ্যাল ক্যাম্পেইন সার্ভিস, অ্যাকাউন্ট এবং ইউটিউব আইটেম কিনুন।
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 p-1.5 bg-white/5 border border-white/5 rounded-2xl w-fit mx-auto backdrop-blur-md">
        <button 
          onClick={() => setActiveTab('store')} 
          className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'store' ? 'bg-[#10b981] text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
          id="btn-store-browse"
        >
          Browsing Store
        </button>
        <button 
          onClick={() => setActiveTab('purchases')} 
          className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative ${
            activeTab === 'purchases' ? 'bg-[#10b981] text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
          id="btn-store-purchases"
        >
          My Purchases
          {(myStoreOrders.filter(o => o.status === 'pending').length > 0) && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
              {myStoreOrders.filter(o => o.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'store' ? (
        /* Store Browsing Grid */
        <div className="space-y-6">
          {/* Categories scroller & Search bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 border border-white/5 p-6 rounded-[2rem] backdrop-blur-xl">
            {/* Category horizontal scroller */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                  selectedCategory === 'All' 
                    ? 'bg-[#10b981] text-white border-transparent' 
                    : 'bg-white/5 text-slate-300 border-white/5 hover:border-white/10'
                }`}
              >
                All Items
              </button>
              {sellCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                    selectedCategory === cat.name
                      ? 'bg-[#10b981] text-white border-transparent'
                      : 'bg-white/5 text-slate-300 border-white/5 hover:border-white/10'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Keyword Search */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="সার্চ করুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border-2 border-transparent focus:border-[#10b981]/30 rounded-xl py-3 pl-10 pr-4 text-white font-extrabold text-xs outline-none transition-all placeholder:text-slate-700"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600">
                <ICONS.Buy size={14} />
              </div>
            </div>
          </div>

          {/* Store Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableItems.map(item => {
              const limit = item.purchaseLimit || 0;
              const count = item.purchasedCount || 0;
              return (
                <div 
                  key={item.id} 
                  className="bg-white/5 border border-white/5 rounded-[2.5rem] p-7 flex flex-col justify-between transition-all hover:scale-[1.02] hover:border-[#10b981]/30 hover:shadow-2xl hover:shadow-emerald-500/5 group relative overflow-hidden backdrop-blur-2xl"
                >
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none"></div>
                  
                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-emerald-500/10 text-[#10b981] rounded-full w-fit">
                          {item.category}
                        </span>
                        {item.enableSD && (
                          <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md w-fit inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span> SD Option
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <LocalizedReward bdtAmount={item.price} countryCode={selectedCountryCode} className="flex flex-col items-end" textClassName="text-xl font-black italic text-white tracking-tight leading-none" usdClassName="text-[9px] font-bold text-slate-500 mt-1 uppercase" />
                        {limit > 0 && (
                          <p className="text-[8px] font-black text-slate-500 uppercase mt-1">
                            Limit: {count}/{limit}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-2 group-hover:text-[#10b981] transition-colors leading-none leading-tight">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                      Added: {item.createdAt}
                    </span>
                    <button
                      onClick={() => setBuyingItem(item)}
                      className="px-5 py-3 bg-[#10b981] text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/10"
                      id={`btn-buy-${item.id}`}
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              );
            })}

            {availableItems.length === 0 && (
              <div className="col-span-full text-center py-24 border border-dashed border-white/5 rounded-[3rem] opacity-50 bg-white/5">
                <ICONS.Buy size={36} className="mx-auto text-slate-500 mb-4" />
                <h4 className="text-lg font-black uppercase italic text-white tracking-widest">No Products Found</h4>
                <p className="text-xs text-slate-500 font-semibold mt-2">এই ক্যাটাগরিতে বর্তমানে কোনো আইটেম বিক্রির জন্য সচল নেই।</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Purchases & Custom Orders Tab */
        <div className="space-y-8">
          {/* Custom Submitted orders section */}
          {myStoreOrders.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-black uppercase italic text-white tracking-tight leading-none">
                Requested Orders / Details status (<span className="text-indigo-400">ব্যক্তিগত অর্ডারসমূহ</span>)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myStoreOrders.map(order => (
                  <div 
                    key={order.id}
                    className={`bg-slate-900 border ${
                      order.status === 'completed' ? 'border-emerald-500/25 bg-emerald-505/5' : 'border-amber-500/20 bg-amber-500/5'
                    } rounded-[2.5rem] p-6 space-y-4 relative overflow-hidden`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="text-base font-black text-white italic uppercase tracking-tight">{order.itemTitle}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">Submitted: {order.submittedAt}</p>
                      </div>
                      <div className="text-right">
                        <LocalizedReward bdtAmount={order.itemPrice} countryCode={selectedCountryCode} className="flex flex-col items-end" textClassName="text-sm font-black text-white leading-none" usdClassName="text-[8px] font-bold text-slate-500 mt-0.5 uppercase" />
                        <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mt-2 border ${
                          order.status === 'completed' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' 
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/15 animate-pulse'
                        }`}>
                          {order.status === 'completed' ? 'COMPLETED (সম্পন্ন)' : 'PENDING (অপেক্ষা করুন)'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 bg-black/40 p-4 rounded-2xl border border-white/5 text-xs font-semibold">
                      <div>
                        <p className="text-[8px] uppercase font-black text-slate-500 mb-0.5">Details Submitted / ID Details:</p>
                        <p className="text-slate-100 font-mono break-all leading-normal">{order.submitDetails}</p>
                      </div>

                      {order.submitLink && (
                        <div>
                          <p className="text-[8px] uppercase font-black text-slate-500 mb-0.5">Submitted Link:</p>
                          <a href={order.submitLink} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline font-mono break-all inline-flex items-center gap-1">
                            {order.submitLink} <ICONS.Link size={10} />
                          </a>
                        </div>
                      )}

                      {order.screenshot && (
                        <div>
                          <p className="text-[8px] uppercase font-black text-slate-500 mb-1">Uploaded Screenshot:</p>
                          <img 
                            src={order.screenshot} 
                            alt="Order Proof" 
                            className="w-16 h-16 rounded-lg object-cover cursor-zoom-in hover:opacity-80 border border-white/10 transition-opacity" 
                            onClick={() => setLightboxImage(order.screenshot || null)}
                          />
                        </div>
                      )}
                    </div>

                    {order.status === 'completed' && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl space-y-1">
                        <p className="text-[9px] uppercase font-black text-emerald-400 tracking-widest">Admin Delivery Notes / Credentials</p>
                        <p className="text-xs text-white font-mono whitespace-pre-wrap">{sellItems.find(si => si.id === order.itemId)?.details || 'আপনার সার্ভিসটি এডমিন সম্পূর্ণ করেছেন।'}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Standard direct deliveries section */}
          <div className="space-y-4">
            <h3 className="text-lg font-black uppercase italic text-white tracking-tight leading-none pt-2">
              Instant Deliveries (<span className="text-[#10b981]">সরাসরি প্রাপ্ত আইটেমসমূহ</span>)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {standardPurchasedItems.map(item => (
                <div 
                  key={item.id} 
                  className="bg-emerald-500/5 border-2 border-emerald-500/15 rounded-[3rem] p-8 space-y-6 relative overflow-hidden backdrop-blur-3xl shadow-xl shadow-emerald-950/10"
                >
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.04] pointer-events-none"></div>
                  
                  <div className="relative z-10 flex justify-between items-start">
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 bg-[#10b981]/25 text-[#10b981] rounded-full">
                        {item.category}
                      </span>
                      <h3 className="text-xl font-black italic uppercase text-white mt-3 leading-none tracking-tight">{item.title}</h3>
                      <p className="text-[10px] font-medium text-slate-400 mt-2">Purchased At: {item.soldDate}</p>
                    </div>
                    <div className="text-right">
                      <LocalizedReward bdtAmount={item.price} countryCode={selectedCountryCode} className="flex flex-col items-end" textClassName="text-xl font-black text-white italic leading-none" usdClassName="text-[8px] font-bold text-slate-500 mt-0.5 uppercase" />
                      <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full border border-emerald-500/20 inline-block mt-2">
                        Active
                      </span>
                    </div>
                  </div>

                  {/* Secret Delivered credentials / details */}
                  <div className="relative z-10 bg-black/40 border-2 border-dashed border-[#10b981]/20 p-5 rounded-2xl space-y-2">
                    <p className="text-[9px] font-black uppercase text-[#10b981] tracking-widest">Delivered Account Details</p>
                    <p className="text-xs text-slate-200 font-mono select-all bg-black/50 p-3 rounded-xl border border-white/5 break-all leading-relaxed whitespace-pre-wrap">
                      {item.details}
                    </p>
                  </div>
                </div>
              ))}

              {standardPurchasedItems.length === 0 && myStoreOrders.length === 0 && (
                <div className="col-span-full text-center py-24 border border-dashed border-white/5 rounded-[3rem] opacity-50 bg-white/5">
                  <ICONS.Lock size={36} className="mx-auto text-slate-500 mb-4" />
                  <h4 className="text-lg font-black uppercase italic text-white tracking-widest">No Purchases Yet</h4>
                  <p className="text-xs text-slate-500 font-semibold mt-2">আপনার কেনা আইটেমগুলোর বিস্তারিত ও এক্সেস পিন এখানে দেখতে পারবেন।</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION / PAY DIALOG MODAL */}
      {buyingItem && !showSDForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative">
            <button 
              onClick={() => setBuyingItem(null)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
            >
              <ICONS.Close size={20} />
            </button>

            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-500/10 border-2 border-[#10b981]/20 rounded-2xl flex items-center justify-center mx-auto text-[#10b981]">
                  <ICONS.Buy size={24} />
                </div>
                <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter leading-none pt-2">Confirm Purchase</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">আপনি কি এটি কিনতে নিশ্চিত?</p>
              </div>

              <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-slate-400 uppercase tracking-wider">Item Name</span>
                  <span className="font-black text-white italic uppercase">{buyingItem.title}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-slate-400 uppercase tracking-wider">Category</span>
                  <span className="font-black text-[#10b981] uppercase tracking-wider">{buyingItem.category}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-slate-400 uppercase tracking-wider">Price</span>
                  <LocalizedReward bdtAmount={buyingItem.price} countryCode={selectedCountryCode} className="flex flex-row items-center gap-1 font-black text-white italic text-base" textClassName="" usdClassName="text-xs text-slate-400 font-normal" />
                </div>
              </div>

              <div className="bg-emerald-500/5 border-2 border-dashed border-[#10b981]/20 p-4 rounded-xl flex items-center justify-between text-xs font-black">
                <span className="text-slate-400 uppercase tracking-wide">Your Balance:</span>
                <LocalizedReward bdtAmount={user.balance} countryCode={selectedCountryCode} className="inline-flex flex-row items-center gap-1 font-black" textClassName={user.balance >= buyingItem.price ? 'text-[#10b981]' : 'text-red-500'} usdClassName="text-[10px] text-slate-400 font-bold" />
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  onClick={() => setBuyingItem(null)} 
                  className="flex-1 bg-white/5 border border-white/5 text-slate-300 font-black py-4 rounded-xl uppercase text-[10px] tracking-widest hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleInitiatePurchase}
                  className="flex-[2] bg-[#10b981] text-white font-black py-4 rounded-xl shadow-lg uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center"
                >
                  Confirm & Pay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SD OPTION SUBMISSION DIALOG MODAL (ওটা কিনার সাথে সাথে users কে show করবে) */}
      {buyingItem && showSDForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl relative my-8">
            <button 
              onClick={() => { setShowSDForm(false); setBuyingItem(null); }} 
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
            >
              <ICONS.Close size={20} />
            </button>

            <form onSubmit={executeSDPurchaseSubmit} className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-indigo-500/10 border-2 border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
                  <ICONS.Settings size={24} />
                </div>
                <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter leading-none pt-2">Submit Purchase details</h3>
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                  অর্ডারটি সম্পন্ন করতে নিচের তথ্যগুলো নির্ভুলভাবে প্রদান করুন (SD Option Active)
                </p>
                <div className="text-xs bg-slate-800/60 p-2.5 rounded-lg border border-white/5 font-bold text-slate-300 inline-block">
                  Item: <span className="text-[#10b981] font-black">{buyingItem.title}</span> &bull; Cost: <LocalizedReward bdtAmount={buyingItem.price} countryCode={selectedCountryCode} className="inline-flex flex-row items-center gap-1 font-black text-white" textClassName="" usdClassName="text-[10px] text-slate-400 font-bold" />
                </div>
              </div>

              {/* 1. ID Details Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Submit details / ID details <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={3}
                  value={sdDetailsInput}
                  onChange={e => setSdDetailsInput(e.target.value)}
                  placeholder="যেমন: ১০ টা Like এর জন্য YouTube/FB/TikTok এর Channel details, user ID বা একাউন্ট সংক্রান্ত তথ্য দিন..."
                  className="w-full bg-slate-950 border border-white/10 p-4 rounded-xl font-bold text-xs text-white outline-none focus:border-indigo-500 resize-none placeholder:text-slate-700"
                />
              </div>

              {/* 2. Optional Submit Link */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Submit Link <span className="text-slate-600">(Optional / ঐচ্ছিক)</span></label>
                <input
                  type="url"
                  value={sdLinkInput}
                  onChange={e => setSdLinkInput(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... বা https://fb.com/..."
                  className="w-full bg-slate-950 border border-white/10 p-4 rounded-xl font-bold text-xs text-white outline-none focus:border-indigo-500 placeholder:text-slate-700"
                />
              </div>

              {/* 3. Upload Screenshot Drag & Drop */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Upload Screenshots <span className="text-slate-600">(ঐচ্ছিক প্রমাণ)</span></label>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative hover:bg-white/5 ${
                    dragActive ? 'border-indigo-500 bg-indigo-550/10' : 'border-white/10'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                      <ICONS.Upload size={20} />
                    </div>
                    <p className="text-xs font-black text-slate-300">Drag & Drop screenshot image here or click to browse</p>
                    <p className="text-[9px] font-bold text-slate-500">Supports PNG, JPG (স্ক্রিনশট ছবি নির্বাচন করুন)</p>
                  </div>
                </div>

                {sdScreenshotBase64 && (
                  <div className="flex items-center gap-4 bg-slate-950/80 p-3 rounded-xl border border-white/5">
                    <img src={sdScreenshotBase64} alt="Preview" className="w-12 h-12 rounded object-cover border border-white/10" />
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-emerald-400 uppercase">Screenshot Selected!</p>
                      <button 
                        type="button" 
                        onClick={() => setSdScreenshotBase64('')}
                        className="text-[9px] text-red-500 font-black uppercase hover:underline mt-0.5"
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-4 pt-2">
                <button 
                  type="button"
                  onClick={() => { setShowSDForm(false); setBuyingItem(null); }} 
                  className="flex-1 bg-white/5 border border-white/5 text-slate-300 font-black py-4 rounded-xl uppercase text-[10px] tracking-widest hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isProcessing}
                  className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg uppercase text-[10px] tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : "Submit Order Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX FOR SCREENSHOTS */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <button className="absolute top-6 right-6 text-white p-3 rounded-full hover:bg-white/15 transition-colors">
            <ICONS.Close size={24} />
          </button>
          <img src={lightboxImage} alt="Fullscreen View" className="max-w-full max-h-[90vh] object-contain rounded-lg p-4" />
        </div>
      )}
    </div>
  );
};

export default Buy;
