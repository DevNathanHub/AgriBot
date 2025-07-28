const axios = require('axios');
const logger = require('../utils/logger');

class NewsService {
    constructor() {
        this.apiKey = process.env.GNEWS_API_KEY;
        this.baseURL = process.env.GNEWS_URL || 'https://gnews.io/api/v4/';
    }

    async getAgriculturalNews(query = 'agriculture farming crops', max = 10, lang = 'en') {
        try {
            const url = `${this.baseURL}search?q=${encodeURIComponent(query)}&lang=${lang}&max=${max}&apikey=${this.apiKey}`;
            
            logger.info(`Fetching agricultural news: ${query}`);
            
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'AgriBot/1.0'
                }
            });

            if (response.data && response.data.articles) {
                const articles = response.data.articles.map(article => ({
                    title: article.title,
                    description: article.description,
                    url: article.url,
                    publishedAt: article.publishedAt,
                    source: article.source?.name || 'Unknown',
                    image: article.image
                }));

                logger.info(`Successfully fetched ${articles.length} news articles`);
                return {
                    success: true,
                    articles: articles,
                    totalResults: response.data.totalArticles || articles.length
                };
            }

            return {
                success: false,
                error: 'No articles found',
                articles: []
            };

        } catch (error) {
            logger.error('Error fetching news:', error.message);
            
            if (error.response) {
                // API responded with error status
                const status = error.response.status;
                const message = error.response.data?.message || 'API Error';
                
                if (status === 403) {
                    return {
                        success: false,
                        error: 'API key invalid or quota exceeded',
                        articles: []
                    };
                } else if (status === 429) {
                    return {
                        success: false,
                        error: 'Rate limit exceeded',
                        articles: []
                    };
                }
                
                return {
                    success: false,
                    error: `API Error: ${message}`,
                    articles: []
                };
            }

            return {
                success: false,
                error: 'Network error or service unavailable',
                articles: []
            };
        }
    }

    async getLatestAgriculturalNews() {
        const agriculturalQueries = [
            'agriculture farming crops Kenya',
            'agricultural technology farming innovation',
            'crop prices market agriculture',
            'sustainable farming organic agriculture',
            'weather agriculture climate farming'
        ];

        const randomQuery = agriculturalQueries[Math.floor(Math.random() * agriculturalQueries.length)];
        return await this.getAgriculturalNews(randomQuery, 5);
    }

    async getNewsByCategory(category = 'general') {
        const categoryQueries = {
            'crops': 'crop production harvest planting farming',
            'technology': 'agricultural technology farm innovation AgTech',
            'market': 'agricultural market prices commodity trading',
            'weather': 'weather agriculture climate farming drought',
            'sustainability': 'sustainable farming organic agriculture environment',
            'livestock': 'livestock cattle dairy poultry farming',
            'irrigation': 'irrigation water management farming drought',
            'general': 'agriculture farming crops livestock'
        };

        const query = categoryQueries[category] || categoryQueries['general'];
        return await this.getAgriculturalNews(query, 8);
    }

    formatNewsForTelegram(articles, maxArticles = 5) {
        if (!articles || articles.length === 0) {
            return '📰 No recent agricultural news available at the moment.';
        }

        let message = '📰 *Latest Agricultural News*\n\n';
        
        const articlesToShow = articles.slice(0, maxArticles);
        
        articlesToShow.forEach((article, index) => {
            const publishedDate = new Date(article.publishedAt).toLocaleDateString();
            
            message += `*${index + 1}. ${article.title}*\n`;
            
            if (article.description) {
                // Truncate description if too long
                const description = article.description.length > 100 
                    ? article.description.substring(0, 100) + '...' 
                    : article.description;
                message += `${description}\n`;
            }
            
            message += `📅 ${publishedDate} | 🏢 ${article.source}\n`;
            message += `🔗 [Read more](${article.url})\n\n`;
        });

        message += `_Total articles: ${articles.length}_`;
        
        return message;
    }

    async getTopHeadlines(country = 'ke') {
        try {
            const url = `${this.baseURL}top-headlines?country=${country}&category=general&apikey=${this.apiKey}`;
            
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'AgriBot/1.0'
                }
            });

            if (response.data && response.data.articles) {
                // Filter for agriculture-related headlines
                const agricultureArticles = response.data.articles.filter(article => {
                    const content = (article.title + ' ' + article.description).toLowerCase();
                    return content.includes('farm') || 
                           content.includes('agriculture') || 
                           content.includes('crop') || 
                           content.includes('livestock') ||
                           content.includes('food') ||
                           content.includes('rural');
                });

                return {
                    success: true,
                    articles: agricultureArticles.map(article => ({
                        title: article.title,
                        description: article.description,
                        url: article.url,
                        publishedAt: article.publishedAt,
                        source: article.source?.name || 'Unknown',
                        image: article.image
                    }))
                };
            }

            return {
                success: false,
                error: 'No headlines found',
                articles: []
            };

        } catch (error) {
            logger.error('Error fetching headlines:', error.message);
            return {
                success: false,
                error: 'Failed to fetch headlines',
                articles: []
            };
        }
    }
}

module.exports = new NewsService();
