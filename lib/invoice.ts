import PDFDocument from "pdfkit";
import { PROGRAMME_NAME } from "./site";

/**
 * One-page PDF receipt for a completed Razorpay payment — see
 * app/api/razorpay/verify/route.ts, the only caller. There's a single fixed
 * line item (the programme itself), so this is a receipt more than a
 * line-itemised invoice, but "invoice" is what it's called everywhere else
 * in the codebase/emails, so the naming stays consistent.
 */

export type InvoiceDetails = {
  name: string;
  email: string;
  /** Smallest currency unit, as returned by Razorpay (paise for INR). */
  amountMinorUnits: number;
  currency: string;
  paymentId: string;
  orderId: string;
  date: Date;
};

export function generateInvoicePdf(details: InvoiceDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const amount = (details.amountMinorUnits / 100).toFixed(2);

    doc.fontSize(20).fillColor("#111111").text("Delta AI Academy");
    doc.fontSize(10).fillColor("#666666").text("Payment receipt / invoice");
    doc.moveDown(1.5);

    doc.fillColor("#111111").fontSize(11);
    doc.text(`Invoice date: ${details.date.toDateString()}`);
    doc.text(`Payment ID: ${details.paymentId}`);
    doc.text(`Order ID: ${details.orderId}`);
    doc.moveDown();
    doc.text(`Billed to: ${details.name || "—"}`);
    doc.text(details.email);
    doc.moveDown(1.5);

    doc.strokeColor("#dddddd").moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("#111111").text(PROGRAMME_NAME);
    doc.moveDown(0.5);
    doc.strokeColor("#dddddd").moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    doc.fontSize(14).text(`Total paid: ${details.currency} ${amount}`, { align: "right" });
    doc.moveDown(3);

    doc
      .fontSize(9)
      .fillColor("#888888")
      .text("This is a computer-generated receipt for your Delta AI Academy enrolment payment.", {
        align: "center",
      });

    doc.end();
  });
}
