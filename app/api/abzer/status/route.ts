import { NextResponse } from "next/server";
import { getAbzerOrder } from "@/lib/abzer-orders";

export const runtime = "nodejs";

/**
 * Read-only status check for /order/payment-return to poll — never writes
 * anything. orderId is an unguessable UUID-based string (same trust model
 * as /api/invoice's orderId+paymentId pair), and the response leaks nothing
 * beyond a coarse status, so this needs no auth of its own.
 */
export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("orderId") ?? "";
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId." }, { status: 400 });
  }

  const order = await getAbzerOrder(orderId);
  if (!order) {
    return NextResponse.json({ status: "not_found" });
  }

  return NextResponse.json({ status: order.status });
}
