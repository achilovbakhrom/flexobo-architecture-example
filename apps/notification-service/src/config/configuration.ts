export default () => ({
  port: parseInt(process.env.PORT as string, 10) || 3010,
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    exchange: process.env.RABBITMQ_EXCHANGE || 'flexobo.events',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  fcm: {
    projectId: process.env.FCM_PROJECT_ID,
    privateKey: process.env.FCM_PRIVATE_KEY,
    clientEmail: process.env.FCM_CLIENT_EMAIL,
  },
  sse: {
    heartbeatIntervalMs: parseInt(
      process.env.SSE_HEARTBEAT_INTERVAL_MS as string,
      10
    ) || 30000,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT as string, 10) || 587,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
  },
  email: {
    from: process.env.EMAIL_FROM || 'noreply@flexobo.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Flexobo',
  },
  sms: {
    provider: process.env.SMS_PROVIDER || 'playmobile',
    apiKey: process.env.SMS_API_KEY,
    senderId: process.env.SMS_SENDER_ID || 'FLEXOBO',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
});
