export default () => ({
  port: parseInt(process.env.PORT || '3006', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  usersService: {
    grpcUrl: process.env.USERS_SERVICE_GRPC_URL || 'localhost:50052',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  },
  storage: {
    type: process.env.STORAGE_TYPE || 'local', // 'local' or 's3'
    localPath: process.env.STORAGE_LOCAL_PATH || './uploads',
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  },
});
