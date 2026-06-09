/**
 * Server-side email templates. The notifications service owns these so callers
 * (auth, payment) only pass data, never HTML. Each builder returns the subject,
 * an HTML body and a plain-text fallback.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const BRAND = 'FitCoach AI';
const COLOR = '#22d3ee';

const layout = (heading: string, bodyHtml: string): string => `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
    <h1 style="color:${COLOR};font-size:22px;margin:0 0 16px">${BRAND}</h1>
    <h2 style="font-size:18px;margin:0 0 12px">${heading}</h2>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
    <p style="font-size:12px;color:#64748b">${BRAND} · Cet email vous a été envoyé automatiquement, merci de ne pas y répondre.</p>
  </div>
`;

const button = (label: string, url: string): string => `
  <p style="margin:20px 0">
    <a href="${url}" style="background:${COLOR};color:#022c33;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px;display:inline-block">${label}</a>
  </p>
`;

export interface VerifyAccountData {
  name?: string;
  verifyUrl: string;
}

export const verifyAccountEmail = (data: VerifyAccountData): RenderedEmail => ({
  subject: `Confirmez votre compte ${BRAND}`,
  html: layout(
    `Bienvenue${data.name ? ` ${data.name}` : ''} !`,
    `<p>Merci de vous être inscrit. Confirmez votre adresse email pour activer votre compte.</p>
     ${button('Confirmer mon compte', data.verifyUrl)}
     <p style="font-size:13px;color:#64748b">Ou copiez ce lien : <br />${data.verifyUrl}</p>`
  ),
  text: `Bienvenue${data.name ? ` ${data.name}` : ''} ! Confirmez votre compte ${BRAND} : ${data.verifyUrl}`,
});

export interface InvoiceData {
  name?: string;
  planName: string;
  amount: string; // already formatted, e.g. "9,99 €"
  invoiceNumber: string;
  periodEnd?: string;
  invoiceUrl?: string;
}

export const invoiceEmail = (data: InvoiceData): RenderedEmail => ({
  subject: `Votre facture ${BRAND} — ${data.invoiceNumber}`,
  html: layout(
    'Merci pour votre abonnement',
    `<p>Voici le récapitulatif de votre paiement.</p>
     <table style="width:100%;border-collapse:collapse;font-size:14px">
       <tr><td style="padding:6px 0;color:#64748b">Facture</td><td style="text-align:right">${data.invoiceNumber}</td></tr>
       <tr><td style="padding:6px 0;color:#64748b">Formule</td><td style="text-align:right">${data.planName}</td></tr>
       <tr><td style="padding:6px 0;color:#64748b">Montant</td><td style="text-align:right;font-weight:600">${data.amount}</td></tr>
       ${data.periodEnd ? `<tr><td style="padding:6px 0;color:#64748b">Valable jusqu'au</td><td style="text-align:right">${data.periodEnd}</td></tr>` : ''}
     </table>
     ${data.invoiceUrl ? button('Télécharger la facture', data.invoiceUrl) : ''}`
  ),
  text: `Facture ${data.invoiceNumber} — ${data.planName} — ${data.amount}${data.invoiceUrl ? ` — ${data.invoiceUrl}` : ''}`,
});

export interface SubscriptionData {
  name?: string;
  planName: string;
  periodEnd?: string;
}

export const subscriptionStartedEmail = (data: SubscriptionData): RenderedEmail => ({
  subject: `Votre abonnement ${data.planName} est actif`,
  html: layout(
    'Abonnement activé 🎉',
    `<p>Votre formule <strong>${data.planName}</strong> est maintenant active${data.periodEnd ? ` jusqu'au ${data.periodEnd}` : ''}. Profitez de toutes les fonctionnalités IA !</p>`
  ),
  text: `Votre abonnement ${data.planName} est actif${data.periodEnd ? ` jusqu'au ${data.periodEnd}` : ''}.`,
});

export const subscriptionEndingEmail = (data: SubscriptionData): RenderedEmail => ({
  subject: `Votre abonnement ${data.planName} se termine bientôt`,
  html: layout(
    'Votre abonnement expire bientôt',
    `<p>Votre formule <strong>${data.planName}</strong> prend fin${data.periodEnd ? ` le ${data.periodEnd}` : ' prochainement'}. Renouvelez pour ne pas perdre l'accès aux fonctionnalités premium.</p>`
  ),
  text: `Votre abonnement ${data.planName} se termine${data.periodEnd ? ` le ${data.periodEnd}` : ' bientôt'}.`,
});

export const paymentFailedEmail = (data: SubscriptionData): RenderedEmail => ({
  subject: `Échec de paiement — ${BRAND}`,
  html: layout(
    'Problème de paiement',
    `<p>Le paiement de votre abonnement <strong>${data.planName}</strong> a échoué. Merci de mettre à jour votre moyen de paiement pour conserver votre accès.</p>`
  ),
  text: `Le paiement de votre abonnement ${data.planName} a échoué. Merci de mettre à jour votre moyen de paiement.`,
});

export type EmailTemplate =
  | { template: 'verify-account'; data: VerifyAccountData }
  | { template: 'invoice'; data: InvoiceData }
  | { template: 'subscription-started'; data: SubscriptionData }
  | { template: 'subscription-ending'; data: SubscriptionData }
  | { template: 'payment-failed'; data: SubscriptionData };

export const renderEmailTemplate = (input: EmailTemplate): RenderedEmail => {
  switch (input.template) {
    case 'verify-account':
      return verifyAccountEmail(input.data);
    case 'invoice':
      return invoiceEmail(input.data);
    case 'subscription-started':
      return subscriptionStartedEmail(input.data);
    case 'subscription-ending':
      return subscriptionEndingEmail(input.data);
    case 'payment-failed':
      return paymentFailedEmail(input.data);
  }
};
