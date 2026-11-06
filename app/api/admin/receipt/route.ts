import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { getEnrollment } from "@/lib/enrollments";
import { generateInvoicePdf } from "@/lib/invoice";

export const runtime = "nodejs";

/**
 * The receipt for one enrolment, for the admin.
 *
 * Deliberately not /api/invoice. That route serves the *buyer* on the
 * thank-you page with no login, so it can trust nothing and re-fetches the
 * figures from the payment gateway to prove the two ids in the URL really
 * belong to a captured payment. The cost of that is it can only produce a
 * receipt for a payment some gateway still remembers — which leaves out every
 * coupon and manual enrolment, and the Abzer rows that never stored a receipt
 * id. A third of this project's enrolments have no gateway reference at all,
 * so a third of them had no receipt.
 *
 * Here the caller is already an authenticated admin, so the enrolment row is
 * itself the record of what was paid: it holds the name, address, amount,
 * currency and date, and whichever ids exist. Every source works, archived
 * rows included.
 */
export async function GET(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const enrollment = await getEnrollment(id);
  if (!enrollment) {
    return NextResponse.json({ error: "Enrolment not found." }, { status: 404 });
  }

  try {
    const pdf = await generateInvoicePdf({
      name: enrollment.name ?? "",
      email: enrollment.email,
      amountMinorUnits: enrollment.amountMinorUnits,
      currency: enrollment.currency,
      // Whichever gateway took it; empty for coupon and manual rows, which
      // print their source instead.
      paymentId:
        enrollment.razorpayPaymentId ??
        enrollment.abzerReceiptId ??
        enrollment.stripePaymentIntentId ??
        "",
      orderId:
        enrollment.razorpayOrderId ??
        enrollment.abzerOrderId ??
        enrollment.stripeSessionId ??
        "",
      date: new Date(enrollment.createdAt),
      source: enrollment.source,
      couponCode: enrollment.couponCode,
    });

    /*
     * The buyer's name, not the row id — this gets forwarded to them.
     *
     * Two spellings of the filename, because an HTTP header is bytes: a name
     * with anything outside latin-1 in it, or a stray em dash in the label,
     * throws on the way out rather than arriving mangled. `filename` is the
     * ASCII fallback every client understands, and `filename*` (RFC 5987)
     * carries the real one for those that do.
     */
    const name = (enrollment.name || enrollment.email).trim();
    const label = `Delta AI Academy Receipt - ${name || id}.pdf`;
    const ascii = label.replace(/[^\x20-\x7E]+/g, "").replace(/["\\]/g, "");
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          `attachment; filename="${ascii || `receipt-${id}.pdf`}"; ` +
          `filename*=UTF-8''${encodeURIComponent(label)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Failed to generate admin receipt for", id, err);
    return NextResponse.json({ error: "Could not generate receipt." }, { status: 502 });
  }
}
