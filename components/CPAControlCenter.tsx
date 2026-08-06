import React, { useState, useEffect } from "react";
import { 
  Globe, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  RefreshCw, 
  Activity, 
  Edit, 
  Trash2, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  ShieldCheck, 
  Building2, 
  Zap, 
  BarChart3, 
  Award,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Calendar
} from "lucide-react";
import { CPANetwork, CPAConversion, CPATransaction, Task, User } from "../types";
import { getApiUrl } from "../src/utils/apiConfig";
import { compressImage } from "../utils/imageCompressor";

interface CPAControlCenterProps {
  cpaNetworks: CPANetwork[];
  setCpaNetworks?: React.Dispatch<React.SetStateAction<CPANetwork[]>>;
  cpaConversions: CPAConversion[];
  setCpaConversions?: React.Dispatch<React.SetStateAction<CPAConversion[]>>;
  cpaTransactions: CPATransaction[];
  setCpaTransactions?: React.Dispatch<React.SetStateAction<CPATransaction[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  users: User[];
  notify: (msg: string) => void;
  currentUser?: User;
}

export const CPAControlCenter: React.FC<CPAControlCenterProps> = ({
  cpaNetworks = [],
  setCpaNetworks = (_val?: any) => {},
  cpaConversions = [],
  setCpaConversions = (_val?: any) => {},
  cpaTransactions = [],
  setCpaTransactions = (_val?: any) => {},
  tasks = [],
  setTasks = () => {},
  users = [],
  notify,
  currentUser
}) => {
  const [subTab, setSubTab] = useState<"dashboard" | "networks" | "approvals" | "analytics" | "transactions">("dashboard");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<CPANetwork | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingNetworkId, setTestingNetworkId] = useState<string | null>(null);
  const [networkTestResults, setNetworkTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [loading, setLoading] = useState(false);

  // Form State for Add/Edit Network
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    logoUrl: "",
    status: "Active" as "Active" | "Inactive",
    postbackUrl: "",
    apiKey: "",
    secretKey: "",
    offerApiUrl: "",
    currency: "USD",
    autoApprove: false,
    description: ""
  });

  // Approvals filtering - activeNetworkId defaults to first active network or all
  const [activeNetworkId, setActiveNetworkId] = useState<string>("all");
  const [approvalSearchQuery, setApprovalSearchQuery] = useState("");
  const [rejectionModal, setRejectionModal] = useState<{ conversionId: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const selectedNetworkFilter = activeNetworkId;
  const setSelectedNetworkFilter = setActiveNetworkId;

  // Performance Timeframe & Analytics Filtering States
  const [perfTimeframe, setPerfTimeframe] = useState<"daily" | "weekly" | "monthly" | "custom">("monthly");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [perfNetworkFilter, setPerfNetworkFilter] = useState<string>("all");

  // Analytics state fetched from server
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Fetch CPA Analytics
  const fetchAnalytics = async () => {
    try {
      const res = await fetch(getApiUrl("/api/cpa/analytics"));
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAnalyticsData(data.analytics);
        }
      }
    } catch (err) {
      console.error("[CPA Analytics Fetch Error]:", err);
    }
  };

  // Fetch conversions & networks on mount
  useEffect(() => {
    fetchAnalytics();
  }, [cpaConversions, cpaNetworks]);

  // Handle open modal for new network
  const handleOpenAddModal = () => {
    setEditingNetwork(null);
    setTestResult(null);
    setFormData({
      id: "",
      name: "",
      logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
      status: "Active",
      postbackUrl: `/api/cpa/postback?network=custom&subid={subid}&offer_id={offer_id}&payout={payout}`,
      apiKey: "",
      secretKey: "",
      offerApiUrl: "",
      currency: "USD",
      autoApprove: false,
      description: ""
    });
    setShowAddModal(true);
  };

  // Handle edit network
  const handleOpenEditModal = (network: CPANetwork) => {
    setEditingNetwork(network);
    setTestResult(null);
    setFormData({
      id: network.id,
      name: network.name,
      logoUrl: network.logoUrl || "",
      status: network.status,
      postbackUrl: network.postbackUrl || `/api/cpa/postback?network=${network.id}&subid={subid}&offer_id={offer_id}&payout={payout}`,
      apiKey: network.apiKey || "",
      secretKey: network.secretKey || "",
      offerApiUrl: network.offerApiUrl || "",
      currency: network.currency || "USD",
      autoApprove: !!network.autoApprove,
      description: network.description || ""
    });
    setShowAddModal(true);
  };

  // Update postback URL automatically when name changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    const netId = editingNetwork ? editingNetwork.id : newName.toLowerCase().replace(/[^a-z0-9]/g, "");
    setFormData(prev => ({
      ...prev,
      name: newName,
      postbackUrl: prev.postbackUrl.includes("/api/cpa/postback")
        ? `/api/cpa/postback?network=${netId || "custom"}&subid={subid}&offer_id={offer_id}&payout={payout}`
        : prev.postbackUrl
    }));
  };

  // Handle image upload compression
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressed = await compressImage(file, 200, 0.8);
        setFormData(prev => ({ ...prev, logoUrl: compressed }));
        notify("Network logo uploaded successfully!");
      } catch (err) {
        notify("Image upload failed, using default icon");
      }
    }
  };

  // Test Connection for modal form
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch(getApiUrl("/api/cpa/test-connection"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          networkId: formData.id,
          networkName: formData.name,
          postbackUrl: formData.postbackUrl,
          offerApiUrl: formData.offerApiUrl,
          apiKey: formData.apiKey
        })
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        notify(data.message);
      } else {
        notify(data.message);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: "❌ Connection Test Error: " + err.message });
    } finally {
      setTestingConnection(false);
    }
  };

  // Test Connection for a specific CPA Network card or directory item
  const handleTestNetworkConnection = async (network: CPANetwork) => {
    setTestingNetworkId(network.id);
    try {
      const res = await fetch(getApiUrl("/api/cpa/test-connection"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          networkId: network.id,
          networkName: network.name,
          postbackUrl: network.postbackUrl || `/api/cpa/postback?network=${network.id}&subid={subid}&offer_id={offer_id}&payout={payout}`,
          offerApiUrl: network.offerApiUrl,
          apiKey: network.apiKey
        })
      });
      const data = await res.json();
      const resObj = { success: !!data.success, message: data.message || "Test ping completed" };
      setNetworkTestResults(prev => ({
        ...prev,
        [network.id]: resObj
      }));
      notify(data.message || `${network.name} connection test completed`);
    } catch (err: any) {
      const errMsg = "❌ Ping test error: " + (err?.message || "Network request failed");
      setNetworkTestResults(prev => ({
        ...prev,
        [network.id]: { success: false, message: errMsg }
      }));
      notify(errMsg);
    } finally {
      setTestingNetworkId(null);
    }
  };

  // Save CPA Network
  const handleSaveNetwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      notify("Please enter Network Name");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/cpa/networks"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setCpaNetworks(data.networks);
        notify(data.message || "CPA Network saved successfully!");
        setShowAddModal(false);
      } else {
        notify(data.error || "Failed to save network");
      }
    } catch (err: any) {
      notify("Error saving network: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete CPA Network
  const handleDeleteNetwork = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete CPA Network "${name}"?`)) return;

    try {
      const res = await fetch(getApiUrl(`/api/cpa/networks/${id}`), { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setCpaNetworks(data.networks);
        notify(`CPA Network "${name}" deleted.`);
      } else {
        notify(data.error || "Failed to delete network");
      }
    } catch (err: any) {
      notify("Error deleting network: " + err.message);
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    notify("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Conversion Action (Approve / Reject)
  const handleConversionAction = async (conversionId: string, action: "approve" | "reject", reason?: string) => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/cpa/conversions/action"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversionId,
          action,
          rejectionReason: reason,
          processedByName: currentUser?.name || "Admin",
          processedById: currentUser?.id || "admin"
        })
      });
      const data = await res.json();
      if (data.success) {
        setCpaConversions(data.conversions);
        if (data.transactions) setCpaTransactions(data.transactions);
        notify(data.message);
        setRejectionModal(null);
        setRejectionReason("");
      } else {
        notify(data.error || "Action failed");
      }
    } catch (err: any) {
      notify("Action failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Dashboard Stats calculation
  const totalNetworks = cpaNetworks.length;
  const activeNetworks = cpaNetworks.filter(n => n.status === "Active").length;
  const inactiveNetworks = cpaNetworks.filter(n => n.status === "Inactive").length;

  const todayStr = new Date().toISOString().split("T")[0];
  const todayConversions = cpaConversions.filter(c => (c.conversionTime || "").startsWith(todayStr)).length;
  const todayRevenue = cpaConversions
    .filter(c => (c.conversionTime || "").startsWith(todayStr) && c.status === "approved")
    .reduce((sum, c) => sum + (Number(c.revenue) || Number(c.reward) || 0), 0);

  const pendingApprovals = cpaConversions.filter(c => c.status === "pending").length;
  const approvedRewards = cpaConversions.filter(c => c.status === "approved").length;
  const rejectedRewards = cpaConversions.filter(c => c.status === "rejected").length;
  const autoApprovedRewards = cpaConversions.filter(c => c.status === "approved" && c.autoApproved).length;
  const manualApprovedRewards = cpaConversions.filter(c => c.status === "approved" && !c.autoApproved).length;

  // Active Networks list for dynamic tab mapping
  const activeCpaNetworks = cpaNetworks.filter(n => n.status === "Active" || (n.status && n.status.toLowerCase() === "active"));

  // Default activeNetworkId to the first active network ID if uninitialized or null
  useEffect(() => {
    if (activeCpaNetworks.length > 0 && (!activeNetworkId || activeNetworkId === "null" || activeNetworkId === "undefined")) {
      setActiveNetworkId(activeCpaNetworks[0].id);
    }
  }, [cpaNetworks]);

  // Normalized CPA Conversions mapping every conversion with cpaNetworkId
  const normalizedCpaConversions = cpaConversions.map(c => {
    let netId = c.cpaNetworkId || c.networkId || "";
    const matchedNet = cpaNetworks.find(n => 
      n.id.toLowerCase().trim() === netId.toLowerCase().trim() ||
      n.name.toLowerCase().trim() === (c.networkName || "").toLowerCase().trim()
    );
    const finalNetId = matchedNet ? matchedNet.id : (netId || "cpalead");
    return {
      ...c,
      cpaNetworkId: finalNetId,
      cpaNetworkName: matchedNet ? matchedNet.name : (c.networkName || finalNetId)
    };
  });

  // Helper to check if a conversion matches a target network ID/Name or filter ID
  const isConversionMatchingNetwork = (c: CPAConversion, filterKey: string) => {
    if (!filterKey || filterKey === "all") return true;

    const filterLower = filterKey.toLowerCase().trim();
    const convNetId = (c.cpaNetworkId || c.networkId || "").toLowerCase().trim();
    const convNetName = (c.cpaNetworkName || c.networkName || "").toLowerCase().trim();

    if (convNetId === filterLower || convNetName === filterLower) return true;

    const matchedNet = cpaNetworks.find(n => 
      n.id.toLowerCase().trim() === filterLower || 
      n.name.toLowerCase().trim() === filterLower
    );

    if (matchedNet) {
      const targetId = matchedNet.id.toLowerCase().trim();
      const targetName = matchedNet.name.toLowerCase().trim();
      if (
        convNetId === targetId || 
        convNetId === targetName || 
        convNetName === targetId || 
        convNetName === targetName
      ) {
        return true;
      }
    }

    return false;
  };

  // Selected Network Specific Summary Counts
  const selectedNetworkObj = selectedNetworkFilter === "all" 
    ? null 
    : cpaNetworks.find(n => n.id.toLowerCase().trim() === selectedNetworkFilter.toLowerCase().trim() || n.name.toLowerCase().trim() === selectedNetworkFilter.toLowerCase().trim());

  const selectedNetworkDisplayName = selectedNetworkFilter === "all"
    ? "All Networks"
    : (selectedNetworkObj ? selectedNetworkObj.name : selectedNetworkFilter);

  const selectedNetworkConversions = normalizedCpaConversions.filter(c => c.cpaNetworkId === activeNetworkId || isConversionMatchingNetwork(c, activeNetworkId));

  const networkPendingCount = selectedNetworkConversions.filter(c => c.status === "pending" || !c.status).length;
  const networkApprovedCount = selectedNetworkConversions.filter(c => c.status === "approved").length;
  const networkRejectedCount = selectedNetworkConversions.filter(c => c.status === "rejected").length;
  const networkTotalCount = selectedNetworkConversions.length;

  // Filtered Conversions using c.cpaNetworkId === activeNetworkId
  const filteredConversions = normalizedCpaConversions.filter(c => {
    const matchesNet = activeNetworkId === "all" || 
                       c.cpaNetworkId === activeNetworkId || 
                       isConversionMatchingNetwork(c, activeNetworkId);
    const q = approvalSearchQuery.toLowerCase().trim();
    const matchesQuery = !q || 
      (c.userId || "").toLowerCase().includes(q) || 
      (c.userName || "").toLowerCase().includes(q) || 
      (c.offerId || "").toLowerCase().includes(q) || 
      (c.networkName || "").toLowerCase().includes(q) ||
      (c.networkId || "").toLowerCase().includes(q) ||
      (c.cpaNetworkId || "").toLowerCase().includes(q) ||
      (c.taskTitle || "").toLowerCase().includes(q);
    return matchesNet && matchesQuery;
  });

  // PERFORMANCE ANALYTICS TIMEFRAME CALCULATIONS
  const timeframeConversions = normalizedCpaConversions.filter((c) => {
    if (perfNetworkFilter !== "all") {
      const netId = (c.cpaNetworkId || c.networkId || "").toLowerCase().trim();
      const netName = (c.cpaNetworkName || c.networkName || "").toLowerCase().trim();
      const target = perfNetworkFilter.toLowerCase().trim();
      if (netId !== target && netName !== target) return false;
    }

    if (!c.conversionTime) return true;
    const cDate = new Date(c.conversionTime);
    if (isNaN(cDate.getTime())) return true;

    const now = new Date();

    if (perfTimeframe === "daily") {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return cDate >= startOfToday;
    } else if (perfTimeframe === "weekly") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      return cDate >= sevenDaysAgo;
    } else if (perfTimeframe === "monthly") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      return cDate >= thirtyDaysAgo;
    } else if (perfTimeframe === "custom") {
      if (customStartDate) {
        const start = new Date(customStartDate + "T00:00:00");
        if (cDate < start) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate + "T23:59:59");
        if (cDate > end) return false;
      }
      return true;
    }
    return true;
  });

  const totalPerfConversions = timeframeConversions.length;
  const approvedPerfConversions = timeframeConversions.filter(c => c.status === "approved");
  const pendingPerfConversions = timeframeConversions.filter(c => c.status === "pending" || !c.status);
  const rejectedPerfConversions = timeframeConversions.filter(c => c.status === "rejected");

  const perfTotalRevenueUSD = approvedPerfConversions.reduce((sum, c) => sum + (Number(c.revenue) || Number(c.reward) || 0), 0);
  const perfTotalUserPayoutBDT = approvedPerfConversions.reduce((sum, c) => sum + (Number(c.reward) || 0), 0);
  const perfApprovalRate = totalPerfConversions > 0 
    ? ((approvedPerfConversions.length / totalPerfConversions) * 100).toFixed(1) 
    : "0.0";

  // Network Performance Map for selected timeframe
  const netPerfMap: { [netId: string]: { id: string; name: string; revenue: number; conversions: number; approved: number; pending: number; rejected: number; payout: number } } = {};
  
  cpaNetworks.forEach(net => {
    netPerfMap[net.id] = {
      id: net.id,
      name: net.name,
      revenue: 0,
      conversions: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      payout: 0
    };
  });

  timeframeConversions.forEach(c => {
    const netId = c.cpaNetworkId || "cpalead";
    const netName = c.cpaNetworkName || c.networkName || netId;
    if (!netPerfMap[netId]) {
      netPerfMap[netId] = { id: netId, name: netName, revenue: 0, conversions: 0, approved: 0, pending: 0, rejected: 0, payout: 0 };
    }
    netPerfMap[netId].conversions += 1;
    if (c.status === "approved") {
      netPerfMap[netId].approved += 1;
      netPerfMap[netId].revenue += (Number(c.revenue) || Number(c.reward) || 0);
      netPerfMap[netId].payout += (Number(c.reward) || 0);
    } else if (c.status === "rejected") {
      netPerfMap[netId].rejected += 1;
    } else {
      netPerfMap[netId].pending += 1;
    }
  });

  let bestNetworkInPeriod = "None";
  let maxNetRev = -1;
  Object.values(netPerfMap).forEach(net => {
    if (net.revenue > maxNetRev && net.conversions > 0) {
      maxNetRev = net.revenue;
      bestNetworkInPeriod = net.name;
    }
  });

  // Offer Performance Map for selected timeframe
  const offerPerfMap: { [offerId: string]: { title: string; count: number; revenue: number } } = {};
  timeframeConversions.forEach(c => {
    if (c.status === "approved") {
      const offKey = c.offerId || "default";
      const title = c.taskTitle || `Offer #${offKey}`;
      if (!offerPerfMap[offKey]) offerPerfMap[offKey] = { title, count: 0, revenue: 0 };
      offerPerfMap[offKey].count += 1;
      offerPerfMap[offKey].revenue += (Number(c.revenue) || Number(c.reward) || 0);
    }
  });

  let mostCompletedOfferInPeriod = "None";
  let maxOfferCount = 0;
  Object.values(offerPerfMap).forEach(off => {
    if (off.count > maxOfferCount) {
      maxOfferCount = off.count;
      mostCompletedOfferInPeriod = `${off.title} (${off.count} completions)`;
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* CPA SUBTAB NAVIGATION */}
      <div className="bg-white dark:bg-slate-900/80 p-2 rounded-2xl border border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab("dashboard")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              subTab === "dashboard"
                ? "bg-[#10b981] text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <BarChart3 size={15} />
            CPA Dashboard
          </button>
          <button
            type="button"
            onClick={() => setSubTab("networks")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              subTab === "networks"
                ? "bg-[#10b981] text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Globe size={15} />
            Networks ({totalNetworks})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("approvals")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer relative ${
              subTab === "approvals"
                ? "bg-[#10b981] text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Clock size={15} />
            Pending Approvals
            {pendingApprovals > 0 && (
              <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full animate-pulse ml-1">
                {pendingApprovals}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSubTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              subTab === "analytics"
                ? "bg-[#10b981] text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <TrendingUp size={15} />
            CPA Analytics
          </button>
          <button
            type="button"
            onClick={() => setSubTab("transactions")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              subTab === "transactions"
                ? "bg-[#10b981] text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <DollarSign size={15} />
            Transactions
          </button>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={16} />
          + Add CPA Network
        </button>
      </div>

      {/* SUBTAB CONTENT 1: DASHBOARD */}
      {subTab === "dashboard" && (
        <div className="space-y-8">
          {/* TOP SUMMARY METRICS GRID */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard
              title="Total CPA Networks"
              value={totalNetworks}
              icon={<Globe className="text-emerald-500" size={20} />}
              subtitle={`${activeNetworks} Active`}
              color="emerald"
            />
            <MetricCard
              title="Active Networks"
              value={activeNetworks}
              icon={<CheckCircle2 className="text-green-500" size={20} />}
              subtitle={`${inactiveNetworks} Inactive`}
              color="green"
            />
            <MetricCard
              title="Today's Conversions"
              value={todayConversions}
              icon={<Zap className="text-cyan-500" size={20} />}
              subtitle="Leads generated today"
              color="cyan"
            />
            <MetricCard
              title="Today's Revenue"
              value={`$${todayRevenue.toFixed(2)}`}
              icon={<DollarSign className="text-amber-500" size={20} />}
              subtitle="CPA earnings"
              color="amber"
            />
            <MetricCard
              title="Pending Approvals"
              value={pendingApprovals}
              icon={<Clock className="text-amber-400 animate-pulse" size={20} />}
              subtitle="Requires review"
              color="amber"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard
              title="Approved Rewards"
              value={approvedRewards}
              icon={<CheckCircle2 className="text-emerald-500" size={20} />}
              subtitle="User credited"
              color="emerald"
            />
            <MetricCard
              title="Rejected Rewards"
              value={rejectedRewards}
              icon={<XCircle className="text-red-500" size={20} />}
              subtitle="Disapproved"
              color="red"
            />
            <MetricCard
              title="Auto Approved"
              value={autoApprovedRewards}
              icon={<Zap className="text-purple-500" size={20} />}
              subtitle="Instant postback"
              color="purple"
            />
            <MetricCard
              title="Manual Approved"
              value={manualApprovedRewards}
              icon={<Award className="text-blue-500" size={20} />}
              subtitle="Admin reviewed"
              color="blue"
            />
            <MetricCard
              title="Active CPA Tasks"
              value={tasks.filter(t => t.taskSource === "CPA Task" && t.isActive).length}
              icon={<Building2 className="text-emerald-400" size={20} />}
              subtitle="Published offers"
              color="emerald"
            />
          </div>

          {/* QUICK NETWORKS OVERVIEW LIST */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Globe className="text-emerald-500" size={20} />
                  Connected CPA Networks
                </h3>
                <p className="text-xs text-slate-400 mt-1">Manage global affiliate networks and postback routes</p>
              </div>
              <button
                type="button"
                onClick={() => setSubTab("networks")}
                className="text-xs font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
              >
                View All <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {cpaNetworks.map((net) => (
                <div 
                  key={net.id}
                  className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-4 hover:border-emerald-500/30 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={net.logoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80"} 
                        alt={net.name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-white/10"
                      />
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">{net.name}</h4>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">{net.currency} • {net.autoApprove ? "⚡ Auto Approve" : "📋 Manual Review"}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                      net.status === "Active" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    }`}>
                      {net.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-white/5">
                    <p className="text-[11px] truncate"><strong className="text-slate-300">Postback:</strong> {net.postbackUrl}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => handleCopy(net.postbackUrl, net.id)}
                      className="text-[11px] font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === net.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      Copy Postback URL
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={testingNetworkId === net.id}
                        onClick={() => handleTestNetworkConnection(net)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                        title="Simulate postback URL ping test"
                      >
                        <Zap size={12} className={testingNetworkId === net.id ? "animate-spin text-amber-400" : "text-emerald-400"} />
                        {testingNetworkId === net.id ? "Testing..." : "Test Ping"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(net)}
                        className="text-xs font-bold text-emerald-500 hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  {networkTestResults[net.id] && (
                    <div className={`p-2 rounded-lg text-[10px] font-bold border ${
                      networkTestResults[net.id].success 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {networkTestResults[net.id].message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT 2: NETWORKS MANAGEMENT */}
      {subTab === "networks" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Globe className="text-emerald-500" size={20} />
                CPA Networks Directory
              </h3>
              <p className="text-xs text-slate-400 mt-1">Configure Postback URLs, API Keys, and approval rules for all CPA networks</p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={16} />
              + Add CPA Network
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase text-[10px] font-black text-slate-400 tracking-wider">
                <tr>
                  <th className="p-4 rounded-l-xl">Network Name</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Approval Mode</th>
                  <th className="p-4">Postback URL</th>
                  <th className="p-4">API Endpoint</th>
                  <th className="p-4 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {cpaNetworks.map((net) => (
                  <tr key={net.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <img 
                          src={net.logoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80"} 
                          alt={net.name} 
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-white/10"
                        />
                        <div>
                          <p className="text-sm font-black">{net.name}</p>
                          <span className="text-[10px] text-slate-400 uppercase">{net.currency}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        net.status === "Active" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                      }`}>
                        {net.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        net.autoApprove ? "bg-purple-500/10 text-purple-400" : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {net.autoApprove ? "⚡ Auto Approve (ON)" : "📋 Manual Approve (OFF)"}
                      </span>
                    </td>
                    <td className="p-4 max-w-xs font-mono text-[11px] text-slate-400 truncate">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{net.postbackUrl}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(net.postbackUrl, net.id)}
                          className="text-slate-400 hover:text-emerald-400 shrink-0 cursor-pointer"
                          title="Copy Postback URL"
                        >
                          {copiedId === net.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>
                    <td className="p-4 max-w-xs font-mono text-[11px] text-slate-400 truncate">
                      {net.offerApiUrl || "—"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={testingNetworkId === net.id}
                          onClick={() => handleTestNetworkConnection(net)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                          title="Simulate postback URL ping test"
                        >
                          <Zap size={13} className={testingNetworkId === net.id ? "animate-spin text-amber-400" : "text-emerald-400"} />
                          {testingNetworkId === net.id ? "Testing..." : "Test Connection"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(net)}
                          className="p-2 text-slate-400 hover:text-emerald-400 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                          title="Edit Network"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNetwork(net.id, net.name)}
                          className="p-2 text-slate-400 hover:text-red-400 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Delete Network"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {networkTestResults[net.id] && (
                        <div className={`mt-1.5 text-[10px] font-bold text-right ${
                          networkTestResults[net.id].success ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {networkTestResults[net.id].message}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT 3: PENDING APPROVALS */}
      {subTab === "approvals" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Clock className="text-amber-500" size={20} />
                CPA Pending Approvals & Conversion Review
              </h3>
              <p className="text-xs text-slate-400 mt-1">Review incoming conversions from postback parameters and credit rewards to user wallets</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Dynamic Network Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setActiveNetworkId("all")}
                  className={`px-3 py-1.5 text-[11px] font-extrabold uppercase rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeNetworkId === "all" ? "bg-emerald-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>All Networks</span>
                  <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-full ${
                    activeNetworkId === "all" ? "bg-slate-950 text-emerald-400" : "bg-slate-700 text-slate-300"
                  }`}>
                    {normalizedCpaConversions.length}
                  </span>
                </button>
                {activeCpaNetworks.map((net) => {
                  const networkCount = normalizedCpaConversions.filter(c => c.cpaNetworkId === net.id || isConversionMatchingNetwork(c, net.id)).length;
                  const isSelected = activeNetworkId.toLowerCase().trim() === net.id.toLowerCase().trim() || 
                                     activeNetworkId.toLowerCase().trim() === net.name.toLowerCase().trim();

                  return (
                    <button
                      key={net.id}
                      type="button"
                      onClick={() => setActiveNetworkId(net.id)}
                      className={`px-3 py-1.5 text-[11px] font-extrabold uppercase rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        isSelected ? "bg-emerald-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <span>{net.name}</span>
                      {networkCount > 0 && (
                        <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-full ${
                          isSelected ? "bg-slate-950 text-emerald-400" : "bg-slate-700 text-slate-300"
                        }`}>
                          {networkCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Search input */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={approvalSearchQuery}
                  onChange={(e) => setApprovalSearchQuery(e.target.value)}
                  placeholder="Search user, offer, network..."
                  className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Selected Network Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Filtered Network</p>
                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5 truncate max-w-[150px]">{selectedNetworkDisplayName}</p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-xl text-xs font-black">
                {networkTotalCount} Total
              </span>
            </div>

            <div className="bg-amber-500/10 dark:bg-amber-500/15 p-4 rounded-2xl border border-amber-500/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending</p>
                <p className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{networkPendingCount}</p>
              </div>
              <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-500">
                <Clock size={18} />
              </div>
            </div>

            <div className="bg-emerald-500/10 dark:bg-emerald-500/15 p-4 rounded-2xl border border-emerald-500/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Approved</p>
                <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{networkApprovedCount}</p>
              </div>
              <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-500">
                <CheckCircle2 size={18} />
              </div>
            </div>

            <div className="bg-rose-500/10 dark:bg-rose-500/15 p-4 rounded-2xl border border-rose-500/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Rejected</p>
                <p className="text-xl font-black text-rose-700 dark:text-rose-300 mt-0.5">{networkRejectedCount}</p>
              </div>
              <div className="p-2.5 bg-rose-500/20 rounded-xl text-rose-500">
                <XCircle size={18} />
              </div>
            </div>
          </div>

          {/* Conversions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase text-[10px] font-black text-slate-400 tracking-wider">
                <tr>
                  <th className="p-4 rounded-l-xl">Status</th>
                  <th className="p-4">User ID / Name</th>
                  <th className="p-4">CPA Network</th>
                  <th className="p-4">Offer ID / Title</th>
                  <th className="p-4">User Reward</th>
                  <th className="p-4">Network Revenue</th>
                  <th className="p-4">Auto Approved?</th>
                  <th className="p-4">Time</th>
                  <th className="p-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredConversions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                      No CPA conversions found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredConversions.map((conv) => (
                    <tr key={conv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        {conv.status === "pending" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/10 text-amber-400 flex items-center gap-1 w-max">
                            🟡 Pending
                          </span>
                        )}
                        {conv.status === "approved" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 flex items-center gap-1 w-max">
                            🟢 Approved
                          </span>
                        )}
                        {conv.status === "rejected" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-500/10 text-red-400 flex items-center gap-1 w-max">
                            🔴 Rejected
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        <p className="text-xs font-black">{conv.userName || conv.userId}</p>
                        <span className="text-[10px] text-slate-400 font-mono">{conv.userId}</span>
                      </td>
                      <td className="p-4 font-bold text-slate-300">
                        {conv.networkName}
                      </td>
                      <td className="p-4 text-slate-300 font-mono">
                        <p className="font-bold">{conv.taskTitle || `Offer #${conv.offerId}`}</p>
                        <span className="text-[10px] text-slate-400">ID: {conv.offerId}</span>
                      </td>
                      <td className="p-4 font-black text-emerald-400">
                        ৳{conv.reward}
                      </td>
                      <td className="p-4 font-black text-amber-400">
                        ${conv.revenue}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded ${
                          conv.autoApproved ? "bg-purple-500/10 text-purple-400" : "bg-slate-700 text-slate-300"
                        }`}>
                          {conv.autoApproved ? "⚡ Auto" : "📋 Manual"}
                        </span>
                      </td>
                      <td className="p-4 text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(conv.conversionTime).toLocaleString()}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {conv.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => handleConversionAction(conv.id, "approve")}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] uppercase rounded-lg shadow cursor-pointer active:scale-95 transition-all"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => setRejectionModal({ conversionId: conv.id })}
                              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white font-black text-[10px] uppercase rounded-lg cursor-pointer transition-all"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT 4: CPA ANALYTICS & PERFORMANCE TIMEFRAME */}
      {subTab === "analytics" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <TrendingUp className="text-emerald-500" size={20} />
                CPA Performance Analytics & Reports
              </h3>
              <p className="text-xs text-slate-400 mt-1">Real-time performance analytics filtered by timeframe & network</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Network Filter Dropdown */}
              <select
                value={perfNetworkFilter}
                onChange={(e) => setPerfNetworkFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">🌐 All CPA Networks</option>
                {cpaNetworks.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={fetchAnalytics}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-300 hover:text-emerald-400 transition-all cursor-pointer"
                title="Refresh Analytics"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Timeframe Control Bar (Daily, Weekly, Monthly, Custom) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <Calendar size={16} className="text-emerald-500" />
                Performance Timeframe (সময়সীমা)
              </span>

              {/* Timeframe Buttons */}
              <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-900/80 p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPerfTimeframe("daily")}
                  className={`px-3.5 py-1.5 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${
                    perfTimeframe === "daily"
                      ? "bg-emerald-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  ☀️ Daily (দৈনিক)
                </button>
                <button
                  type="button"
                  onClick={() => setPerfTimeframe("weekly")}
                  className={`px-3.5 py-1.5 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${
                    perfTimeframe === "weekly"
                      ? "bg-emerald-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  📅 Weekly (সাপ্তাহিক)
                </button>
                <button
                  type="button"
                  onClick={() => setPerfTimeframe("monthly")}
                  className={`px-3.5 py-1.5 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${
                    perfTimeframe === "monthly"
                      ? "bg-emerald-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🗓️ Monthly (মাসিক)
                </button>
                <button
                  type="button"
                  onClick={() => setPerfTimeframe("custom")}
                  className={`px-3.5 py-1.5 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${
                    perfTimeframe === "custom"
                      ? "bg-emerald-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  ⚙️ Custom Date (কাস্টম)
                </button>
              </div>
            </div>

            {/* Custom Date Selector inputs when Custom Date is selected */}
            {perfTimeframe === "custom" && (
              <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex flex-wrap items-center gap-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">From Date:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-white/10 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">To Date:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-white/10 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {(customStartDate || customEndDate) && (
                  <button
                    type="button"
                    onClick={() => { setCustomStartDate(""); setCustomEndDate(""); }}
                    className="text-[11px] font-bold text-red-400 hover:underline cursor-pointer"
                  >
                    Clear Dates
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Performance Summary Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Timeframe Revenue</p>
              <p className="text-xl font-black text-emerald-400">${perfTotalRevenueUSD.toFixed(2)}</p>
              <p className="text-[10px] text-slate-500 font-bold">Network earnings</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">User Rewards</p>
              <p className="text-xl font-black text-amber-400">৳{perfTotalUserPayoutBDT.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 font-bold">Paid to users</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Conversions</p>
              <p className="text-xl font-black text-white">{totalPerfConversions}</p>
              <div className="flex items-center gap-2 text-[10px] font-bold mt-1">
                <span className="text-emerald-400">✓ {approvedPerfConversions.length}</span>
                <span className="text-amber-400">⏳ {pendingPerfConversions.length}</span>
                <span className="text-red-400">✕ {rejectedPerfConversions.length}</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Approval Rate</p>
              <p className="text-xl font-black text-purple-400">{perfApprovalRate}%</p>
              <p className="text-[10px] text-slate-500 font-bold">Success ratio</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Top Network</p>
              <p className="text-sm font-black text-white truncate mt-1">{bestNetworkInPeriod}</p>
              <p className="text-[10px] text-slate-500 font-bold">Highest revenue</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Top Offer</p>
              <p className="text-xs font-black text-white truncate mt-1">{mostCompletedOfferInPeriod}</p>
              <p className="text-[10px] text-slate-500 font-bold">Most completed</p>
            </div>
          </div>

          {/* Network Breakdown Table for Selected Timeframe */}
          <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <BarChart3 className="text-emerald-500" size={16} />
              CPA Networks Performance Breakdown ({perfTimeframe.toUpperCase()})
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase text-[10px] font-black text-slate-400 tracking-wider">
                  <tr>
                    <th className="p-3.5 rounded-l-xl">Network Name</th>
                    <th className="p-3.5">Total Conversions</th>
                    <th className="p-3.5">Approved</th>
                    <th className="p-3.5">Pending</th>
                    <th className="p-3.5">Revenue ($)</th>
                    <th className="p-3.5">User Payout (৳)</th>
                    <th className="p-3.5 text-right rounded-r-xl">Approval Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {Object.values(netPerfMap).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                        No CPA Network performance data for selected period.
                      </td>
                    </tr>
                  ) : (
                    Object.values(netPerfMap).map((net) => {
                      const rate = net.conversions > 0 ? ((net.approved / net.conversions) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={net.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            {net.name}
                          </td>
                          <td className="p-3.5 font-bold text-slate-300">{net.conversions}</td>
                          <td className="p-3.5 font-bold text-emerald-400">{net.approved}</td>
                          <td className="p-3.5 font-bold text-amber-400">{net.pending}</td>
                          <td className="p-3.5 font-black text-emerald-400">${net.revenue.toFixed(2)}</td>
                          <td className="p-3.5 font-black text-amber-400">৳{net.payout}</td>
                          <td className="p-3.5 text-right font-bold text-purple-400">{rate}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Conversions Log in Selected Timeframe */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Activity className="text-emerald-500" size={16} />
              Conversions Audit Log in Selected Timeframe ({timeframeConversions.length})
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase text-[10px] font-black text-slate-400 tracking-wider">
                  <tr>
                    <th className="p-3.5 rounded-l-xl">Status</th>
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">CPA Network</th>
                    <th className="p-3.5">Offer Title</th>
                    <th className="p-3.5">User Reward</th>
                    <th className="p-3.5">Revenue</th>
                    <th className="p-3.5 text-right rounded-r-xl">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {timeframeConversions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                        No conversions recorded within this timeframe.
                      </td>
                    </tr>
                  ) : (
                    timeframeConversions.map((conv) => (
                      <tr key={conv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          {conv.status === "pending" && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400">Pending</span>}
                          {conv.status === "approved" && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">Approved</span>}
                          {conv.status === "rejected" && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400">Rejected</span>}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">{conv.userName || conv.userId}</td>
                        <td className="p-3.5 text-slate-300 font-bold">{conv.cpaNetworkName || conv.networkName}</td>
                        <td className="p-3.5 text-slate-300 font-medium">{conv.taskTitle || `Offer #${conv.offerId}`}</td>
                        <td className="p-3.5 font-black text-emerald-400">৳{conv.reward}</td>
                        <td className="p-3.5 font-black text-amber-400">${conv.revenue}</td>
                        <td className="p-3.5 text-right text-[10px] font-mono text-slate-400">
                          {conv.conversionTime ? new Date(conv.conversionTime).toLocaleString() : "N/A"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT 5: TRANSACTIONS */}
      {subTab === "transactions" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <DollarSign className="text-emerald-500" size={20} />
              CPA Financial Transactions Ledger
            </h3>
            <p className="text-xs text-slate-400 mt-1">Audit log of all rewarded conversions and network payout credits</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase text-[10px] font-black text-slate-400 tracking-wider">
                <tr>
                  <th className="p-4 rounded-l-xl">Tx ID</th>
                  <th className="p-4">User Name</th>
                  <th className="p-4">CPA Network</th>
                  <th className="p-4">Offer Title</th>
                  <th className="p-4">User Reward</th>
                  <th className="p-4">Payout Revenue</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right rounded-r-xl">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {cpaTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      No CPA transactions logged yet.
                    </td>
                  </tr>
                ) : (
                  cpaTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono text-[10px] text-slate-400 font-bold">{tx.id}</td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">{tx.userName || tx.userId}</td>
                      <td className="p-4 font-bold text-slate-300">{tx.networkName}</td>
                      <td className="p-4 text-slate-300 font-medium">{tx.offerTitle}</td>
                      <td className="p-4 font-black text-emerald-400">৳{tx.reward}</td>
                      <td className="p-4 font-black text-amber-400">${tx.revenue}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400">
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-4 text-right text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(tx.date).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT CPA NETWORK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl w-full space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Globe className="text-emerald-500" size={20} />
                {editingNetwork ? `Edit CPA Network (${editingNetwork.name})` : "+ Add New CPA Network"}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNetwork} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Network Name */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400">Network Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="e.g. CPAlead, CPAGrip, AdGate"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as "Active" | "Inactive" }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Active">Active (Live)</option>
                    <option value="Inactive">Inactive (Disabled)</option>
                  </select>
                </div>
              </div>

              {/* Logo URL & Image Upload */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-400">Network Logo URL / Upload</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                    placeholder="https://domain.com/logo.png"
                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:border-emerald-500"
                  />
                  <label className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-colors shrink-0">
                    Upload Image
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Postback URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-slate-400">Postback URL (Auto Generated)</label>
                  <span className="text-[10px] text-emerald-400">Place this in CPA Network Postback Settings</span>
                </div>
                <input
                  type="text"
                  required
                  value={formData.postbackUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, postbackUrl: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-emerald-400 font-mono text-xs rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* API Key */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400">API Key (Optional)</label>
                  <input
                    type="text"
                    value={formData.apiKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Network API Key"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Secret Key */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400">Secret Key / Hash (Optional)</label>
                  <input
                    type="text"
                    value={formData.secretKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, secretKey: e.target.value }))}
                    placeholder="Postback verification secret"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Offer API URL */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400">Offer API URL (Optional)</label>
                  <input
                    type="text"
                    value={formData.offerApiUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, offerApiUrl: e.target.value }))}
                    placeholder="https://cpalead.com/campaign_api.php"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Currency & Auto Approve */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-400">Currency</label>
                    <input
                      type="text"
                      value={formData.currency}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                      placeholder="USD"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-400">Auto Approve</label>
                    <select
                      value={formData.autoApprove ? "ON" : "OFF"}
                      onChange={(e) => setFormData(prev => ({ ...prev, autoApprove: e.target.value === "ON" }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="OFF">OFF (Manual Review)</option>
                      <option value="ON">ON (Instant Postback Credit)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-400">Description / Admin Notes</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Notes about network payout rates or rules"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Test Connection Button & Status */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  disabled={testingConnection}
                  onClick={handleTestConnection}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  <RefreshCw size={14} className={testingConnection ? "animate-spin" : ""} />
                  {testingConnection ? "Testing Connection..." : "Test Connection"}
                </button>

                {testResult && (
                  <span className={`text-xs font-bold ${testResult.success ? "text-emerald-400" : "text-red-400"}`}>
                    {testResult.message}
                  </span>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-3 text-slate-400 hover:text-white font-bold text-xs uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  {loading ? "Saving..." : "Save Network"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectionModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={18} />
              Reject CPA Conversion
            </h3>
            <p className="text-xs text-slate-400">Please enter a reason for rejecting this CPA conversion request:</p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Invalid IP, VPN detected, duplicate offer lead"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:border-red-500 resize-none"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectionModal(null)}
                className="px-4 py-2 text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConversionAction(rejectionModal.conversionId, "reject", rejectionReason)}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white font-black text-xs uppercase rounded-xl cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle: string;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, subtitle }) => {
  return (
    <div className="bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{title}</span>
        {icon}
      </div>
      <div>
        <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h4>
        <p className="text-[10px] text-slate-400 font-bold mt-1">{subtitle}</p>
      </div>
    </div>
  );
};

export default CPAControlCenter;
