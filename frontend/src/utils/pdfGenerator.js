import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateInvoicePDF = (data) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // --- 1. DARK BACKGROUND & THEME SETUP ---
    doc.setFillColor(10, 10, 10); // Deep Obsidian
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Add cinematic border
    doc.setDrawColor(230, 28, 52); // Horror Red
    doc.setLineWidth(0.5);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

    // Add subtle tech lines (Predator/Alien vibe)
    doc.setDrawColor(255, 255, 255, 0.1);
    for (let i = 0; i < pageHeight; i += 40) {
        doc.line(5, i, 15, i);
        doc.line(pageWidth - 5, i, pageWidth - 15, i);
    }

    // --- 2. HEADER: HIGH-TECH DOSSIER STYLE ---
    // Stylized Logo Block
    doc.setFillColor(230, 28, 52); // Horror Red
    doc.rect(14, 15, 30, 10, 'F');
    doc.setFont("courier", "bold");
    doc.setFontSize(18);
    doc.setTextColor(10, 10, 10); // Black text on red
    doc.text("FORZA", 16, 22);

    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("SHOP", 46, 24);

    doc.setFontSize(8);
    doc.setTextColor(230, 28, 52); // Red Accent
    doc.text("CORE SYSTEM // SECURE COLLECTIBLES REGISTRY", 14, 30);

    // Right side: Invoice Branding
    doc.setFillColor(230, 28, 52);
    doc.rect(pageWidth - 60, 15, 46, 12, 'F');
    doc.setFont("courier", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("MANIFEST", pageWidth - 37, 23, { align: "center" });

    // Header Details
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`ID: ${data.invoice_number}`, pageWidth - 14, 33, { align: "right" });
    doc.text(`ISSUED: ${data.invoice_date.toUpperCase()}`, pageWidth - 14, 38, { align: "right" });

    // Status Badge
    const isPaid = data.status === 'paid';
    doc.setDrawColor(isPaid ? 52 : 230, isPaid ? 211 : 28, isPaid ? 153 : 52);
    doc.setLineWidth(1);
    doc.rect(pageWidth - 40, 42, 26, 7);
    doc.setFontSize(8);
    doc.setTextColor(isPaid ? 52 : 230, isPaid ? 211 : 28, isPaid ? 153 : 52);
    doc.text(data.status.toUpperCase(), pageWidth - 27, 47, { align: "center" });

    // --- 3. CUSTOMER & ORDER INFO (GRID LAYOUT) ---
    doc.setDrawColor(255, 255, 255, 0.05);
    doc.line(14, 55, pageWidth - 14, 55);

    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("RECIPIENT_ENTITY:", 14, 65);

    doc.setFont("courier", "normal");
    doc.setTextColor(200, 200, 200);
    doc.text(data.customer.name.toUpperCase(), 14, 71);
    doc.text(data.customer.email, 14, 76);
    doc.text(data.customer.phone || "COMM_ID_UNKNOWN", 14, 81);

    doc.setFont("courier", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("REFERENCE_LINK:", pageWidth - 70, 65);
    doc.setFont("courier", "normal");
    doc.setTextColor(200, 200, 200);
    doc.text(`ORDER_REF: ${data.order_number}`, pageWidth - 14, 71, { align: "right" });
    doc.text(`EXP_DATE:  ${data.due_date.toUpperCase()}`, pageWidth - 14, 76, { align: "right" });

    // --- 4. ITEMS TABLE (GLITCH/TECH THEME) ---
    const tableRows = data.items.map(item => [
        item.no.toString().padStart(2, '0'),
        item.product_name.toUpperCase(),
        item.sku,
        item.quantity.toString(),
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.price),
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.total),
    ]);

    autoTable(doc, {
        head: [["ID", "ASSET_DESCRIPTION", "UNIT_SKU", "QTY", "VALUATION", "SUB_TOTAL"]],
        body: tableRows,
        startY: 90,
        theme: 'plain',
        headStyles: {
            fillColor: [30, 30, 30],
            textColor: [230, 28, 52], // Red headers
            font: "courier",
            fontStyle: "bold",
            fontSize: 8,
            cellPadding: 4
        },
        bodyStyles: {
            fillColor: [10, 10, 10],
            textColor: [255, 255, 255],
            font: "courier",
            fontSize: 8,
            cellPadding: 4,
            lineColor: [255, 255, 255, 0.05],
            lineWidth: 0.1
        },
        alternateRowStyles: {
            fillColor: [15, 15, 15]
        },
        margin: { left: 14, right: 14 }
    });

    // --- 5. TOTALS BLOCK ---
    let finalY = doc.lastAutoTable.finalY + 15;

    // Total Box
    doc.setFillColor(20, 20, 20);
    doc.rect(pageWidth - 85, finalY - 5, 71, 35, 'F');
    doc.setDrawColor(230, 28, 52, 0.5);
    doc.rect(pageWidth - 85, finalY - 5, 71, 35, 'S');

    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("GROSS_VALUE:", pageWidth - 80, finalY + 2);
    doc.text(new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.subtotal), pageWidth - 19, finalY + 2, { align: "right" });

    finalY += 8;
    doc.text("LOGISTICS:", pageWidth - 80, finalY + 2);
    doc.text(new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.shipping), pageWidth - 19, finalY + 2, { align: "right" });

    finalY += 12;
    doc.setFillColor(230, 28, 52);
    doc.rect(pageWidth - 85, finalY - 2, 71, 10, 'F');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont("courier", "bold");
    doc.text("TOTAL_VALUATION:", pageWidth - 80, finalY + 4.5);
    doc.text(new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.total), pageWidth - 19, finalY + 4.5, { align: "right" });

    // --- 6. PAYMENT INSTRUCTIONS / FOOTER ---
    finalY = Math.max(finalY + 25, 200);

    if (data.status !== 'paid' && data.payment_info) {
        doc.setFontSize(10);
        doc.setTextColor(230, 28, 52);
        doc.text(">> SETTLEMENT_INSTRUCTIONS:", 14, finalY);

        doc.setFont("courier", "normal");
        doc.setTextColor(180, 180, 180);
        finalY += 7;
        doc.text(`WIRE_TO:  ${data.payment_info.bank.toUpperCase()}`, 14, finalY);
        finalY += 5;
        doc.text(`ACC_NUM:  ${data.payment_info.account_number}`, 14, finalY);
        finalY += 5;
        doc.text(`ENTITY:   ${data.payment_info.account_name.toUpperCase()}`, 14, finalY);
    } else {
        doc.setDrawColor(52, 211, 153);
        doc.rect(14, finalY, 182, 20);
        doc.setFontSize(14);
        doc.setTextColor(52, 211, 153);
        doc.setFont("courier", "bold");
        doc.text("CLEARED: TRANSACTION_VERIFIED", pageWidth / 2, finalY + 9, { align: "center" });
        if (data.paid_at) {
            doc.setFontSize(8);
            doc.text(`TIMESTAMP: ${data.paid_at.toUpperCase()}`, pageWidth / 2, finalY + 15, { align: "center" });
        }
    }

    // --- 7. FINAL PAGE DECORATIONS ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("courier", "normal");
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        doc.text("SYSTEM_GENERATED_DOCUMENT // UNALTERABLE_BLOCKCHAIN_RECORD", 14, pageHeight - 12);
        doc.text(`PAGE_ID: ${i}/${pageCount}`, pageWidth - 14, pageHeight - 12, { align: "right" });

        // Add footer tech line
        doc.setDrawColor(230, 28, 52, 0.3);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
    }

    // Save with specific naming convention
    doc.save(`FORZA_MANIFEST_${data.invoice_number}.pdf`);
};
