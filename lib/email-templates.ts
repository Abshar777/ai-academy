/**
 * Shared branded HTML shell for every outbound email (welcome + invoice, see
 * lib/email.ts) — one header/footer, one place to keep them visually
 * consistent, instead of each email hand-rolling its own wrapper markup.
 * Inline styles throughout: email clients don't reliably load <style>
 * blocks or external stylesheets.
 */

import { SITE_URL } from "./site";

const BRAND_LIME = "#d3fb52";
const BRAND_INK = "#171717";

/* The wordmark, served from the site itself — mail clients only load images
   over http(s), never from an attachment or a data URI they can trust. The
   name stays in the alt text and beside the mark, because most clients hold
   images back until the reader allows them, and a header that is blank until
   then reads as spam. */
const LOGO_URL = `${SITE_URL.replace(/\/$/, "")}/brand/delta-wordmark-white.png`;

export function emailLayout({
  preheader,
  bodyHtml,
}: {
  /** Hidden preview text shown next to the subject line in most inboxes. */
  preheader: string;
  bodyHtml: string;
}): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#f4f4f2;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
      ${preheader}
    </span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f2;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="background-color:${BRAND_INK};padding:26px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="vertical-align:middle;padding-right:12px;">
                      <img src="${LOGO_URL}" width="95" height="36" alt="Delta" style="display:block;width:95px;height:36px;border:0;outline:none;" />
                    </td>
                    <td style="vertical-align:middle;border-left:1px solid rgba(255,255,255,0.22);padding-left:12px;">
                      <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background-color:${BRAND_LIME};margin-right:8px;vertical-align:middle;"></span>
                      <span style="color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;vertical-align:middle;">AI Academy</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#171717;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #ececec;color:#8a8a8a;font-size:12px;line-height:1.5;">
                Delta AI Academy &mdash; you're receiving this because you contacted us or enrolled in the programme.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
