// Utilitaire d'impression A4 et de génération de vrais fichiers PDF (.pdf) via jsPDF
// Compatible navigateur standard et environnement iframe (sans jamais télécharger de fichier .html)

import { jsPDF } from 'jspdf';
import type { Order, ExtendedProduct } from '../services/catalogService';
import { siteSettingsService } from '../services/siteSettingsService';

function sanitizePdfText(input: unknown): string {
  return String(input ?? '')
    .replace(/[\u202F\u00A0]/g, ' ')
    .replace(/[•▪▸►]/g, '-')
    .replace(/[✓✔]/g, 'OK ')
    .replace(/[✕✖]/g, 'X ')
    .replace(/[^\x20-\x7E\xA0-\xFFŒœŸ€]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatAmountPdf(val: number | undefined | null): string {
  const num = Math.round(Number(val) || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Convertit un contenu HTML structuré (Facture, Devis, Bon de Commande PO, Manifeste Fournisseur)
 * en un vrai document PDF A4 professionnel (.pdf) téléchargé directement.
 */
export function downloadHtmlAsPdf(
  title: string,
  filename: string,
  bodyHtml: string,
  onDone?: (msg: string) => void
) {
  try {
    const settings = siteSettingsService.getSettings();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = 16;

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 18) {
        doc.addPage();
        y = 16;
      }
    };

    // En-tête officiel ZONE ÉQUIPEMENTS
    doc.setFillColor(0, 51, 102); // #003366
    doc.rect(0, 0, pageWidth, 26, 'F');
    doc.setFillColor(255, 102, 0); // #FF6600
    doc.rect(0, 26, pageWidth, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(sanitizePdfText(settings.companyName || 'ZONE ÉQUIPEMENTS SÉNÉGAL'), margin, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      sanitizePdfText(
        `${settings.companyAddress || 'Km 4, Boulevard du Centenaire, Dakar, Sénégal'} | Tél: ${settings.companyPhone || '+221 76 653 83 84'} | Email: ${settings.companyEmail || 'zoneequipements@gmail.com'}`
      ),
      margin,
      17
    );
    doc.text(
      sanitizePdfText(
        `RCCM: ${settings.rccm || 'SN-DKR-2024-B-14892'} | NINEA: ${settings.ninea || '008921822'}`
      ),
      margin,
      22
    );

    y = 35;

    // Titre du document
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const titleLines = doc.splitTextToSize(sanitizePdfText(title), contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 6 + 3;

    // Parser le DOM HTML pour extraire les cartes (.card / .box), les tableaux (table) et les blocs de texte
    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(`<div>${bodyHtml}</div>`, 'text/html');
    const root = parsedDoc.body.firstElementChild || parsedDoc.body;

    // 1. Extraire les encadrés d'en-tête / cartes d'information (.card, .box) hors tableaux
    const cards = Array.from(root.querySelectorAll('.card, .box'));
    if (cards.length > 0) {
      cards.forEach((cardEl) => {
        // Si la carte contient un tableau, on traitera ses textes d'en-tête puis son tableau
        const clone = cardEl.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('table').forEach(t => t.remove());
        const cardText = sanitizePdfText(clone.innerText || clone.textContent || '');
        if (cardText) {
          const lines = doc.splitTextToSize(cardText, contentWidth - 8);
          const boxH = lines.length * 4.5 + 6;
          checkPageBreak(boxH + 4);
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'FD');
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.text(lines, margin + 4, y + 5);
          y += boxH + 4;
        }
      });
    }

    // 2. Extraire et dessiner tous les tableaux HTML
    const tables = Array.from(root.querySelectorAll('table'));
    tables.forEach((tableEl) => {
      const headers: string[] = [];
      tableEl.querySelectorAll('thead th, tr:first-child th').forEach((th) => {
        headers.push(sanitizePdfText(th.textContent || ''));
      });

      const bodyRows: string[][] = [];
      const trList = tableEl.querySelectorAll('tbody tr');
      const rowsToIterate = trList.length > 0 ? Array.from(trList) : Array.from(tableEl.querySelectorAll('tr')).slice(headers.length > 0 ? 1 : 0);

      rowsToIterate.forEach((tr) => {
        const rowCells: string[] = [];
        tr.querySelectorAll('td, th').forEach((td) => {
          rowCells.push(sanitizePdfText(td.textContent || ''));
        });
        if (rowCells.some(Boolean)) {
          bodyRows.push(rowCells);
        }
      });

      const colCount = Math.max(headers.length, bodyRows[0]?.length || 1, 1);
      // Attribution intelligente des largeurs de colonnes
      const colWidths: number[] = [];
      if (colCount === 5) {
        colWidths.push(contentWidth * 0.14, contentWidth * 0.40, contentWidth * 0.16, contentWidth * 0.12, contentWidth * 0.18);
      } else if (colCount === 6) {
        colWidths.push(contentWidth * 0.07, contentWidth * 0.37, contentWidth * 0.14, contentWidth * 0.10, contentWidth * 0.16, contentWidth * 0.16);
      } else if (colCount === 7) {
        colWidths.push(contentWidth * 0.25, contentWidth * 0.13, contentWidth * 0.11, contentWidth * 0.21, contentWidth * 0.08, contentWidth * 0.11, contentWidth * 0.11);
      } else {
        for (let i = 0; i < colCount; i++) colWidths.push(contentWidth / colCount);
      }

      // Dessin de l'en-tête du tableau
      if (headers.length > 0) {
        checkPageBreak(10);
        doc.setFillColor(0, 51, 102);
        doc.rect(margin, y, contentWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);

        let curX = margin;
        for (let c = 0; c < colCount; c++) {
          const w = colWidths[c] || contentWidth / colCount;
          const hText = doc.splitTextToSize(headers[c] || '', w - 3)[0] || '';
          doc.text(hText, curX + 1.5, y + 5.2);
          curX += w;
        }
        y += 8;
      }

      // Dessin des lignes du tableau
      bodyRows.forEach((row, rIdx) => {
        let maxLines = 1;
        const wrappedCells: string[][] = [];
        for (let c = 0; c < colCount; c++) {
          const w = colWidths[c] || contentWidth / colCount;
          const cellLines = doc.splitTextToSize(row[c] || '', w - 3);
          wrappedCells.push(cellLines);
          if (cellLines.length > maxLines) maxLines = cellLines.length;
        }

        const rowH = Math.max(7, maxLines * 4.2 + 2.5);
        checkPageBreak(rowH + 2);

        if (rIdx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, contentWidth, rowH, 'F');
        }
        doc.setDrawColor(226, 232, 240);
        doc.rect(margin, y, contentWidth, rowH, 'S');

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        let curX = margin;
        for (let c = 0; c < colCount; c++) {
          const w = colWidths[c] || contentWidth / colCount;
          doc.text(wrappedCells[c], curX + 1.5, y + 4.2);
          curX += w;
        }
        y += rowH;
      });

      y += 5;
    });

    // 3. Extraire les blocs de totaux ou textes restants hors cartes et hors tableaux
    const remainingClone = root.cloneNode(true) as HTMLElement;
    remainingClone.querySelectorAll('table, .card, .box, .no-print-bar, style, script').forEach(el => el.remove());
    const extraBlocks = Array.from(remainingClone.children)
      .map(el => sanitizePdfText(el.textContent || ''))
      .filter(Boolean);

    if (extraBlocks.length > 0) {
      extraBlocks.forEach((blk) => {
        const lines = doc.splitTextToSize(blk, contentWidth - 6);
        const h = lines.length * 4.5 + 4;
        checkPageBreak(h + 2);
        doc.setFillColor(255, 247, 237);
        doc.setDrawColor(253, 186, 116);
        doc.roundedRect(margin, y, contentWidth, h, 1.5, 1.5, 'FD');
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(lines, margin + 3, y + 4.8);
        y += h + 3;
      });
    }

    // Pied de page sur chaque page
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        sanitizePdfText(
          `${settings.companyName || 'ZONE ÉQUIPEMENTS'} — ${settings.companyAddress || 'Km 4, Bd du Centenaire, Dakar'} • Tél: ${settings.companyPhone || '+221 76 653 83 84'}`
        ),
        margin,
        pageHeight - 7.5
      );
      doc.text(`Page ${p} / ${totalPages}`, pageWidth - margin - 18, pageHeight - 7.5);
    }

    const cleanFile = `${filename.replace(/\.(html|pdf|txt)$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'Document_Zone_Equipements'}.pdf`;
    doc.save(cleanFile);

    if (onDone) {
      onDone(`Fichier PDF "${cleanFile}" généré et téléchargé avec succès.`);
    }
  } catch (err) {
    console.error('Erreur génération PDF:', err);
    if (onDone) {
      onDone(`Erreur lors de la génération du PDF.`);
    }
  }
}

/**
 * Génère et télécharge directement une Facture Commerciale ou un Devis Proforma officiel en .PDF
 * à partir d'un objet Order (Back-Office Admin, Espace Client, Panier, Magasin Physique POS).
 */
export function downloadOrderPdf(
  order: Order,
  docType?: 'invoice' | 'quote',
  onDone?: (msg: string) => void
) {
  try {
    const settings = siteSettingsService.getSettings();
    const isQuote = docType ? docType === 'quote' : Boolean(order.isQuote || order.status === 'Devis' || (order.orderNumber || '').startsWith('DEV'));
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    // Bandeau supérieur institutionnel
    doc.setFillColor(0, 51, 102); // #003366
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setFillColor(255, 102, 0); // #FF6600
    doc.rect(0, 30, pageWidth, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(sanitizePdfText(settings.companyName || 'ZONE ÉQUIPEMENTS SÉNÉGAL'), margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Centrale d\'Achat MRO, Sourcing Industriel & Équipements Certifiés', margin, 17.5);
    doc.text(
      sanitizePdfText(
        `${settings.companyAddress || 'Km 4, Boulevard du Centenaire, Dakar, Sénégal'} • Tél: ${settings.companyPhone || '+221 76 653 83 84'}`
      ),
      margin,
      22.5
    );
    doc.text(
      sanitizePdfText(
        `Email: ${settings.companyEmail || 'zoneequipements@gmail.com'} • RCCM: ${settings.rccm || 'SN-DKR-2024-B-14892'} • NINEA: ${settings.ninea || '008921822'}`
      ),
      margin,
      27
    );

    // Badge Facture / Devis à droite
    const docBadgeTitle = isQuote ? 'DEVIS PROFORMA OFFICIEL' : 'FACTURE COMMERCIALE';
    doc.setFillColor(255, 102, 0);
    doc.roundedRect(pageWidth - margin - 64, 7, 64, 9, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(docBadgeTitle, pageWidth - margin - 60, 13);

    doc.setFontSize(11);
    doc.text(sanitizePdfText(`N° ${order.orderNumber}`), pageWidth - margin - 64, 21);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const rawOrder = order as any;
    const dateFormatted = rawOrder.date || (order.createdAt ? new Date(order.createdAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR'));
    doc.text(sanitizePdfText(`Date : ${dateFormatted}`), pageWidth - margin - 64, 26.5);

    let y = 38;

    // Deux encadrés : Client Destinataire (gauche) & Conditions / Logistique (droite)
    const boxW = (contentWidth - 6) / 2;
    const boxH = 32;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, boxW, boxH, 2, 2, 'FD');
    doc.roundedRect(margin + boxW + 6, y, boxW, boxH, 2, 2, 'FD');

    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('CLIENT / DESTINATAIRE :', margin + 4, y + 6);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.text(sanitizePdfText(order.customerCompany || order.customerName || 'Client Professionnel').substring(0, 42), margin + 4, y + 11.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(sanitizePdfText(`Contact : ${order.customerName || '-'}`), margin + 4, y + 16.5);
    doc.text(sanitizePdfText(`Tél : ${order.customerPhone || '-'} | Email : ${order.customerEmail || '-'}`).substring(0, 52), margin + 4, y + 21.5);
    doc.text(sanitizePdfText(`Adresse : ${order.customerAddress || 'Dakar, Sénégal'}`).substring(0, 52), margin + 4, y + 26.5);
    if (order.ninea) {
      doc.text(sanitizePdfText(`NINEA / RCCM : ${order.ninea}`), margin + 4, y + 30.5);
    }

    const rightX = margin + boxW + 10;
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('MODALITÉS & RÈGLEMENT :', rightX, y + 6);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(sanitizePdfText(`Statut dossier : ${order.status || 'En cours'}`), rightX, y + 11.5);
    doc.text(sanitizePdfText(`Statut paiement : ${order.paymentStatus || (isQuote ? 'En attente de validation' : 'Payé')}`), rightX, y + 16.5);
    doc.text(sanitizePdfText(`Mode de règlement : ${order.paymentMethod || 'Virement / Wave / Orange Money'}`), rightX, y + 21.5);
    doc.text(sanitizePdfText(`Suivi / Réf. Transit : ${order.trackingNumber || 'DAP Dakar'}`), rightX, y + 26.5);

    y += boxH + 8;

    // Tableau des articles
    const colWidths = [12, 82, 26, 14, 24, 24]; // Total = 182mm (contentWidth)
    doc.setFillColor(0, 51, 102);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    const headers = ['#', 'Désignation de l\'Équipement & Marque', 'Logistique', 'Qté', 'P.U HT (F)', 'Total HT (F)'];
    let curX = margin;
    headers.forEach((h, i) => {
      doc.text(h, curX + 1.5, y + 5.3);
      curX += colWidths[i];
    });
    y += 8;

    const items = order.items || [];
    items.forEach((item, idx) => {
      const unitPrice = Number(item.unitPriceHT ?? item.priceHT ?? item.price ?? 0);
      const lineTotal = unitPrice * (Number(item.quantity) || 1);
      const shipLabel =
        item.shippingMethod === 'sea'
          ? 'Fret Maritime'
          : item.shippingMethod === 'air'
            ? 'Fret Aérien'
            : 'Stock Local / Direct';
      const designation = `${item.name || 'Équipement'}${item.brand ? ` (${item.brand})` : ''}`;
      const descLines = doc.splitTextToSize(sanitizePdfText(designation), colWidths[1] - 3);
      const rowH = Math.max(7.5, descLines.length * 4.2 + 3);

      if (y + rowH > pageHeight - 50) {
        doc.addPage();
        y = 16;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, rowH, 'S');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      let cellX = margin;
      doc.text(String(idx + 1), cellX + 2, y + 4.8);
      cellX += colWidths[0];

      doc.setFont('helvetica', 'bold');
      doc.text(descLines, cellX + 1.5, y + 4.5);
      cellX += colWidths[1];

      doc.setFont('helvetica', 'normal');
      doc.text(sanitizePdfText(shipLabel), cellX + 1.5, y + 4.8);
      cellX += colWidths[2];

      doc.setFont('helvetica', 'bold');
      doc.text(`x${item.quantity}`, cellX + 2, y + 4.8);
      cellX += colWidths[3];

      doc.setFont('helvetica', 'normal');
      doc.text(formatAmountPdf(unitPrice), cellX + 1.5, y + 4.8);
      cellX += colWidths[4];

      doc.setFont('helvetica', 'bold');
      doc.text(formatAmountPdf(lineTotal), cellX + 1.5, y + 4.8);

      y += rowH;
    });

    // Rendu des prestations de services associées (Main d'œuvre, montage, formation, douane)
    const services = order.services || [];
    if (services.length > 0) {
      services.forEach((srv, sIdx) => {
        const lineTotal = Number(srv.totalHT || (srv.unitPriceHT * srv.quantity));
        const designation = `[PRESTATION] ${srv.name}${srv.description ? ` - ${srv.description}` : ''}`;
        const descLines = doc.splitTextToSize(sanitizePdfText(designation), colWidths[1] - 3);
        const rowH = Math.max(7.5, descLines.length * 4.2 + 3);

        if (y + rowH > pageHeight - 50) {
          doc.addPage();
          y = 16;
        }

        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentWidth, rowH, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(margin, y, contentWidth, rowH, 'S');

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        let cellX = margin;
        doc.text(String(items.length + sIdx + 1), cellX + 2, y + 4.8);
        cellX += colWidths[0];

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 51, 102);
        doc.text(descLines, cellX + 1.5, y + 4.5);
        cellX += colWidths[1];

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text('Service / SYSCOHADA 706', cellX + 1.5, y + 4.8);
        cellX += colWidths[2];

        doc.setFont('helvetica', 'bold');
        doc.text(`x${srv.quantity}`, cellX + 2, y + 4.8);
        cellX += colWidths[3];

        doc.setFont('helvetica', 'normal');
        doc.text(formatAmountPdf(srv.unitPriceHT), cellX + 1.5, y + 4.8);
        cellX += colWidths[4];

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(formatAmountPdf(lineTotal), cellX + 1.5, y + 4.8);

        y += rowH;
      });
    }

    y += 6;

    // Calcul des totaux
    const subtotalHT = Number(order.subtotalHT) || items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
    const freightHT = Number(order.freightTotalHT ?? order.shippingTotal ?? rawOrder.freightCost ?? 0);
    const discountAmt = Number(order.discountAmount ?? 0);
    const totalTTC = Number(order.totalTTC) || subtotalHT + freightHT;
    const vatAmount = Number(order.vatAmount) || Math.max(0, totalTTC - (subtotalHT - discountAmt + freightHT));

    if (y + 48 > pageHeight - 20) {
      doc.addPage();
      y = 18;
    }

    const totalsBoxW = 86;
    const totalsX = pageWidth - margin - totalsBoxW;
    const totalsBoxH = discountAmt > 0 ? 36 : 31;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(totalsX, y, totalsBoxW, totalsBoxH, 2, 2, 'FD');

    let ty = y + 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    doc.text('Sous-total Équipements HT :', totalsX + 3, ty);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatAmountPdf(subtotalHT)} FCFA`, totalsX + totalsBoxW - 3, ty, { align: 'right' });
    ty += 5;

    if (freightHT > 0) {
      doc.setFont('helvetica', 'normal');
      doc.text('Fret & Transit International :', totalsX + 3, ty);
      doc.setFont('helvetica', 'bold');
      doc.text(`${formatAmountPdf(freightHT)} FCFA`, totalsX + totalsBoxW - 3, ty, { align: 'right' });
      ty += 5;
    }

    if (discountAmt > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(5, 150, 105);
      doc.text(`Remise ${rawOrder.promoCode ? `(${rawOrder.promoCode})` : ''} :`, totalsX + 3, ty);
      doc.setFont('helvetica', 'bold');
      doc.text(`-${formatAmountPdf(discountAmt)} FCFA`, totalsX + totalsBoxW - 3, ty, { align: 'right' });
      doc.setTextColor(51, 65, 85);
      ty += 5;
    }

    doc.setFont('helvetica', 'normal');
    doc.text(`TVA (${vatAmount > 0 ? '18%' : 'Exonéré 0%'}) :`, totalsX + 3, ty);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatAmountPdf(vatAmount)} FCFA`, totalsX + totalsBoxW - 3, ty, { align: 'right' });
    ty += 6;

    doc.setDrawColor(203, 213, 225);
    doc.line(totalsX + 3, ty - 3.5, totalsX + totalsBoxW - 3, ty - 3.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(255, 102, 0);
    doc.text('TOTAL GÉNÉRAL TTC :', totalsX + 3, ty + 1);
    doc.text(`${formatAmountPdf(totalTTC)} FCFA`, totalsX + totalsBoxW - 3, ty + 1, { align: 'right' });

    if (order.amountPaid !== undefined && order.amountDue !== undefined && order.amountDue > 0) {
      ty += 6;
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `Payé : ${formatAmountPdf(order.amountPaid)} F | Reste à payer : ${formatAmountPdf(order.amountDue)} F`,
        totalsX + 3,
        ty + 2
      );
    }

    // Signatures
    const sigY = Math.max(y + totalsBoxH + 10, pageHeight - 44);
    if (sigY + 26 < pageHeight - 12) {
      doc.setDrawColor(148, 163, 184);
      doc.roundedRect(margin, sigY, 82, 22, 1.5, 1.5, 'S');
      doc.roundedRect(pageWidth - margin - 82, sigY, 82, 22, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('Bon pour accord Client (Date, Cachet & Signature) :', margin + 3, sigY + 5);
      doc.text(`Cachet & Signature ${sanitizePdfText(settings.companyName || 'ZONE ÉQUIPEMENTS')} :`, pageWidth - margin - 79, sigY + 5);
    }

    // Pied de page
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      sanitizePdfText(
        `${settings.companyName || 'ZONE ÉQUIPEMENTS'} — ${settings.companyAddress || 'Km 4, Bd du Centenaire, Dakar'} • Tél: ${settings.companyPhone || '+221 76 653 83 84'} • Email: ${settings.companyEmail || 'zoneequipements@gmail.com'}`
      ),
      margin,
      pageHeight - 7.5
    );

    const prefix = isQuote ? 'Devis-Proforma' : 'Facture';
    const cleanFileName = `${prefix}-${(order.orderNumber || 'ZE').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    doc.save(cleanFileName);

    if (onDone) {
      onDone(`${isQuote ? 'Devis Proforma' : 'Facture'} "${cleanFileName}" téléchargé(e) en PDF.`);
    }
  } catch (err) {
    console.error('Erreur génération PDF commande:', err);
  }
}

/**
 * Génère et télécharge directement la Fiche Technique Constructeur d'un produit en .PDF (en français)
 */
export function downloadProductDatasheetPdf(
  product: ExtendedProduct,
  onDone?: (msg: string) => void
) {
  try {
    const settings = siteSettingsService.getSettings();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, pageWidth, 26, 'F');
    doc.setFillColor(255, 102, 0);
    doc.rect(0, 26, pageWidth, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(sanitizePdfText(`${settings.companyName || 'ZONE ÉQUIPEMENTS'} — FICHE TECHNIQUE CONSTRUCTEUR`), margin, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      sanitizePdfText(`Catalogue MRO Certifié • Réf: ${product.ref || product.id} • Marque: ${product.brand || 'Constructeur Certifié'}`),
      margin,
      18
    );
    doc.text(
      sanitizePdfText(`${settings.companyAddress || 'Dakar, Sénégal'} • Tél: ${settings.companyPhone || '+221 76 653 83 84'} • ${settings.companyEmail || 'zoneequipements@gmail.com'}`),
      margin,
      23
    );

    let y = 35;

    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const titleLines = doc.splitTextToSize(sanitizePdfText(product.name), contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 5.8 + 3;

    // Bandeau méta-infos
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(sanitizePdfText(`Marque : ${product.brand || 'OEM'}   |   Référence : ${product.ref || product.id}   |   Catégorie : ${product.category || 'Industrie'}`), margin + 4, y + 6.5);
    doc.text(sanitizePdfText(`Origine : ${product.origin || 'International'}   |   Poids : ${product.weight || 'Standard'}   |   Prix indicatif HT : ${formatAmountPdf(product.price)} FCFA`), margin + 4, y + 12.5);
    y += 22;

    if (product.description) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 51, 102);
      doc.text('DESCRIPTION TECHNIQUE :', margin, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const descLines = doc.splitTextToSize(sanitizePdfText(product.description), contentWidth);
      doc.text(descLines, margin, y);
      y += descLines.length * 4.5 + 6;
    }

    // Tableau des caractéristiques techniques
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 51, 102);
    doc.text('SPÉCIFICATIONS & CARACTÉRISTIQUES TECHNIQUES (FRANÇAIS) :', margin, y);
    y += 4;

    const specsEntries = Object.entries(product.specs || {});
    if (specsEntries.length > 0) {
      specsEntries.forEach(([k, v], idx) => {
        const keyLines = doc.splitTextToSize(sanitizePdfText(k), contentWidth * 0.42 - 4);
        const valLines = doc.splitTextToSize(sanitizePdfText(String(v)), contentWidth * 0.58 - 4);
        const rowH = Math.max(7, Math.max(keyLines.length, valLines.length) * 4.2 + 2.5);

        if (y + rowH > pageHeight - 18) {
          doc.addPage();
          y = 16;
        }

        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, contentWidth, rowH, 'F');
        }
        doc.setDrawColor(226, 232, 240);
        doc.rect(margin, y, contentWidth, rowH, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text(keyLines, margin + 2, y + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(valLines, margin + contentWidth * 0.42 + 2, y + 4.5);

        y += rowH;
      });
    }

    // Pied de page
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      sanitizePdfText(`Fiche technique officielle générée par ${settings.companyName || 'ZONE ÉQUIPEMENTS'} — ${new Date().toLocaleDateString('fr-FR')}`),
      margin,
      pageHeight - 7.5
    );

    const safeFile = `Fiche-Technique-${(product.ref || String(product.id)).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    doc.save(safeFile);
    if (onDone) onDone(`Fiche technique PDF "${safeFile}" téléchargée.`);
  } catch (err) {
    console.error('Erreur génération fiche technique PDF:', err);
  }
}

/**
 * Lance l'impression A4 via iframe ET télécharge un vrai fichier .PDF (jamais .html)
 * lorsque l'application est exécutée dans une iframe ou si l'utilisateur souhaite enregistrer le PDF.
 */
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
    @media print {
      body { padding: 0; }
      .no-print-bar { display: none !important; }
    }
  </style>
</head>
<body>
  ${bodyHtml}
  <div class="footer">
    ZONE ÉQUIPEMENTS — Km 4, Boulevard du Centenaire, Dakar, Sénégal • Tél / WhatsApp : +221 76 653 83 84 • Email : zoneequipements@gmail.com
  </div>
</body>
</html>`;

  // 1. Tenter l'impression directe via une iframe cachée dans le DOM
  let printedViaIframe = false;
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

  // 2. Télécharger systématiquement un vrai fichier .PDF (via jsPDF) en environnement iframe ou si l'impression native est bloquée
  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  if (isInIframe || !printedViaIframe) {
    downloadHtmlAsPdf(title, filename, bodyHtml, onDone);
    return;
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
