#!/bin/bash

echo "🌱 AgriBot System Status"
echo "======================="
echo ""

# Check if the bot process is running
if pgrep -f "node src/index.js" > /dev/null; then
    echo "✅ AgriBot process is running"
    echo "   Process ID: $(pgrep -f "node src/index.js")"
else
    echo "❌ AgriBot process is not running"
fi

echo ""

# Check if port 3000 is listening
if netstat -ln 2>/dev/null | grep -q ":3000 "; then
    echo "✅ Express server listening on port 3000"
elif lsof -i :3000 2>/dev/null | grep -q LISTEN; then
    echo "✅ Express server listening on port 3000"
else
    echo "❌ No service listening on port 3000"
fi

echo ""

# Check log files
echo "📋 Recent log entries:"
if [ -f "logs/agribot.log" ]; then
    echo "   $(tail -3 logs/agribot.log | grep -E "(MongoDB|server|bot)" | tail -1)"
else
    echo "   No log file found yet"
fi

echo ""

# Show environment status
echo "🔧 Configuration Status:"
if [ -f ".env" ]; then
    echo "   ✅ Environment file exists"
    if grep -q "BOT_TOKEN=.*" .env && ! grep -q "BOT_TOKEN=YOUR_BOT_TOKEN" .env; then
        echo "   ✅ Bot token configured"
    else
        echo "   ⚠️  Bot token needs configuration"
    fi
    
    if grep -q "mongodb+srv://" .env; then
        echo "   ✅ MongoDB Atlas URI configured"
    else
        echo "   ⚠️  MongoDB URI needs configuration"
    fi
else
    echo "   ❌ No .env file found"
fi

echo ""
echo "🚀 Your AgriBot Features:"
echo "   • Intelligent Agricultural Assistant"
echo "   • Weather Updates & Forecasts"
echo "   • Market Price Tracking"
echo "   • Crop Management Advice"
echo "   • Scheduled Notifications"
echo "   • RESTful API for Mini-Apps"
echo "   • User Profile Management"
echo "   • Multi-language Support"
echo "   • Rate Limiting & Security"

echo ""
echo "📱 Next Steps:"
echo "   1. Open Telegram and search for your bot"
echo "   2. Send /start to begin using the bot"
echo "   3. Use /help to see all available commands"
echo "   4. Set up your agricultural profile"
echo "   5. Integrate with mini-apps using the API"
