/**
 * ARIA Sentinel — before_tool_call (exec) + message_received (Telegram «да»).
 * Shared policy with exec-api via /root/aria-core/sentinel.js file store.
 */
export default function register(api) {
  const cfg = api.pluginConfig || {};
  const gateUrl = cfg.gateUrl || "http://127.0.0.1:9192/sentinel/gate";
  const approvePeerUrl = cfg.approvePeerUrl || "http://127.0.0.1:9192/sentinel/approve-peer";

  function channelFromSessionKey(sk) {
    if (!sk || typeof sk !== "string") return "web";
    if (sk.includes("telegram")) return "telegram";
    return "web";
  }

  api.on("before_tool_call", async (event, ctx) => {
    if (event.toolName !== "exec") return;
    const params = event.params || {};
    const cmd = typeof params.command === "string" ? params.command : "";
    if (!cmd.trim()) return;

    const sessionKey = ctx.sessionKey || ctx.sessionId || "anonymous";
    const channel = channelFromSessionKey(sessionKey);

    const body = {
      cmd,
      session_id: sessionKey,
      channel,
      pending_id: params.sentinel_pending_id,
      confirm: params.sentinel_confirm === true
    };

    let data;
    try {
      const res = await fetch(gateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      data = await res.json();
    } catch (e) {
      return {
        block: true,
        blockReason: `[Sentinel] gate unreachable: ${String(e.message || e)}`
      };
    }

    const g = data && data.ok !== false ? data : null;
    if (!g) {
      return { block: true, blockReason: "[Sentinel] invalid gate response" };
    }

    if (g.action === "execute") {
      return {};
    }
    if (g.action === "deny") {
      return { block: true, blockReason: `[Sentinel] ${g.reason || "denied"}` };
    }
    if (g.action === "pending") {
      return {
        block: true,
        blockReason: g.message || `[Sentinel] confirmation required (pending_id=${g.pending_id})`
      };
    }
    return { block: true, blockReason: "[Sentinel] unknown gate action" };
  });

  api.on("message_received", async (event, ctx) => {
    if (ctx.channelId !== "telegram") return;
    const t = (event.content || "").trim().toLowerCase();
    if (!/^(да|yes|y|ok|confirm|подтверждаю)$/.test(t)) return;
    const peer =
      ctx.conversationId ||
      (event.metadata && (event.metadata.to || event.metadata.senderId)) ||
      "";
    try {
      await fetch(approvePeerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peer: String(peer) })
      });
    } catch {
      /* non-fatal */
    }
  });
}
