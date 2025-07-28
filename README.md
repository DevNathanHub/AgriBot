
# 🌱 AgriBot - Intelligent Agricultural Assistant

An AI-powered Telegram bot designed to help farmers with intelligent agricultural guidance, weather information, market prices, and the latest agricultural news. Built with **Google Gemini AI**, **Express.js API**, and **MongoDB Atlas** for a comprehensive agricultural assistance platform.

## 🚀 Features

### 🤖 **AI Intelligence**
- **Google Gemini AI** integration for intelligent responses and conversations
- **Advanced prompt engineering** for agricultural expertise
- **Natural Language Processing** for understanding farmer queries in multiple languages
- **Context-aware responses** based on user location, crops, and farming history
- **Intent detection** for accurate agricultural guidance and recommendations
- **Conversational memory** to maintain context across interactions

### 📰 **Agricultural News**
- **Latest agricultural news** from GNews API
- **Category-based filtering** (crops, market, technology, sustainability)
- **Telegram-formatted news** with clean presentation
- **Real-time updates** on agricultural developments

### 🌤️ **Weather Intelligence**
- **Current weather conditions** and forecasts
- **Location-based weather data** using OpenWeather API
- **Agricultural weather alerts** and recommendations
- **Seasonal planning** based on weather patterns

### 📊 **Market Information**
- **Real-time crop prices** and market trends
- **Market analysis** for informed selling decisions
- **Price alerts** and notifications
- **Regional market data**

### 🌾 **Crop Management**
- **Planting and harvesting schedules** for various crops
- **Pest and disease identification** and treatment
- **Irrigation management** and water optimization
- **Fertilizer recommendations** based on soil and crop needs

### 🔧 **Technical Features**
- **RESTful API** endpoints for web and mobile integration
- **MongoDB Atlas** cloud database with optimized schemas
- **JWT Authentication** for secure API access and user sessions
- **Rate limiting** and security measures for API protection
- **Comprehensive logging** with Winston for debugging and monitoring
- **Hot reloading** development environment with nodemon
- 🌐 **Express API**: RESTful endpoints for mini-app integration
- 🔐 **Telegram Auth**: Built-in Telegram authentication with JWT tokens
- 📊 **Analytics Dashboard**: User engagement and agricultural insights
- 🌱 **Agricultural Intelligence**: Weather, crop advice, market prices
- 📲 **Mini-App Support**: Chat UI and user account management
- 🔔 **Smart Notifications**: Non-intrusive, value-driven updates
- **Cron Jobs**: Automated daily updates for weather, market prices, and tips

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account or local MongoDB installation
- Telegram Bot Token (from @BotFather)
- Google Gemini API Key
- OpenWeather API Key
- GNews API Key

### Quick Start

1. **Clone the repository:**
```bash
git clone https://github.com/DevNathanHub/AgriBot.git
cd AgriBot
```

2. **Install dependencies:**
```bash
npm install
```

3. **Environment Configuration:**
   
   Create a `.env` file in the root directory with the following configuration:

```env
# Telegram Bot Configuration
BOT_TOKEN=your_telegram_bot_token_here

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/agribot?retryWrites=true&w=majority
DB_NAME=agribot

# API Configuration
PORT=3000
NODE_ENV=development
API_BASE_URL=http://localhost:3000

# External API Keys
OPENWEATHER_API_KEY=your_openweather_api_key
GNEWS_API_KEY=your_gnews_api_key
GNEWS_URL=https://gnews.io/api/v4/
GEMINI_API_KEY=your_google_gemini_api_key

# JWT Configuration (Authentication)
JWT_SECRET=your_secure_jwt_secret_here
JWT_EXPIRES_IN=7d

# Channel Configuration
TELEGRAM_CHANNEL_ID=your_channel_id
TELEGRAM_CHANNEL_NAME=your_channel_name
TELEGRAM_CHANNEL_LINK=https://t.me/your_channel

# Security & Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/agribot.log

# Admin Configuration
ADMIN_USER_IDS=comma_separated_admin_ids
```

### 🔑 API Keys Setup Guide

#### 1. **Telegram Bot Token**
- Message [@BotFather](https://t.me/botfather) on Telegram
- Use `/newbot` command and follow instructions
- Copy the provided token to `BOT_TOKEN`

#### 2. **Google Gemini API Key**
- Visit [Google AI Studio](https://aistudio.google.com/)
- Create a new project or select existing one
- Generate API key and copy to `GEMINI_API_KEY`
- Enable the Gemini API for your project

#### 3. **OpenWeather API Key**
- Register at [OpenWeatherMap](https://openweathermap.org/api)
- Subscribe to the Current Weather Data API (free tier available)
- Copy your API key to `OPENWEATHER_API_KEY`

#### 4. **GNews API Key**
- Sign up at [GNews.io](https://gnews.io/)
- Get your free API key (100 requests/day)
- Copy to `GNEWS_API_KEY`

#### 5. **JWT Secret Generation**
Generate a secure JWT secret using Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy the generated string to `JWT_SECRET`

#### 6. **MongoDB Atlas Setup**
- Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
- Create a new cluster (free tier available)
- Create database user and get connection string
- Replace placeholders in connection string and add to `MONGODB_URI`

4. **Run setup script:**
```bash
npm run setup
```

5. **Start the application:**

For production:
```bash
npm start
```

For development (with hot reload):
```bash
npm run dev
```

6. **Verify installation:**
   - Check bot responds to `/start` command in Telegram
   - Test API endpoints at `http://localhost:3000/api/health`
   - Monitor logs in `logs/agribot.log`

## 📁 Project Structure

```
AgriBot/
├── src/
│   ├── index.js              # Main application entry point
│   ├── bot/
│   │   └── botHandler.js     # Telegram bot logic and handlers
│   ├── api/
│   │   ├── index.js          # API routes aggregator
│   │   ├── auth.js           # JWT authentication endpoints
│   │   ├── user.js           # User management endpoints
│   │   ├── agricultural.js   # Agricultural data endpoints
│   │   ├── admin.js          # Admin panel endpoints
│   │   └── bot.js            # Bot management endpoints
│   ├── models/
│   │   ├── User.js           # User schema and methods
│   │   ├── Conversation.js   # Chat history schema
│   │   └── AgriculturalData.js # Agricultural data schema
│   ├── services/
│   │   ├── aiService.js      # Google Gemini AI integration
│   │   ├── weatherService.js # OpenWeather API integration
│   │   ├── newsService.js    # GNews API integration
│   │   └── marketService.js  # Market data service
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication middleware
│   │   └── rateLimiter.js    # API rate limiting
│   ├── utils/
│   │   ├── keyboards.js      # Telegram inline keyboards
│   │   └── logger.js         # Winston logging configuration
│   ├── config/
│   │   └── database.js       # MongoDB connection setup
│   └── cron/
│       └── cronJobs.js       # Scheduled tasks (weather, news updates)
├── logs/                     # Application logs
├── scripts/
│   └── setup.js              # Initial setup and database seeding
├── .env.example              # Environment variables template
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/telegram` - Telegram user authentication
- `GET /api/auth/verify` - JWT token verification
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - User logout
- `GET /api/auth/status` - Authentication status

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/stats` - User statistics
- `POST /api/user/subscription` - Manage subscription

### Agricultural Data
- `GET /api/agricultural/weather` - Current weather data
- `GET /api/agricultural/forecast` - Weather forecast
- `GET /api/agricultural/crops` - Crop information
- `POST /api/agricultural/advice` - Get AI-powered agricultural advice
- `GET /api/agricultural/news` - Latest agricultural news
- `GET /api/agricultural/market` - Market prices and trends

### Admin (Protected)
- `GET /api/admin/users` - User management
- `GET /api/admin/stats` - System statistics
- `POST /api/admin/broadcast` - Send broadcast messages

### System
- `GET /api/health` - Health check endpoint

## 🤖 Google Gemini AI Integration

AgriBot leverages **Google Gemini AI** to provide intelligent, context-aware agricultural assistance. The AI integration enables:

### Features
- **Natural Language Understanding**: Processes farmer questions in natural language
- **Agricultural Expertise**: Specialized prompts for crop management, pest control, weather planning
- **Multi-language Support**: Responds in the user's preferred language
- **Context Awareness**: Remembers conversation history for better recommendations
- **Real-time Analysis**: Combines weather data, market trends, and user location for personalized advice

### AI Capabilities
- **Crop Disease Diagnosis**: Analyzes symptoms and provides treatment recommendations
- **Planting Schedule Optimization**: Suggests optimal planting times based on weather and location
- **Pest Management**: Identifies pests and recommends organic/chemical treatment options
- **Irrigation Planning**: Advises on water management based on crop type and weather
- **Market Strategy**: Provides selling recommendations based on market trends
- **Seasonal Planning**: Long-term agricultural planning and crop rotation advice

### Technical Implementation
- **Prompt Engineering**: Specialized prompts for agricultural contexts
- **Response Filtering**: Ensures agricultural relevance and safety
- **Rate Limiting**: Optimized API usage for cost efficiency
- **Error Handling**: Graceful fallbacks when AI service is unavailable
- **Content Moderation**: Filters inappropriate content and ensures family-friendly responses

### Usage Examples
```javascript
// Example AI service call
const advice = await aiService.getAgriculturalAdvice({
  query: "My tomato plants have yellow leaves",
  userLocation: "Kenya",
  cropType: "tomatoes",
  season: "dry",
  context: previousConversation
});
```

## 📱 Telegram Bot Commands

### User Commands
- `/start` - Initialize bot and user registration
- `/help` - Show available commands and features
- `/profile` - View and edit user profile
- `/weather` - Get current weather and forecast
- `/news` - Latest agricultural news
- `/market` - Current market prices
- `/tips` - Daily agricultural tips
- `/crops` - Crop information and management
- `/language` - Change bot language

### Admin Commands (Protected)
- `/admin` - Access admin panel
- `/broadcast` - Send message to all users
- `/stats` - Bot usage statistics
- `/users` - User management
- `/logs` - View system logs

## 🔐 Security Features

### Authentication & Authorization
- **JWT-based Authentication**: Secure token-based auth system
- **Telegram Integration**: Native Telegram user verification
- **Role-based Access**: User, Premium, Admin permission levels
- **Token Expiration**: Configurable token validity periods
- **Refresh Token Support**: Seamless session management

### API Security
- **Rate Limiting**: Prevents API abuse (configurable limits)
- **Input Validation**: Sanitizes all user inputs
- **CORS Protection**: Configurable cross-origin resource sharing
- **Error Handling**: Secure error messages without sensitive data exposure
- **Logging & Monitoring**: Comprehensive audit trails

### Data Protection
- **Encrypted Storage**: Sensitive data encryption at rest
- **Secure Transmission**: HTTPS/TLS for all communications
- **Privacy Compliance**: GDPR-ready data handling
- **Data Retention**: Configurable data retention policies

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Create a Pull Request

## License

MIT License - see LICENSE file for details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/DevNathanHub/AgriBot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DevNathanHub/AgriBot/discussions)
- **Email**: ai@loopnet.tech
- **Telegram**: [@agri_kenya](https://t.me/agri_kenya)

---

![Telegram Running](image-2.png) ![Setup Run](image-1.png) ![Setup Success](image.png) 


**Built with ❤️ for farmers worldwide** including my **Beloved Mum ❤️** 🌾
