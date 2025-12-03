export default () => ({
  port: parseInt(process.env.MAIN_SERVICE_PORT || process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY,
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY,
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
  },
});
