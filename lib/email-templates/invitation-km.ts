type InvitationEmailParams = {
  clientName: string;
  invitationUrl: string;
};

export function buildInvitationEmailKm(params: InvitationEmailParams): {
  subject: string;
  html: string;
} {
  const { clientName, invitationUrl } = params;

  return {
    subject: "អញ្ជើញចូលគ្រប់គ្រងផលបត្រ Valgate របស់អ្នក",
    html: `<!DOCTYPE html>
<html lang="km">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
          <tr>
            <td style="text-align:right;direction:rtl;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Valgate</p>
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#0f172a;line-height:1.4;">ផលបត្ររបស់អ្នកត្រៀមរួចរាល់</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#334155;">
                សួស្តី ${escapeHtml(clientName)} អ្នកគ្រប់គ្រងអចលនទ្រព្យរបស់អ្នកបានបង្កើតផលបត្រសម្រាប់អ្នកនៅលើ Valgate។
                សូមទទួលយកការអញ្ជើញខាងក្រោមដើម្បីមើល និងគ្រប់គ្រងអចលនទ្រព្យរបស់អ្នក។
              </p>
              <a href="${escapeHtml(invitationUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">
                ទទួលយកការអញ្ជើញ
              </a>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                ប្រសិនបើប៊ូតុងមិនដំណើរការ សូមចម្លងតំណភ្ជាប់នេះទៅក្នុងកម្មវិធីរុករករបស់អ្នក:<br>
                <a href="${escapeHtml(invitationUrl)}" style="color:#2563eb;word-break:break-all;">${escapeHtml(invitationUrl)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
