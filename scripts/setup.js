const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const logger = require('../src/utils/logger');
const { connectDB } = require('../src/config/database');
const User = require('../src/models/User');
const AgriculturalData = require('../src/models/AgriculturalData');

async function setupDatabase() {
    try {
        console.log('🔧 Setting up AgriBot database...');

        // Connect to MongoDB
        await connectDB();

        // Create sample agricultural data
        console.log('📊 Creating sample agricultural data...');
        
        const sampleWeatherData = {
            weather: {
                location: {
                    country: 'US',
                    state: 'Iowa',
                    city: 'Des Moines',
                    coordinates: {
                        latitude: 41.5868,
                        longitude: -93.6250
                    }
                },
                current: {
                    temperature: 22,
                    humidity: 65,
                    pressure: 1013,
                    windSpeed: 15,
                    windDirection: 270,
                    visibility: 10,
                    uvIndex: 6,
                    condition: 'partly cloudy',
                    icon: '02d'
                },
                forecast: [
                    {
                        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
                        tempMax: 25,
                        tempMin: 18,
                        humidity: 70,
                        precipitation: 2.5,
                        precipitationChance: 60,
                        windSpeed: 12,
                        condition: 'light rain',
                        icon: '10d'
                    }
                ]
            },
            dataSource: 'setup-script',
            lastUpdated: new Date()
        };

        const sampleMarketData = {
            marketPrices: [
                {
                    crop: 'wheat',
                    variety: 'hard red winter',
                    market: 'Chicago',
                    location: { country: 'US', state: 'Illinois', city: 'Chicago' },
                    price: { value: 285, currency: 'USD', unit: 'per bushel' },
                    priceChange: { percentage: 3, direction: 'up' },
                    quality: 'Grade 1',
                    date: new Date()
                },
                {
                    crop: 'corn',
                    variety: 'yellow dent',
                    market: 'Chicago',
                    location: { country: 'US', state: 'Illinois', city: 'Chicago' },
                    price: { value: 195, currency: 'USD', unit: 'per bushel' },
                    priceChange: { percentage: 1, direction: 'down' },
                    quality: 'Grade 2',
                    date: new Date()
                }
            ],
            dataSource: 'setup-script',
            lastUpdated: new Date()
        };

        const sampleCropsData = {
            crops: [
                {
                    name: 'wheat',
                    scientificName: 'Triticum aestivum',
                    category: 'cereal',
                    varieties: ['hard red winter', 'soft red winter', 'hard red spring'],
                    growingConditions: {
                        climate: 'temperate',
                        soilType: ['loam', 'clay loam'],
                        phRange: { min: 6.0, max: 7.5 },
                        temperature: { min: 3, max: 32 },
                        rainfall: { min: 300, max: 750 }
                    },
                    plantingInfo: {
                        season: ['fall', 'spring'],
                        sowingTime: 'September-November',
                        harvestTime: 'July-August',
                        seedRate: '90-120 kg/ha',
                        spacing: '15-20 cm rows',
                        depth: '2-3 cm'
                    },
                    commonDiseases: [
                        {
                            name: 'rust',
                            symptoms: ['orange pustules on leaves', 'yellowing'],
                            prevention: ['resistant varieties', 'crop rotation'],
                            treatment: ['fungicide application']
                        }
                    ]
                },
                {
                    name: 'corn',
                    scientificName: 'Zea mays',
                    category: 'cereal',
                    varieties: ['sweet corn', 'field corn', 'popcorn'],
                    growingConditions: {
                        climate: 'warm temperate',
                        soilType: ['loam', 'sandy loam'],
                        phRange: { min: 6.0, max: 6.8 },
                        temperature: { min: 10, max: 35 },
                        rainfall: { min: 500, max: 800 }
                    },
                    plantingInfo: {
                        season: ['spring', 'summer'],
                        sowingTime: 'April-June',
                        harvestTime: 'September-November',
                        seedRate: '20-25 kg/ha',
                        spacing: '75 cm rows',
                        depth: '3-5 cm'
                    },
                    commonDiseases: [
                        {
                            name: 'corn borer',
                            symptoms: ['holes in stalks', 'broken tassels'],
                            prevention: ['resistant varieties', 'proper timing'],
                            treatment: ['biological control', 'insecticides']
                        }
                    ]
                }
            ],
            dataSource: 'setup-script',
            lastUpdated: new Date()
        };

        const sampleTipsData = {
            tips: [
                {
                    title: 'Optimal Watering Times',
                    content: 'Water your crops early in the morning (6-8 AM) or late evening (6-8 PM) to minimize evaporation and reduce fungal diseases. This timing allows plants to absorb water efficiently.',
                    category: 'watering',
                    applicableSeasons: ['summer', 'spring'],
                    applicableCrops: ['wheat', 'corn', 'rice'],
                    priority: 'high',
                    tags: ['irrigation', 'timing', 'water management'],
                    verified: true,
                    likes: 45,
                    views: 230
                },
                {
                    title: 'Crop Rotation Benefits',
                    content: 'Implement a 3-4 year crop rotation cycle to improve soil health, reduce pest pressure, and increase yields. Alternate between nitrogen-fixing legumes and nitrogen-consuming cereals.',
                    category: 'soil_management',
                    applicableSeasons: ['all'],
                    applicableCrops: ['wheat', 'corn', 'soybeans'],
                    priority: 'medium',
                    tags: ['sustainability', 'soil health', 'pest management'],
                    verified: true,
                    likes: 67,
                    views: 340
                },
                {
                    title: 'Early Disease Detection',
                    content: 'Scout your fields weekly during growing season. Look for unusual leaf discoloration, wilting, or growth abnormalities. Early detection allows for more effective treatment options.',
                    category: 'disease_management',
                    applicableSeasons: ['spring', 'summer'],
                    applicableCrops: ['wheat', 'corn', 'vegetables'],
                    priority: 'high',
                    tags: ['monitoring', 'disease prevention', 'crop health'],
                    verified: true,
                    likes: 52,
                    views: 280
                }
            ],
            dataSource: 'setup-script',
            lastUpdated: new Date()
        };

        const sampleNewsData = {
            news: [
                {
                    title: 'New Drought-Resistant Wheat Varieties Show Promise',
                    summary: 'Recent field trials demonstrate 15% higher yields under water stress conditions',
                    content: 'Scientists have developed new wheat varieties that maintain productivity even under drought conditions...',
                    source: 'AgriResearch Today',
                    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
                    category: 'research',
                    relevantLocations: ['US', 'Australia', 'Argentina'],
                    relevantCrops: ['wheat'],
                    priority: 'high'
                },
                {
                    title: 'Corn Prices Rise on Export Demand',
                    summary: 'Strong international demand pushes corn futures up 5% this week',
                    content: 'Corn prices have seen significant gains this week due to increased export demand from Asia...',
                    source: 'Market Watch Agriculture',
                    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
                    category: 'market',
                    relevantLocations: ['US', 'Brazil', 'Argentina'],
                    relevantCrops: ['corn'],
                    priority: 'medium'
                }
            ],
            dataSource: 'setup-script',
            lastUpdated: new Date()
        };

        // Save sample data
        await AgriculturalData.create([
            sampleWeatherData,
            sampleMarketData,
            sampleCropsData,
            sampleTipsData,
            sampleNewsData
        ]);

        console.log('✅ Sample agricultural data created successfully');

        // Create admin user if specified
        if (process.env.ADMIN_USER_IDS) {
            const adminIds = process.env.ADMIN_USER_IDS.split(',').map(id => parseInt(id.trim()));
            
            for (const adminId of adminIds) {
                const existingAdmin = await User.findOne({ telegramId: adminId });
                
                if (!existingAdmin) {
                    const adminUser = new User({
                        telegramId: adminId,
                        firstName: 'Admin',
                        lastName: 'User',
                        username: `admin_${adminId}`,
                        permissions: {
                            isAdmin: true,
                            isModerator: true
                        },
                        subscription: {
                            type: 'pro'
                        }
                    });
                    
                    await adminUser.save();
                    console.log(`👤 Created admin user: ${adminId}`);
                } else {
                    // Update existing user to admin
                    existingAdmin.permissions.isAdmin = true;
                    existingAdmin.permissions.isModerator = true;
                    existingAdmin.subscription.type = 'pro';
                    await existingAdmin.save();
                    console.log(`👤 Updated existing user to admin: ${adminId}`);
                }
            }
        }

        console.log('🎉 Database setup completed successfully!');
        console.log('\n📋 Setup Summary:');
        console.log('- Sample weather data added');
        console.log('- Sample market prices added');
        console.log('- Sample crop information added');
        console.log('- Sample agricultural tips added');
        console.log('- Sample news articles added');
        if (process.env.ADMIN_USER_IDS) {
            console.log('- Admin users configured');
        }
        console.log('\n🚀 You can now start the bot with: npm start');

    } catch (error) {
        console.error('❌ Database setup failed:', error);
        logger.error('Database setup failed:', error);
        throw error;
    }
}

async function main() {
    try {
        console.log('🌱 AgriBot Setup Script');
        console.log('======================\n');

        // Check environment variables
        console.log('🔍 Checking environment variables...');
        
        const requiredEnvVars = ['BOT_TOKEN', 'MONGODB_URI', 'JWT_SECRET'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.error('❌ Missing required environment variables:');
            missingVars.forEach(varName => console.error(`   - ${varName}`));
            console.log('\nPlease create a .env file based on .env.example');
            process.exit(1);
        }
        
        console.log('✅ Environment variables check passed');

        // Create directories
        console.log('\n📁 Creating directories...');
        const directories = ['logs', 'public', 'public/uploads'];
        
        directories.forEach(dir => {
            const dirPath = path.join(__dirname, '..', dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`   ✅ Created ${dir}/`);
            } else {
                console.log(`   ⚠️  ${dir}/ already exists`);
            }
        });

        // Setup database
        await setupDatabase();

        // Close database connection
        await mongoose.connection.close();
        
        console.log('\n🎯 Next Steps:');
        console.log('1. Start the bot: npm start');
        console.log('2. Test the bot in Telegram');
        console.log('3. Visit the API at http://localhost:3000/api');
        console.log('\n💡 Pro Tips:');
        console.log('- Use /help command in Telegram to see available features');
        console.log('- Check logs/ directory for application logs');
        console.log('- API documentation available at /api endpoint');
        
        process.exit(0);

    } catch (error) {
        console.error('\n💥 Setup failed:', error.message);
        process.exit(1);
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = { setupDatabase };
