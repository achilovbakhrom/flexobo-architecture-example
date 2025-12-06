import { baseTemplate } from './base.template';

export interface OtpTemplateParams {
  code: string;
  expiresInMinutes: number;
  type: 'REGISTRATION' | 'LOGIN' | 'RESET_PASSWORD';
}

const typeMessages: Record<string, { title: string; description: string }> = {
  REGISTRATION: {
    title: 'Complete Your Registration',
    description: 'Use the code below to complete your registration on Flexobo.',
  },
  LOGIN: {
    title: 'Sign In Verification',
    description: 'Use the code below to sign in to your Flexobo account.',
  },
  RESET_PASSWORD: {
    title: 'Reset Your Password',
    description: 'Use the code below to reset your Flexobo account password.',
  },
};

export function otpTemplate(params: OtpTemplateParams): string {
  const { code, expiresInMinutes, type } = params;
  const { title, description } = typeMessages[type] || typeMessages.LOGIN;

  const content = `
    <h2 class="text-center">${title}</h2>
    <p class="text-center">${description}</p>

    <div class="code-box">
      <p class="text-muted mb-4">Your verification code is:</p>
      <div class="code">${code}</div>
    </div>

    <p class="text-center text-muted">
      This code will expire in <strong>${expiresInMinutes} minutes</strong>.
    </p>

    <p class="text-center text-muted mt-4">
      If you didn't request this code, you can safely ignore this email.
      Someone else might have typed your email address by mistake.
    </p>
  `;

  return baseTemplate({ content, title });
}

export function otpPlainText(params: OtpTemplateParams): string {
  const { code, expiresInMinutes, type } = params;
  const { title, description } = typeMessages[type] || typeMessages.LOGIN;

  return `
${title}

${description}

Your verification code is: ${code}

This code will expire in ${expiresInMinutes} minutes.

If you didn't request this code, you can safely ignore this email.

---
Flexobo
  `.trim();
}
