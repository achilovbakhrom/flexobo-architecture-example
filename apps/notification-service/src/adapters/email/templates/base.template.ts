export interface BaseTemplateParams {
  content: string;
  title?: string;
}

export function baseTemplate(params: BaseTemplateParams): string {
  const { content, title = 'Flexobo' } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .email-wrapper {
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #2563eb;
      color: #ffffff;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 32px 24px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 16px 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 16px 0;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .code-box {
      background-color: #f1f5f9;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .code {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 8px;
      color: #1e40af;
      font-family: monospace;
    }
    .text-muted {
      color: #64748b;
      font-size: 14px;
    }
    .text-center {
      text-align: center;
    }
    .mt-4 {
      margin-top: 16px;
    }
    .mb-4 {
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="header">
        <h1>Flexobo</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Flexobo. All rights reserved.</p>
        <p>This email was sent automatically. Please do not reply to this message.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
