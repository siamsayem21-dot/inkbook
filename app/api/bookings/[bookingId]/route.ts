import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: { bookingId: string };
}

export async function GET(_request: NextRequest, { params }: Params) {
  // TODO: fetch booking from Supabase
  return NextResponse.json({ booking: { id: params.bookingId } });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const body = await request.json();
  // TODO: update booking status (cancel, no-show, complete)
  return NextResponse.json({ booking: { id: params.bookingId, ...body } });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  // Cancel booking and trigger deposit refund logic
  // If no-show: keep deposit (no refund)
  // TODO: handle via Supabase + Stripe
  return NextResponse.json({ cancelled: true, bookingId: params.bookingId });
}
