import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Format currency IDR
const formatCurrency = (amount) => {
    const val = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(val);
};

export const generateInvoicePDF = (data) => {
    if (!data) throw new Error("No data provided for PDF generation");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // Header - Brand Section
    doc.setFontSize(28);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text("INVOICE", margin, 25);

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(data.company?.name || "WARUNG FORZA SHOP", margin, 35);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(data.company?.address || "Jakarta, Indonesia", margin, 40);
    doc.text(data.company?.email || "info@warungforza.com", margin, 45);

    // Invoice Meta Data - Right Aligned
    const metaX = pageWidth - margin;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text("INVOICE DETAILS", metaX, 35, { align: 'right' });
    doc.setFont(undefined, 'normal');

    // Auto-scale font for long invoice numbers
    const invNum = data.invoice_number || '';
    if (invNum.length > 25) doc.setFontSize(7);
    else if (invNum.length > 20) doc.setFontSize(8);
    else doc.setFontSize(9);

    const invNumLine = `Invoice #: ${invNum}`;
    doc.text(invNumLine, metaX, 42, { align: 'right' });

    doc.setFontSize(9);
    doc.text(`Date: ${data.invoice_date || ''}`, metaX, 47, { align: 'right' });
    doc.text(`Order Ref: ${data.order_number || ''}`, metaX, 52, { align: 'right' });

    const status = (data.status || 'UNPAID').toUpperCase();
    if (status === 'PAID') doc.setTextColor(0, 128, 0);
    else doc.setTextColor(200, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(`Status: ${status}`, metaX, 59, { align: 'right' });

    // Divider
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, 65, metaX, 65);

    // Billing Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("BILL TO", margin, 75);

    doc.setFontSize(12);
    doc.text(data.customer?.name || "Customer", margin, 82);

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(data.customer?.phone || "", margin, 87);
    doc.text(data.customer?.email || "", margin, 92);

    const addressStr = data.customer?.shipping_address;
    let address = {};
    if (typeof addressStr === 'string') {
        try { address = JSON.parse(addressStr); } catch (e) { address = { address: addressStr }; }
    } else if (typeof addressStr === 'object' && addressStr !== null) {
        address = addressStr;
    }

    const fullAddr = address.full_address || address.address || "Address not specified";
    const splitAddr = doc.splitTextToSize(fullAddr, 90);
    doc.text(splitAddr, margin, 97);

    let currentY = 97 + (splitAddr.length * 5);
    if (address.city || address.province) {
        doc.text(`${address.city || ''}, ${address.province || ''} ${address.postal_code || ''}`, margin, currentY);
        currentY += 7;
    } else {
        currentY += 5;
    }

    // Items Manifest
    const tableColumn = ["#", "DESCRIPTION", "QTY", "UNIT PRICE", "TOTAL"];
    const tableRows = (data.items || []).map((item, idx) => [
        idx + 1,
        item.product_name || "Unknown Product",
        item.quantity || 0,
        formatCurrency(item.price),
        formatCurrency(item.total)
    ]);

    autoTable(doc, {
        startY: currentY + 5,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            2: { halign: 'center', cellWidth: 15 },
            3: { halign: 'right', cellWidth: 35 },
            4: { halign: 'right', cellWidth: 35 },
        },
        margin: { left: margin, right: margin }
    });

    let finalY = doc.lastAutoTable.finalY + 15;

    // Financial Summary (Two-Column Layout)
    // Left: Order Progress
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("ORDER PAYMENT PROGRESS", margin, finalY);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);

    const sumData = data.summary || {};
    doc.text(`Total Order Value:`, margin, finalY + 8);
    doc.text(formatCurrency(sumData.total_order), 80, finalY + 8, { align: 'right' });

    doc.text(`Total Paid to Date:`, margin, finalY + 14);
    doc.text(formatCurrency(sumData.amount_paid), 80, finalY + 14, { align: 'right' });

    doc.setFont(undefined, 'bold');
    doc.text(`Remaining Balance:`, margin, finalY + 22);
    doc.text(formatCurrency(sumData.remaining_balance), 80, finalY + 22, { align: 'right' });

    // Right: Current Invoice Summary
    const rightSideX = pageWidth - margin;
    const labelX = pageWidth - 60;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text("Subtotal:", labelX, finalY, { align: 'right' });
    doc.text(formatCurrency(data.subtotal), rightSideX, finalY, { align: 'right' });

    doc.text("Shipping:", labelX, finalY + 6); // Note: aligned with Subtotal logic
    doc.text(formatCurrency(data.shipping), rightSideX, finalY + 6, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("AMOUNT DUE:", labelX, finalY + 16);
    doc.text(formatCurrency(data.total), rightSideX, finalY + 16, { align: 'right' });

    // Status Stamps/Warnings
    let stampY = finalY + 40;

    if (data.is_overdue) {
        doc.setFillColor(255, 230, 230);
        doc.rect(margin, stampY, pageWidth - (margin * 2), 15, 'F');
        doc.setTextColor(200, 0, 0);
        doc.setFontSize(11);
        doc.text("⚠️ OVERDUE WARNING: This installment is past its due date.", margin + 5, stampY + 9);
    }

    if (data.paid_at) {
        doc.setDrawColor(0, 128, 0);
        doc.setLineWidth(1);
        doc.rect(rightSideX - 40, stampY, 40, 20);
        doc.setTextColor(0, 128, 0);
        doc.setFontSize(14);
        doc.text("PAID", rightSideX - 20, stampY + 10, { align: 'center' });
        doc.setFontSize(8);
        doc.text(data.paid_at, rightSideX - 20, stampY + 16, { align: 'center' });
    }

    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    const footerY = 285;
    doc.text("Generated by Warung Forza System", pageWidth / 2, footerY - 5, { align: 'center' });
    doc.text("This is a computer-generated document. No signature required.", pageWidth / 2, footerY, { align: 'center' });

    // Save
    doc.save(`${data.invoice_number || 'invoice'}.pdf`);
};
