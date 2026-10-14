import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Server-side proxy plugin for Laya hosted decision API.
 * Keeps LAYA_API_KEY strictly on the server; never exposed to browser bundles.
 */
function layaApiProxy(): Plugin {
  return {
    name: "laya-api-proxy",
    configureServer(server) {
      server.middlewares.use("/api/laya/triage", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method Not Allowed" }));
          return;
        }

        // Server-side env load without leaking to client
        if (typeof process.loadEnvFile === "function") {
          try {
            process.loadEnvFile();
          } catch {}
        }

        const apiKey = process.env.LAYA_API_KEY;
        if (!apiKey) {
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              success: false,
              error: {
                code: "missing_api_key",
                message: "LAYA_API_KEY is not configured on the server",
              },
            }),
          );
          return;
        }

        let bodyStr = "";
        req.on("data", (chunk) => {
          bodyStr += chunk;
        });

        req.on("end", async () => {
          try {
            const body = JSON.parse(bodyStr || "{}");
            const message = String(body.message || "").trim();
            const baseUrl = (process.env.LAYA_BASE_URL || "https://api.laya.studio").replace(/\/+$/, "");
            const model = process.env.LAYA_MODEL || "laya";

            const payload = {
              model,
              state: message,
              questions: {
                issue_type: {
                  type: "choice",
                  instructions: "What is the primary support issue type described in this message?",
                  criteria: {
                    template_rejection: "WhatsApp template rejected by Meta due to policy, formatting, or category mismatch",
                    billing_refund: "Billing queries, payment issues, refund requests, invoice questions",
                    security_identity_access: "OTP, password reset, account ownership, credentials, admin access, hacking",
                    message_delivery: "WhatsApp messages failing to deliver, stuck in queue, or delivery timeout",
                    number_waba_setup: "Phone number registration, WABA account setup, display name verification",
                    chatbot_flow: "Chatbot logic, automated quick replies, or interactive flow builder issues",
                    integration_webhook: "Webhook failures, API delivery errors, event subscriptions, retries",
                    human_requested: "Customer explicitly asking to speak to a human, live agent, or support team",
                    state_conflict_or_stale: "Status in dashboard conflicts with live WhatsApp state or action history",
                    ambiguous_or_missing_context: "Vague, incomplete, or unclassifiable message lacking context",
                  },
                },
                urgency: {
                  type: "choice",
                  instructions: "What is the urgency level of this customer request?",
                  criteria: {
                    low: "Non-urgent question or routine inquiry",
                    medium: "Standard template issue affecting upcoming campaign",
                    high: "Active marketing campaign blocked or live business disruption",
                    critical: "Security compromise, credential exposure, financial loss, or account takeover",
                  },
                },
                needs_human: {
                  type: "noul",
                  instructions: "Does this request require human support handling per safety policy?",
                },
              },
            };

            const apiRes = await fetch(`${baseUrl}/v1/systemone`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify(payload),
            });

            const data = await apiRes.json();
            res.statusCode = apiRes.status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
          } catch (err: unknown) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: {
                  code: "proxy_error",
                  message: (err as Error)?.message || "Proxy request failed",
                },
              }),
            );
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), layaApiProxy()],
  ssr: { external: ["node:sqlite"] },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
