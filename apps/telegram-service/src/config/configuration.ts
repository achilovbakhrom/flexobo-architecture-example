export default () => ({
  port: parseInt(process.env['PORT'] || '3012', 10),
  mode: process.env['MODE'] || 'dev',
  jwt: {
    secret: process.env['JWT_SECRET'] || 'your-jwt-secret',
  },
  rabbitmq: {
    url: process.env['RABBITMQ_URL'] || 'amqp://localhost:5672',
    exchange: process.env['RABBITMQ_EXCHANGE'] || 'flexobo.events',
  },
  redis: {
    url: process.env['REDIS_URL'] || 'redis://localhost:6379',
  },
  telegram: {
    botToken: process.env['TELEGRAM_BOT_TOKEN'] || '',
    channelId: process.env['TELEGRAM_CHANNEL_ID'] || '',
    webAppUrl: process.env['TELEGRAM_WEBAPP_URL'] || '',
  },
});
