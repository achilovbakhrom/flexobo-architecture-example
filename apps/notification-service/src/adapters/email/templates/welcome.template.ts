import { baseTemplate } from './base.template';

export interface WelcomeTemplateParams {
  firstName?: string;
}

export function welcomeTemplate(params: WelcomeTemplateParams): string {
  const { firstName } = params;
  const greeting = firstName ? `Welcome, ${firstName}!` : 'Welcome to Flexobo!';

  const content = `
    <h2 class="text-center">${greeting}</h2>

    <p>Thank you for joining Flexobo! We're excited to have you on board.</p>

    <p>
      Flexobo is your one-stop platform for logistics and freight transportation.
      Whether you're a shipper looking for carriers or a carrier looking for loads,
      we've got you covered.
    </p>

    <h3>Get Started</h3>
    <ul>
      <li><strong>Complete your profile</strong> - Add your company details and verification documents</li>
      <li><strong>Browse loads</strong> - Find cargo that matches your routes</li>
      <li><strong>Post your trucks</strong> - Let shippers know about your available capacity</li>
      <li><strong>Connect with partners</strong> - Build your network in the logistics industry</li>
    </ul>

    <div class="text-center">
      <a href="https://flexobo.com/dashboard" class="button">Go to Dashboard</a>
    </div>

    <p class="text-muted mt-4">
      Need help getting started? Check out our
      <a href="https://flexobo.com/help">Help Center</a> or contact our support team.
    </p>
  `;

  return baseTemplate({ content, title: 'Welcome to Flexobo' });
}

export function welcomePlainText(params: WelcomeTemplateParams): string {
  const { firstName } = params;
  const greeting = firstName ? `Welcome, ${firstName}!` : 'Welcome to Flexobo!';

  return `
${greeting}

Thank you for joining Flexobo! We're excited to have you on board.

Flexobo is your one-stop platform for logistics and freight transportation. Whether you're a shipper looking for carriers or a carrier looking for loads, we've got you covered.

GET STARTED:

- Complete your profile - Add your company details and verification documents
- Browse loads - Find cargo that matches your routes
- Post your trucks - Let shippers know about your available capacity
- Connect with partners - Build your network in the logistics industry

Visit your dashboard: https://flexobo.com/dashboard

Need help getting started? Check out our Help Center at https://flexobo.com/help

---
Flexobo
  `.trim();
}
