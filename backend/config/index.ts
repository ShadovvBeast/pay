export const config = {
  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/sb0_pay',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'sb0_pay',
    user: process.env.DB_USER || 'username',
    password: process.env.DB_PASSWORD || 'password',
  },

  // AllPay API Configuration
  allpay: {
    apiUrl: process.env.ALLPAY_API_URL || 'https://www.allpay.co.il/api/',
    login: process.env.ALLPAY_LOGIN || 'pp1012035',
    apiKey: process.env.ALLPAY_API_KEY || 'E51C3EA351988CB77BCC97D2642A45AE',
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: '24h',
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // CORS Configuration
  cors: {
    // Keep legacy single origin for backward compatibility
    origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173',
    // Normalized list of allowed origins (comma-separated in env)
    origins: ((process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
      // Strip any trailing slashes to match browser Origin header exactly
      .map((o) => o.replace(/\/+$/, ''))),
  },
};