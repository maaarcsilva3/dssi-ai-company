export function sendEmailStub(payload: { to: string; subject: string; body: string }) {
  console.log("[EMAIL STUB]", JSON.stringify(payload, null, 2));
}