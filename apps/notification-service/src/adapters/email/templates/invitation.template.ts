import { baseTemplate } from './base.template';

export interface InvitationTemplateParams {
  inviterName: string;
  companyName: string;
  invitationLink: string;
  role: string;
  recipientName?: string;
}

export function invitationTemplate(params: InvitationTemplateParams): string {
  const { inviterName, companyName, invitationLink, role, recipientName } = params;
  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';

  const content = `
    <h2 class="text-center">You're Invited!</h2>

    <p>${greeting}</p>

    <p>
      <strong>${inviterName}</strong> has invited you to join
      <strong>${companyName}</strong> on Flexobo as a <strong>${role}</strong>.
    </p>

    <p>
      Flexobo is a logistics platform that connects shippers with carriers,
      making freight transportation easier and more efficient.
    </p>

    <div class="text-center">
      <a href="${invitationLink}" class="button">Accept Invitation</a>
    </div>

    <p class="text-muted text-center mt-4">
      If you're having trouble clicking the button, copy and paste this link into your browser:
    </p>
    <p class="text-muted text-center" style="word-break: break-all;">
      ${invitationLink}
    </p>

    <p class="text-muted mt-4">
      If you weren't expecting this invitation, you can safely ignore this email.
    </p>
  `;

  return baseTemplate({ content, title: 'Join ' + companyName + ' on Flexobo' });
}

export function invitationPlainText(params: InvitationTemplateParams): string {
  const { inviterName, companyName, invitationLink, role, recipientName } = params;
  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';

  return `
${greeting}

${inviterName} has invited you to join ${companyName} on Flexobo as a ${role}.

Flexobo is a logistics platform that connects shippers with carriers, making freight transportation easier and more efficient.

Accept the invitation by visiting:
${invitationLink}

If you weren't expecting this invitation, you can safely ignore this email.

---
Flexobo
  `.trim();
}
