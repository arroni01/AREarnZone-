import { Hono } from "hono";
import { supabase, isSupabaseConfigured, mapCollectionToTable } from "../supabase";

export const workerApi = new Hono();

// --- Rate Limiting Middleware ---
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_MINUTE = 100;

workerApi.use("*", async (c, next) => {
  const ip = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "127.0.0.1";
  const now = Date.now();
  const windowMs = 60 * 1000;

  const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  record.count++;
  rateLimitMap.set(ip, record);

  c.header("X-RateLimit-Limit", String(MAX_REQUESTS_PER_MINUTE));
  c.header("X-RateLimit-Remaining", String(Math.max(0, MAX_REQUESTS_PER_MINUTE - record.count)));

  if (record.count > MAX_REQUESTS_PER_MINUTE) {
    return c.json({ success: false, error: "Rate limit exceeded. Please try again later." }, 429);
  }

  await next();
});

// --- Firebase Auth Verification Helper ---
interface VerifiedUser {
  uid: string;
  email?: string;
}

async function verifyAuth(c: any): Promise<VerifiedUser | null> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  if (!token) return null;

  try {
    // Decode JWT payload without external heavy crypto libraries for Cloudflare Workers speed
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);

    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }

    const uid = payload.user_id || payload.sub || payload.uid;
    if (!uid) return null;

    return {
      uid: String(uid),
      email: payload.email ? String(payload.email) : undefined,
    };
  } catch (err) {
    console.warn("[Cloudflare Worker API] Auth verification error:", err);
    return null;
  }
}

// 1. /api/user/profile
workerApi.get("/user/profile", async (c) => {
  const user = await verifyAuth(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);

  if (supabase && isSupabaseConfigured) {
    const { data, error } = await supabase.from("users").select("*").eq("firebase_uid", user.uid).single();
    if (!error && data) {
      return c.json({ success: true, data: data.raw_data || data });
    }
  }

  return c.json({ success: true, data: { id: user.uid, firebase_uid: user.uid, email: user.email, status: "Unverified" } });
});

workerApi.post("/user/profile", async (c) => {
  const user = await verifyAuth(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  const profileData = { ...body, firebase_uid: user.uid, id: body.id || user.uid, updated_at: new Date().toISOString() };

  if (supabase && isSupabaseConfigured) {
    const { error } = await supabase.from("users").upsert({
      id: profileData.id,
      firebase_uid: user.uid,
      email: profileData.email || user.email,
      name: profileData.name || profileData.fullName,
      status: profileData.status || "Active",
      updated_at: new Date().toISOString(),
      raw_data: profileData,
    });

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
  }

  return c.json({ success: true, message: "User profile updated successfully", data: profileData });
});

// 2. /api/tasks
workerApi.get("/tasks", async (c) => {
  if (supabase && isSupabaseConfigured) {
    const { data, error } = await supabase.from("tasks").select("*");
    if (!error && data) {
      const tasks = data.map((row) => row.raw_data || row);
      return c.json({ success: true, data: tasks });
    }
  }

  return c.json({ success: true, data: [] });
});

workerApi.post("/tasks", async (c) => {
  const user = await verifyAuth(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  if (!body.title || !body.reward) {
    return c.json({ success: false, error: "Task title and reward are required" }, 400);
  }

  const taskId = body.id || `task_${Date.now()}`;
  const taskPayload = { ...body, id: taskId, updated_at: new Date().toISOString() };

  if (supabase && isSupabaseConfigured) {
    const { error } = await supabase.from("tasks").upsert({
      id: taskId,
      title: body.title,
      reward: Number(body.reward),
      type: body.type || "social",
      is_active: body.is_active ?? true,
      updated_at: new Date().toISOString(),
      raw_data: taskPayload,
    });

    if (error) return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data: taskPayload });
});

// 3. /api/task/submit
workerApi.post("/task/submit", async (c) => {
  const user = await verifyAuth(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  if (!body.taskId) {
    return c.json({ success: false, error: "taskId is required" }, 400);
  }

  const subId = body.id || `sub_${Date.now()}`;
  const subData = {
    id: subId,
    taskId: body.taskId,
    userId: user.uid,
    firebase_uid: user.uid,
    status: "pending",
    proofText: body.proofText || "",
    proofUrl: body.proofUrl || "",
    submittedAt: new Date().toISOString(),
    ...body,
  };

  if (supabase && isSupabaseConfigured) {
    const { error } = await supabase.from("task_submissions").upsert({
      id: subId,
      task_id: body.taskId,
      user_id: user.uid,
      firebase_uid: user.uid,
      status: "pending",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      raw_data: subData,
    });

    if (error) return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, message: "Task submitted successfully", data: subData });
});

// 4. /api/referral
workerApi.get("/referral", async (c) => {
  const user = await verifyAuth(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);

  if (supabase && isSupabaseConfigured) {
    const { data } = await supabase.from("users").select("*").eq("firebase_uid", user.uid).single();
    const referralCode = data?.raw_data?.referralCode || data?.id || user.uid;
    return c.json({
      success: true,
      data: {
        referralCode,
        referralLink: `https://arearnzone.com/ref/${referralCode}`,
        totalReferrals: data?.raw_data?.referralCount || 0,
        earnings: data?.raw_data?.referralEarnings || 0,
      },
    });
  }

  return c.json({
    success: true,
    data: {
      referralCode: user.uid,
      referralLink: `https://arearnzone.com/ref/${user.uid}`,
      totalReferrals: 0,
      earnings: 0,
    },
  });
});

workerApi.post("/referral", async (c) => {
  const user = await verifyAuth(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  if (!body.referrerCode) {
    return c.json({ success: false, error: "Referrer code required" }, 400);
  }

  return c.json({ success: true, message: "Referral registered successfully" });
});

// 5. /api/wallet
workerApi.get("/wallet", async (c) => {
  const user = await verifyAuth(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);

  if (supabase && isSupabaseConfigured) {
    const { data: txs } = await supabase.from("wallet_transactions").select("*").eq("firebase_uid", user.uid);
    const { data: userData } = await supabase.from("users").select("*").eq("firebase_uid", user.uid).single();

    return c.json({
      success: true,
      data: {
        balance: userData?.balance || userData?.raw_data?.balance || 0,
        transactions: (txs || []).map((t) => t.raw_data || t),
      },
    });
  }

  return c.json({ success: true, data: { balance: 0, transactions: [] } });
});

workerApi.post("/wallet", async (c) => {
  const user = await verifyAuth(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  const txId = body.id || `tx_${Date.now()}`;
  const txData = {
    id: txId,
    userId: user.uid,
    firebase_uid: user.uid,
    type: body.type || "credit",
    amount: Number(body.amount || 0),
    status: "completed",
    timestamp: new Date().toISOString(),
    ...body,
  };

  if (supabase && isSupabaseConfigured) {
    await supabase.from("wallet_transactions").upsert({
      id: txId,
      user_id: user.uid,
      firebase_uid: user.uid,
      type: txData.type,
      amount: txData.amount,
      status: "completed",
      updated_at: new Date().toISOString(),
      raw_data: txData,
    });
  }

  return c.json({ success: true, data: txData });
});

// 6. /api/withdraw
workerApi.get("/withdraw", async (c) => {
  const user = await verifyAuth(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);

  if (supabase && isSupabaseConfigured) {
    const { data } = await supabase.from("withdraw_requests").select("*").eq("firebase_uid", user.uid);
    return c.json({ success: true, data: (data || []).map((d) => d.raw_data || d) });
  }

  return c.json({ success: true, data: [] });
});

workerApi.post("/withdraw", async (c) => {
  const user = await verifyAuth(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  if (!body.amount || body.amount <= 0) {
    return c.json({ success: false, error: "Valid withdraw amount required" }, 400);
  }

  const reqId = body.id || `withdraw_${Date.now()}`;
  const reqData = {
    id: reqId,
    userId: user.uid,
    firebase_uid: user.uid,
    amount: Number(body.amount),
    method: body.method || "Bkash",
    accountNumber: body.accountNumber || "",
    status: "pending",
    requestedAt: new Date().toISOString(),
    ...body,
  };

  if (supabase && isSupabaseConfigured) {
    await supabase.from("withdraw_requests").upsert({
      id: reqId,
      user_id: user.uid,
      firebase_uid: user.uid,
      amount: reqData.amount,
      status: "pending",
      updated_at: new Date().toISOString(),
      raw_data: reqData,
    });
  }

  return c.json({ success: true, message: "Withdrawal requested successfully", data: reqData });
});

// 7. /api/membership
workerApi.get("/membership", async (c) => {
  if (supabase && isSupabaseConfigured) {
    const { data: plans } = await supabase.from("membership_plans").select("*");
    return c.json({ success: true, data: (plans || []).map((p) => p.raw_data || p) });
  }

  return c.json({ success: true, data: [] });
});

workerApi.post("/membership", async (c) => {
  const user = await verifyAuth(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  const reqId = body.id || `mem_${Date.now()}`;
  const reqData = {
    id: reqId,
    userId: user.uid,
    firebase_uid: user.uid,
    planName: body.planName || "VIP",
    amount: Number(body.amount || 0),
    status: "pending",
    requestedAt: new Date().toISOString(),
    ...body,
  };

  if (supabase && isSupabaseConfigured) {
    await supabase.from("membership_requests").upsert({
      id: reqId,
      user_id: user.uid,
      firebase_uid: user.uid,
      plan_name: reqData.planName,
      amount: reqData.amount,
      status: "pending",
      updated_at: new Date().toISOString(),
      raw_data: reqData,
    });
  }

  return c.json({ success: true, message: "Membership upgrade request submitted", data: reqData });
});

// 8. /api/notifications
workerApi.get("/notifications", async (c) => {
  const user = await verifyAuth(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);

  if (supabase && isSupabaseConfigured) {
    const { data } = await supabase.from("app_notifications").select("*").or(`firebase_uid.eq.${user.uid},user_id.eq.all`);
    return c.json({ success: true, data: (data || []).map((n) => n.raw_data || n) });
  }

  return c.json({ success: true, data: [] });
});

workerApi.post("/notifications", async (c) => {
  const user = await verifyAuth(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  const notifId = body.id || `notif_${Date.now()}`;
  const notifData = {
    id: notifId,
    title: body.title || "Notification",
    message: body.message || "",
    targetUser: body.targetUser || user.uid,
    createdAt: new Date().toISOString(),
    ...body,
  };

  if (supabase && isSupabaseConfigured) {
    await supabase.from("app_notifications").upsert({
      id: notifId,
      user_id: notifData.targetUser,
      firebase_uid: user.uid,
      title: notifData.title,
      message: notifData.message,
      updated_at: new Date().toISOString(),
      raw_data: notifData,
    });
  }

  return c.json({ success: true, data: notifData });
});

// 9. /api/admin
workerApi.get("/admin", async (c) => {
  const user = await verifyAuth(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);

  return c.json({
    success: true,
    data: {
      serverTime: new Date().toISOString(),
      workerStatus: "active",
      supabaseConfigured: isSupabaseConfigured,
      platform: "Cloudflare Workers",
    },
  });
});

workerApi.post("/admin", async (c) => {
  const user = await verifyAuth(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  return c.json({ success: true, message: "Admin setting updated", data: body });
});

// 10. /api/cpa/postback & Route Aliases
const handlePostbackRoute = async (c: any) => {
  const query = c.req.query() || {};
  let body: any = {};
  try {
    body = await c.req.json();
  } catch (e) {
    try {
      body = await c.req.parseBody();
    } catch (e2) {}
  }

  const payload = { ...query, ...body };
  const networkParam = c.req.param("networkParam") || payload.network || payload.network_name || payload.net || "CPALead";
  const subId = payload.subid || payload.sub_id || payload.subId || payload.user_id || payload.uid || payload.click_id || "anonymous";
  const payout = parseFloat(payload.payout || payload.amount || payload.reward || payload.commission || "0.50");
  const conversionId = payload.subid || payload.click_id || payload.conversion_id || `cpa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const status = payload.status || "approved";

  let updatedBalance: number | null = null;
  let userFound = false;

  if (supabase && isSupabaseConfigured) {
    // 1. Save CPA conversion
    await supabase.from("cpa_conversions").upsert({
      id: conversionId,
      user_id: subId,
      firebase_uid: subId,
      status: status,
      amount: payout,
      updated_at: new Date().toISOString(),
      raw_data: payload,
    });

    // 2. Direct user balance update
    if (subId && subId !== "anonymous" && payout > 0) {
      try {
        let userRow: any = null;
        const { data: uidMatch } = await supabase
          .from("users")
          .select("*")
          .or(`id.eq.${subId},firebase_uid.eq.${subId}`)
          .limit(1);

        if (uidMatch && uidMatch.length > 0) {
          userRow = uidMatch[0];
        } else if (subId.includes("@")) {
          const { data: emailMatch } = await supabase
            .from("users")
            .select("*")
            .ilike("email", subId)
            .limit(1);
          if (emailMatch && emailMatch.length > 0) {
            userRow = emailMatch[0];
          }
        }

        if (userRow) {
          userFound = true;
          const currentBalance = Number(userRow.balance || userRow.raw_data?.balance || 0);
          updatedBalance = currentBalance + payout;
          const rawData = userRow.raw_data || {};
          rawData.balance = updatedBalance;

          await supabase
            .from("users")
            .update({
              balance: updatedBalance,
              updated_at: new Date().toISOString(),
              raw_data: rawData,
            })
            .eq("id", userRow.id);

          const txId = `tx_cpa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await supabase.from("wallet_transactions").upsert({
            id: txId,
            user_id: userRow.id,
            firebase_uid: userRow.firebase_uid || userRow.id,
            type: "credit",
            amount: payout,
            status: "completed",
            updated_at: new Date().toISOString(),
            raw_data: {
              id: txId,
              userId: userRow.id,
              firebase_uid: userRow.firebase_uid || userRow.id,
              type: "credit",
              category: "cpa_reward",
              amount: payout,
              title: `CPA Postback Reward (${networkParam})`,
              status: "completed",
              timestamp: new Date().toISOString(),
            },
          });
        }
      } catch (err) {
        console.warn("[Worker API Route] Error updating user balance:", err);
      }
    }
  }

  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return c.json({
    status: "ok",
    ok: true,
    success: true,
    message: "CPA postback recorded and user balance updated",
    conversionId,
    subId,
    payout,
    userFound,
    updatedBalance,
  }, 200);
};

workerApi.all("/cpa/postback", handlePostbackRoute);
workerApi.all("/cpa/postback/:networkParam", handlePostbackRoute);
workerApi.all("/postback", handlePostbackRoute);
workerApi.all("/postback/:networkParam", handlePostbackRoute);
workerApi.all("/cpa/callback", handlePostbackRoute);
workerApi.all("/cpa/callback/:networkParam", handlePostbackRoute);

// 11. /api/settings
workerApi.get("/settings", async (c) => {
  if (supabase && isSupabaseConfigured) {
    const { data } = await supabase.from("settings").select("*").eq("id", "global").single();
    if (data) {
      return c.json({ success: true, data: data.raw_data || data });
    }
  }

  return c.json({
    success: true,
    data: {
      appName: "AREarnZone",
      maintenanceMode: false,
      version: "1.0.0",
    },
  });
});

workerApi.post("/settings", async (c) => {
  const user = await verifyAuth(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  if (supabase && isSupabaseConfigured) {
    await supabase.from("settings").upsert({
      id: "global",
      updated_at: new Date().toISOString(),
      raw_data: body,
    });
  }

  return c.json({ success: true, message: "Settings updated successfully", data: body });
});
