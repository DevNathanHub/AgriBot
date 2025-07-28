// Generate inline keyboard for Telegram
function generateInlineKeyboard(buttons) {
    return {
        inline_keyboard: buttons
    };
}

// Generate reply keyboard for Telegram
function generateReplyKeyboard(buttons, options = {}) {
    return {
        keyboard: buttons,
        resize_keyboard: options.resize !== false,
        one_time_keyboard: options.oneTime || false,
        selective: options.selective || false
    };
}

// Predefined keyboards
const keyboards = {
    // Main menu keyboard
    mainMenu: () => generateInlineKeyboard([
        [
            { text: '🌤️ Weather', callback_data: 'weather' },
            { text: '📊 Market', callback_data: 'market' }
        ],
        [
            { text: '🌾 Advice', callback_data: 'advice' },
            { text: '👤 Profile', callback_data: 'profile' }
        ],
        [
            { text: '⚙️ Settings', callback_data: 'settings' },
            { text: '❓ Help', callback_data: 'help' }
        ]
    ]),

    // Weather options
    weatherOptions: () => generateInlineKeyboard([
        [
            { text: '🌤️ Current Weather', callback_data: 'weather:current' },
            { text: '📅 5-Day Forecast', callback_data: 'weather:forecast' }
        ],
        [
            { text: '🌾 Agricultural Weather', callback_data: 'weather:agricultural' },
            { text: '🚨 Weather Alerts', callback_data: 'weather:alerts' }
        ],
        [
            { text: '🔙 Back to Menu', callback_data: 'main_menu' }
        ]
    ]),

    // Market options
    marketOptions: () => generateInlineKeyboard([
        [
            { text: '💰 Current Prices', callback_data: 'market:prices' },
            { text: '📈 Price Trends', callback_data: 'market:trends' }
        ],
        [
            { text: '📰 Market News', callback_data: 'market:news' },
            { text: '🚨 Price Alerts', callback_data: 'market:alerts' }
        ],
        [
            { text: '🔙 Back to Menu', callback_data: 'main_menu' }
        ]
    ]),

    // Crop selection
    cropSelection: () => generateInlineKeyboard([
        [
            { text: '🌾 Wheat', callback_data: 'crop:wheat' },
            { text: '🌽 Corn', callback_data: 'crop:corn' }
        ],
        [
            { text: '🍚 Rice', callback_data: 'crop:rice' },
            { text: '🫘 Soybeans', callback_data: 'crop:soybeans' }
        ],
        [
            { text: '🌿 Cotton', callback_data: 'crop:cotton' },
            { text: '🍅 Vegetables', callback_data: 'crop:vegetables' }
        ],
        [
            { text: '🍎 Fruits', callback_data: 'crop:fruits' },
            { text: '🌱 Other', callback_data: 'crop:other' }
        ],
        [
            { text: '✅ Done', callback_data: 'crop_selection:done' }
        ]
    ]),

    // Advice categories
    adviceCategories: () => generateInlineKeyboard([
        [
            { text: '🌱 Planting', callback_data: 'advice:planting' },
            { text: '💧 Irrigation', callback_data: 'advice:irrigation' }
        ],
        [
            { text: '🌿 Fertilizers', callback_data: 'advice:fertilizers' },
            { text: '🐛 Pest Control', callback_data: 'advice:pest_control' }
        ],
        [
            { text: '🦠 Disease Management', callback_data: 'advice:disease' },
            { text: '🌾 Harvesting', callback_data: 'advice:harvesting' }
        ],
        [
            { text: '♻️ Sustainability', callback_data: 'advice:sustainability' },
            { text: '🔧 Technology', callback_data: 'advice:technology' }
        ],
        [
            { text: '🔙 Back to Menu', callback_data: 'main_menu' }
        ]
    ]),

    // Profile options
    profileOptions: () => generateInlineKeyboard([
        [
            { text: '✏️ Edit Profile', callback_data: 'profile:edit' },
            { text: '📍 Update Location', callback_data: 'profile:location' }
        ],
        [
            { text: '🌾 Update Crops', callback_data: 'profile:crops' },
            { text: '🎯 Set Interests', callback_data: 'profile:interests' }
        ],
        [
            { text: '🔙 Back to Menu', callback_data: 'main_menu' }
        ]
    ]),

    // Settings options
    settingsOptions: () => generateInlineKeyboard([
        [
            { text: '🔔 Notifications', callback_data: 'settings:notifications' },
            { text: '🌐 Language', callback_data: 'settings:language' }
        ],
        [
            { text: '⏰ Update Times', callback_data: 'settings:times' },
            { text: '🎛️ Preferences', callback_data: 'settings:preferences' }
        ],
        [
            { text: '🔙 Back to Menu', callback_data: 'main_menu' }
        ]
    ]),

    // Notification settings
    notificationSettings: (user) => {
        const settings = user.botData?.notificationSettings || {};
        return generateInlineKeyboard([
            [
                { 
                    text: `🌤️ Weather ${settings.weather ? '✅' : '❌'}`, 
                    callback_data: 'toggle:weather' 
                },
                { 
                    text: `📊 Market ${settings.marketPrices ? '✅' : '❌'}`, 
                    callback_data: 'toggle:market' 
                }
            ],
            [
                { 
                    text: `💡 Tips ${settings.tips ? '✅' : '❌'}`, 
                    callback_data: 'toggle:tips' 
                },
                { 
                    text: `🚨 Alerts ${settings.alerts ? '✅' : '❌'}`, 
                    callback_data: 'toggle:alerts' 
                }
            ],
            [
                { text: '🔙 Back to Settings', callback_data: 'settings' }
            ]
        ]);
    },

    // Language selection
    languageSelection: () => generateInlineKeyboard([
        [
            { text: '🇺🇸 English', callback_data: 'lang:en' },
            { text: '🇪🇸 Español', callback_data: 'lang:es' }
        ],
        [
            { text: '🇫🇷 Français', callback_data: 'lang:fr' },
            { text: '🇩🇪 Deutsch', callback_data: 'lang:de' }
        ],
        [
            { text: '🇮🇳 हिंदी', callback_data: 'lang:hi' },
            { text: '🇨🇳 中文', callback_data: 'lang:zh' }
        ],
        [
            { text: '🔙 Back to Settings', callback_data: 'settings' }
        ]
    ]),

    // Farming experience levels
    experienceLevels: () => generateInlineKeyboard([
        [
            { text: '🌱 Beginner', callback_data: 'experience:beginner' },
            { text: '🌾 Intermediate', callback_data: 'experience:intermediate' }
        ],
        [
            { text: '🚜 Advanced', callback_data: 'experience:advanced' },
            { text: '👨‍🌾 Expert', callback_data: 'experience:expert' }
        ]
    ]),

    // Farming types
    farmingTypes: () => generateInlineKeyboard([
        [
            { text: '🌿 Organic', callback_data: 'farming_type:organic' },
            { text: '🔬 Conventional', callback_data: 'farming_type:conventional' }
        ],
        [
            { text: '💧 Hydroponic', callback_data: 'farming_type:hydroponic' },
            { text: '🔄 Mixed', callback_data: 'farming_type:mixed' }
        ]
    ]),

    // Interests selection
    interestsSelection: () => generateInlineKeyboard([
        [
            { text: '🌤️ Weather', callback_data: 'interest:weather' },
            { text: '📊 Market Prices', callback_data: 'interest:market_prices' }
        ],
        [
            { text: '🐛 Pest Control', callback_data: 'interest:pest_control' },
            { text: '🌿 Fertilizers', callback_data: 'interest:fertilizers' }
        ],
        [
            { text: '💧 Irrigation', callback_data: 'interest:irrigation' },
            { text: '🔬 Technology', callback_data: 'interest:technology' }
        ],
        [
            { text: '♻️ Sustainability', callback_data: 'interest:sustainability' },
            { text: '✅ Done', callback_data: 'interests:done' }
        ]
    ]),

    // Subscription options
    subscriptionOptions: () => generateInlineKeyboard([
        [
            { text: '🆓 Free Plan', callback_data: 'subscription:free' },
            { text: '⭐ Premium Plan', callback_data: 'subscription:premium' }
        ],
        [
            { text: '💎 Pro Plan', callback_data: 'subscription:pro' },
            { text: '📊 Compare Plans', callback_data: 'subscription:compare' }
        ],
        [
            { text: '🔙 Back to Menu', callback_data: 'main_menu' }
        ]
    ]),

    // Feedback options
    feedbackOptions: () => generateInlineKeyboard([
        [
            { text: '⭐⭐⭐⭐⭐', callback_data: 'feedback:5' },
            { text: '⭐⭐⭐⭐', callback_data: 'feedback:4' }
        ],
        [
            { text: '⭐⭐⭐', callback_data: 'feedback:3' },
            { text: '⭐⭐', callback_data: 'feedback:2' }
        ],
        [
            { text: '⭐', callback_data: 'feedback:1' },
            { text: '📝 Write Review', callback_data: 'feedback:write' }
        ]
    ]),

    // Quick actions
    quickActions: () => generateInlineKeyboard([
        [
            { text: '🌤️ Today\'s Weather', callback_data: 'quick:weather_today' },
            { text: '📊 Market Update', callback_data: 'quick:market_update' }
        ],
        [
            { text: '💡 Random Tip', callback_data: 'quick:random_tip' },
            { text: '📰 Latest News', callback_data: 'quick:latest_news' }
        ]
    ]),

    // Confirmation buttons
    confirmation: (action) => generateInlineKeyboard([
        [
            { text: '✅ Yes', callback_data: `confirm:${action}:yes` },
            { text: '❌ No', callback_data: `confirm:${action}:no` }
        ]
    ]),

    // Back button
    backButton: (target = 'main_menu') => generateInlineKeyboard([
        [
            { text: '🔙 Back', callback_data: target }
        ]
    ]),

    // Close button
    closeButton: () => generateInlineKeyboard([
        [
            { text: '❌ Close', callback_data: 'close' }
        ]
    ])
};

// Utility functions for keyboards
function addBackButton(keyboard, target = 'main_menu') {
    const backRow = [{ text: '🔙 Back', callback_data: target }];
    keyboard.inline_keyboard.push(backRow);
    return keyboard;
}

function addCloseButton(keyboard) {
    const closeRow = [{ text: '❌ Close', callback_data: 'close' }];
    keyboard.inline_keyboard.push(closeRow);
    return keyboard;
}

function createPaginationKeyboard(currentPage, totalPages, baseCallback) {
    const buttons = [];
    
    if (currentPage > 1) {
        buttons.push({ text: '⬅️ Previous', callback_data: `${baseCallback}:${currentPage - 1}` });
    }
    
    buttons.push({ text: `${currentPage}/${totalPages}`, callback_data: 'page_info' });
    
    if (currentPage < totalPages) {
        buttons.push({ text: 'Next ➡️', callback_data: `${baseCallback}:${currentPage + 1}` });
    }

    return generateInlineKeyboard([buttons]);
}

function createCropSelectionKeyboard(selectedCrops = []) {
    const allCrops = [
        { name: 'Wheat', value: 'wheat', emoji: '🌾' },
        { name: 'Corn', value: 'corn', emoji: '🌽' },
        { name: 'Rice', value: 'rice', emoji: '🍚' },
        { name: 'Soybeans', value: 'soybeans', emoji: '🫘' },
        { name: 'Cotton', value: 'cotton', emoji: '🌿' },
        { name: 'Tomato', value: 'tomato', emoji: '🍅' },
        { name: 'Potato', value: 'potato', emoji: '🥔' },
        { name: 'Onion', value: 'onion', emoji: '🧅' }
    ];

    const buttons = [];
    for (let i = 0; i < allCrops.length; i += 2) {
        const row = [];
        for (let j = 0; j < 2 && (i + j) < allCrops.length; j++) {
            const crop = allCrops[i + j];
            const isSelected = selectedCrops.includes(crop.value);
            const text = `${crop.emoji} ${crop.name} ${isSelected ? '✅' : ''}`;
            row.push({ text, callback_data: `toggle_crop:${crop.value}` });
        }
        buttons.push(row);
    }

    buttons.push([{ text: '✅ Done', callback_data: 'crop_selection:done' }]);

    return generateInlineKeyboard(buttons);
}

module.exports = {
    generateInlineKeyboard,
    generateReplyKeyboard,
    keyboards,
    addBackButton,
    addCloseButton,
    createPaginationKeyboard,
    createCropSelectionKeyboard
};
