# 🌱 AgriBot - Intelligent Agricultural Assistant

An AI-powered Telegram bot designed to help farmers with intelligent agricultural guidance, weather information, market prices, and the latest agricultural news.

## 🚀 Features

### 🤖 **AI Intelligence**
- **Google Gemini AI** integration for intelligent responses
- **Natural Language Processing** for understanding farmer queries
- **Context-aware responses** based on user location and crops
- **Intent detection** for accurate agricultural guidance

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
- **RESTful API** endpoints for integration
- **MongoDB Atlas** cloud database
- **Rate limiting** and security measures
- **Comprehensive logging** with Winston
- **Hot reloading** development environment
- 🌐 **Express API**: RESTful endpoints for mini-app integration
- 🔐 **Telegram Auth**: Built-in Telegram authentication
- 📊 **Analytics Dashboard**: User engagement and agricultural insights
- 🌱 **Agricultural Intelligence**: Weather, crop advice, market prices
- 📲 **Mini-App Support**: Chat UI and user account management
- 🔔 **Smart Notifications**: Non-intrusive, value-driven updates

## Setup

1. Clone and install dependencies:
```bash
npm install
```

2. Create `.env` file with your credentials:
```env
BOT_TOKEN=your_telegram_bot_token
MONGODB_URI=your_mongodb_connection_string
PORT=3000
JWT_SECRET=your_jwt_secret
WEATHER_API_KEY=your_weather_api_key
```

3. Run setup script:
```bash
npm run setup
```

4. Start the bot:
```bash
npm start
```

For development:
```bash
npm run dev
```

## Project Structure

```
src/
├── index.js              # Main application entry
├── bot/                  # Telegram bot logic
├── api/                  # Express API routes
├── models/               # MongoDB models
├── services/             # Business logic services
├── middleware/           # Custom middleware
├── utils/                # Utility functions
├── config/               # Configuration files
└── cron/                 # Scheduled jobs
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/telegram` - Telegram authentication
- `GET /api/user/profile` - User profile
- `GET /api/agricultural/weather` - Weather data
- `GET /api/agricultural/crops` - Crop information
- `POST /api/agricultural/advice` - Get agricultural advice

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details.
