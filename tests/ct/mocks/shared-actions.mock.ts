// Test-only stand-in for the two "use server" action modules used by the wizard
// components under test (consult/actions.ts and custom/actions.ts). Both files
// import from the literal specifier "./actions", which Vite aliases (see
// playwright-ct.config.ts) straight to this single mock — real Supabase/email
// code never runs inside the component-test browser.
type Result = { id?: string; error?: string };

declare global {
  interface Window {
    __consultationResult?: Result;
    __lastConsultationSubmission?: Record<string, string>;
    __customRequestResult?: Result;
    __lastCustomRequestSubmission?: Record<string, string>;
  }
}

export async function submitConsultation(formData: FormData): Promise<Result> {
  window.__lastConsultationSubmission = {
    clientName: String(formData.get("clientName") ?? ""),
    clientEmail: String(formData.get("clientEmail") ?? ""),
    description: String(formData.get("description") ?? ""),
    detectedStyle: String(formData.get("detectedStyle") ?? ""),
  };
  return window.__consultationResult ?? { id: "mock-consultation-id" };
}

export async function submitCustomRequest(formData: FormData): Promise<Result> {
  window.__lastCustomRequestSubmission = {
    clientName: String(formData.get("clientName") ?? ""),
    clientEmail: String(formData.get("clientEmail") ?? ""),
    style: String(formData.get("style") ?? ""),
    description: String(formData.get("description") ?? ""),
    artistId: String(formData.get("artistId") ?? ""),
  };
  return window.__customRequestResult ?? { id: "mock-request-id" };
}
