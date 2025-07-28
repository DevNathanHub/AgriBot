# AgriBot Deployment Guide

## Environment Setup

### 1. Create Environment File
```bash
cp .env.example .env
```

### 2. Configure Environment Variables

```env
# Telegram Bot Configuration
BOT_TOKEN=your_telegram_bot_token_here
BOT_USERNAME=your_bot_username

# Database Configuration  
MONGODB_URI=mongodb://localhost:27017/agribot

# Server Configuration
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=your_super_secure_jwt_secret_here
JWT_EXPIRES_IN=7d

# External APIs
WEATHER_API_KEY=your_openweather_api_key
AGRICULTURE_API_KEY=your_agriculture_api_key

# Admin Configuration
ADMIN_USER_IDS=123456789,987654321
CHANNEL_ID=@your_channel_handle

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Cron Jobs
ENABLE_CRON=true
WEATHER_UPDATE_CRON=0 8 * * *
MARKET_UPDATE_CRON=0 10 * * *
TIPS_UPDATE_CRON=0 18 * * *
```

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
npm run setup
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Test the Bot
- Send `/start` to your bot in Telegram
- Test weather, market, and advice features
- Check API endpoints at http://localhost:3000/api

## Production Deployment

### Option 1: Traditional Server Deployment

#### 1. Prepare Server
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Install PM2 for process management
sudo npm install -g pm2
```

#### 2. Deploy Application
```bash
# Clone repository
git clone <your-repo-url> agribot
cd agribot

# Install dependencies
npm install --production

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run setup

# Start with PM2
pm2 start src/index.js --name "agribot"
pm2 save
pm2 startup
```

#### 3. Setup Nginx (Optional)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

#### 2. Create docker-compose.yml
```yaml
version: '3.8'

services:
  agribot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/agribot
    env_file:
      - .env
    depends_on:
      - mongo
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

volumes:
  mongo_data:
```

#### 3. Deploy with Docker Compose
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f agribot

# Setup database (run once)
docker-compose exec agribot npm run setup
```

### Option 3: Cloud Platform Deployment

#### Heroku Deployment
```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create your-agribot-app

# Set environment variables
heroku config:set BOT_TOKEN=your_token
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_secret
# ... set other environment variables

# Deploy
git push heroku main

# Run setup
heroku run npm run setup
```

#### Railway Deployment
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

#### DigitalOcean App Platform
1. Create new app from GitHub repository
2. Configure environment variables
3. Set build and run commands:
   - Build: `npm install`
   - Run: `npm start`

## Production Configuration

### 1. Environment Variables for Production
```env
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_CRON=true

# Security
ALLOWED_ORIGINS=https://your-domain.com,https://your-mini-app.com

# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/agribot

# External Services
WEATHER_API_KEY=your_production_weather_api_key
AGRICULTURE_API_KEY=your_production_agriculture_api_key
```

### 2. Database Setup
```bash
# For MongoDB Atlas (recommended for production)
# 1. Create MongoDB Atlas cluster
# 2. Get connection string
# 3. Add to MONGODB_URI in .env
# 4. Run setup script

npm run setup
```

### 3. SSL/HTTPS Configuration
```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Mini-App Integration

### 1. Create Telegram Mini App
1. Message @BotFather in Telegram
2. Send `/newapp`
3. Select your bot
4. Provide app name and description
5. Upload app icon
6. Set Web App URL: `https://your-domain.com/mini-app`

### 2. Mini-App Frontend (Optional)
Create a simple HTML interface:

```html
<!DOCTYPE html>
<html>
<head>
    <title>AgriBot Mini App</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
</head>
<body>
    <h1>AgriBot Dashboard</h1>
    <div id="app">
        <!-- Your mini-app interface -->
    </div>
    <script>
        // Initialize Telegram Web App
        Telegram.WebApp.ready();
        
        // Your app logic here
    </script>
</body>
</html>
```

## Monitoring and Maintenance

### 1. Health Monitoring
```bash
# Check application status
curl http://localhost:3000/api/health

# Monitor with PM2
pm2 status
pm2 logs agribot
pm2 monit
```

### 2. Database Maintenance
```bash
# Backup database
mongodump --uri="mongodb://localhost:27017/agribot" --out backup/

# Restore database
mongorestore --uri="mongodb://localhost:27017/agribot" backup/agribot/

# Cleanup old data (can be automated)
# Use admin API endpoint: DELETE /api/admin/data/cleanup
```

### 3. Log Management
```bash
# Rotate logs with logrotate
sudo vim /etc/logrotate.d/agribot

/path/to/agribot/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

## Scaling Considerations

### 1. Horizontal Scaling
- Use load balancer (nginx, HAProxy)
- Deploy multiple instances
- Use Redis for session storage
- Implement message queues for broadcasts

### 2. Database Scaling
- Use MongoDB replica sets
- Implement read replicas
- Consider sharding for large datasets

### 3. Caching
- Implement Redis caching
- Cache weather and market data
- Use CDN for static assets

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Secure environment variables
- [ ] Implement rate limiting
- [ ] Use strong JWT secrets
- [ ] Regularly update dependencies
- [ ] Monitor for security vulnerabilities
- [ ] Implement proper error handling
- [ ] Use database authentication
- [ ] Set up firewall rules
- [ ] Regular security audits

## Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check BOT_TOKEN is correct
   - Verify webhook/polling is working
   - Check network connectivity

2. **Database connection errors**
   - Verify MONGODB_URI
   - Check MongoDB service status
   - Ensure network access to database

3. **API rate limits**
   - Check external API quotas
   - Implement caching
   - Add retry mechanisms

4. **High memory usage**
   - Monitor with PM2
   - Implement data cleanup
   - Optimize database queries

### Getting Help

- Check application logs in `logs/` directory
- Use `npm run test` to run tests
- Check GitHub issues
- Contact support team

Remember to test thoroughly in a staging environment before deploying to production!
