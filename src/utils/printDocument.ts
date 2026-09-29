// Utilitaire d'impression A4 universel compatible navigateur standard et iframe (AI Studio / WebView)

export function printHtmlDocument(title: string, filename: string, bodyHtml: string, onDone?: (msg: string) => void) {
  const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 28px;
      font-size: 12px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }
    .brand-blue { color: #003366; }
    .brand-orange { color: #FF6600; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: #fff7ed;
      color: #ea580c;
      border: 1px solid #fdba74;
      border-radius: 6px;
      font-weight: 800;
      font-size: 11px;
      text-transform: uppercase;
    }
    .card {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 16px;
      background: #f8fafc;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      margin-bottom: 12px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      text-align: left;
      font-size: 11px;
    }
    th {
      background: #f1f5f9;
      font-weight: 800;
      text-transform: uppercase;
      color: #334155;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      font-size: 10px;
      color: #64748b;
      text-align: center;
    }
    .no-print-bar {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .print-btn {
      background: #FF6600;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 12px;
    }
    @media print {
      body { padding: 0; }
      .no-print-bar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <span><strong>${title}</strong> — Prêt pour impression A4 ou enregistrement PDF</span>
    <button class="print-btn" onclick="window.print()">🖨️ Lancer l'impression / Enregistrer en PDF</button>
  </div>
  ${bodyHtml}
  <div class="footer">
    ZONE ÉQUIPEMENTS — Km 4, Boulevard du Centenaire, Dakar, Sénégal • Tél / WhatsApp : +221 76 653 83 84 • Email : zoneequipements@gmail.com
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        try { window.focus(); window.print(); } catch (e) {}
      }, 250);
    };
  </script>
</body>
</html>`;

  let printedViaIframe = false;

  // 1. Tenter l'impression directe via une iframe cachée dans le DOM
  try {
    const existingFrame = document.getElementById('ze-print-iframe');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'ze-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc && iframe.contentWindow) {
      doc.open();
      doc.write(fullHtml);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          // Ignored if sandboxed
        }
      }, 200);
      printedViaIframe = true;
    }
  } catch {
    // Fallback below
  }

  // 2. Si l'application tourne dans une iframe sandboxée (où window.print() est bloqué par le navigateur),
  // déclencher également le téléchargement direct de la fiche A4 prête à imprimer
  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  if (isInIframe || !printedViaIframe) {
    try {
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      if (onDone) {
        onDone(`Document "${title}" généré et téléchargé (ouvrez-le pour imprimer ou enregistrer en PDF).`);
      }
      return;
    } catch {
      // ignore
    }
  }

  if (onDone) {
    onDone(`Impression du document "${title}" lancée.`);
  }
}

// Détecte et extrait automatiquement un lien de paiement (Alibaba Trade Assurance, 1688, Stripe, PayPal, etc.) depuis n'importe quel texte collé
export function extractSupplierPaymentLink(rawText: string): {
  url: string | null;
  platformLabel: string;
} {
  if (!rawText || typeof rawText !== 'string') {
    return { url: null, platformLabel: 'Lien Paiement' };
  }
  const trimmed = rawText.trim();
  const urlMatch = trimmed.match(/https?:\/\/[^\s"'<>]+/i);
  const extractedUrl = urlMatch ? urlMatch[0].replace(/[.,;!?)]+$/, '') : (trimmed.startsWith('www.') ? `https://${trimmed}` : null);

  if (!extractedUrl) {
    return { url: null, platformLabel: 'Lien Paiement' };
  }

  const lower = extractedUrl.toLowerCase();
  let platformLabel = 'Lien de Règlement Fournisseur';
  if (lower.includes('alibaba.com') || lower.includes('alicdn')) {
    platformLabel = 'Alibaba Trade Assurance';
  } else if (lower.includes('1688.com')) {
    platformLabel = '1688 Pay';
  } else if (lower.includes('aliexpress.')) {
    platformLabel = 'AliExpress Business';
  } else if (lower.includes('stripe.com') || lower.includes('buy.stripe')) {
    platformLabel = 'Stripe Secure Link';
  } else if (lower.includes('paypal.')) {
    platformLabel = 'PayPal Invoice';
  } else if (lower.includes('wise.com')) {
    platformLabel = 'Wise Business';
  }

  return { url: extractedUrl, platformLabel };
}
