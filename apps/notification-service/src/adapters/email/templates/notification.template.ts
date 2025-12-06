import { baseTemplate } from './base.template';

export interface NotificationTemplateParams {
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  recipientName?: string;
}

export function notificationTemplate(params: NotificationTemplateParams): string {
  const { title, message, actionUrl, actionText, recipientName } = params;
  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';

  const actionButton = actionUrl
    ? `
    <div class="text-center">
      <a href="${actionUrl}" class="button">${actionText || 'View Details'}</a>
    </div>
  `
    : '';

  const content = `
    <h2 class="text-center">${title}</h2>

    <p>${greeting}</p>

    <p>${message}</p>

    ${actionButton}

    <p class="text-muted mt-4">
      You received this notification because you're subscribed to updates from Flexobo.
      <a href="https://flexobo.com/settings/notifications">Manage your notification preferences</a>.
    </p>
  `;

  return baseTemplate({ content, title });
}

export function notificationPlainText(params: NotificationTemplateParams): string {
  const { title, message, actionUrl, actionText, recipientName } = params;
  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';

  const actionLink = actionUrl ? `\n${actionText || 'View Details'}: ${actionUrl}\n` : '';

  return `
${title}

${greeting}

${message}
${actionLink}
---
You received this notification because you're subscribed to updates from Flexobo.
Manage your notification preferences: https://flexobo.com/settings/notifications

---
Flexobo
  `.trim();
}
