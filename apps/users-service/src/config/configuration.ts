export default () => ({
  port: parseInt(process.env.PORT as string, 10),
  grpcPort: parseInt(process.env.GRPC_PORT as string, 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY,
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY,
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
  },
});
