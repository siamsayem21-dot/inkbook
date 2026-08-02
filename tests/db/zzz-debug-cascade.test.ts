import { describe, it } from "vitest";
import { getAdminClient, getPool, provisionStudioGraph, testTag } from "./helpers";

const admin = getAdminClient();
const pool = getPool();

describe("DEBUG cascade diagnostics", () => {
  it("diagnose consent_forms cascade race", async () => {
    const graph = await provisionStudioGraph(testTag());

    await admin.from("deposits").insert({ booking_id: graph.bookingId, amount_cents: 10000 });
    await admin.from("consent_forms").insert({
      booking_id: graph.bookingId, client_id: graph.clientId,
      client_signature: "sig", id_photo_url: "x", state_template: "CA",
    });

    const constraints = await pool.query(
      `SELECT conname, condeferrable, condeferred, confdeltype
       FROM pg_constraint
       WHERE conname IN ('consent_forms_client_id_fkey','bookings_client_id_fkey','consent_forms_booking_id_fkey')`
    );
    console.log("CONSTRAINTS BEFORE DELETE:", JSON.stringify(constraints.rows, null, 2));

    const { error: deleteErr } = await admin.from("studios").delete().eq("id", graph.studioId);
    console.log("DELETE ERROR:", JSON.stringify(deleteErr, null, 2));

    const bookingsLeft = await pool.query(`SELECT id, studio_id, client_id FROM bookings WHERE id = $1`, [graph.bookingId]);
    console.log("BOOKINGS LEFT:", JSON.stringify(bookingsLeft.rows, null, 2));

    const consentFormsLeft = await pool.query(`SELECT id, booking_id, client_id FROM consent_forms WHERE client_id = $1`, [graph.clientId]);
    console.log("CONSENT_FORMS LEFT:", JSON.stringify(consentFormsLeft.rows, null, 2));

    const clientsLeft = await pool.query(`SELECT id FROM clients WHERE id = $1`, [graph.clientId]);
    console.log("CLIENTS LEFT:", JSON.stringify(clientsLeft.rows, null, 2));

    const studiosLeft = await pool.query(`SELECT id FROM studios WHERE id = $1`, [graph.studioId]);
    console.log("STUDIOS LEFT:", JSON.stringify(studiosLeft.rows, null, 2));

    // Cleanup regardless of outcome
    await admin.from("consent_forms").delete().eq("client_id", graph.clientId).catch(() => {});
    await admin.from("bookings").delete().eq("id", graph.bookingId).catch(() => {});
    await admin.from("studios").delete().eq("id", graph.studioId).catch(() => {});
    await admin.auth.admin.deleteUser(graph.ownerUserId).catch(() => {});
    await admin.auth.admin.deleteUser(graph.artistUserId).catch(() => {});
  });
});
