// Google Analytics 4 (GA4) Implementation for MultiLLM
// Free analytics to track user registrations, logins, and website traffic

class GoogleAnalytics {
    constructor() {
        this.GA_MEASUREMENT_ID = 'G-4JBZ534VXL'; // Your actual GA4 Measurement ID from Google Analytics
        this.initialized = false;
        this.init();
    }

    init() {
        // Only initialize if we have a valid measurement ID
        if (this.GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
            console.log('Google Analytics: Please set your GA4 Measurement ID');
            return;
        }

        // Load Google Analytics 4 script
        this.loadGA4Script();
        this.initialized = true;
    }

    loadGA4Script() {
        // Avoid inline script to satisfy CSP. Provide a minimal bootstrap without inline JS.
        if (!window.dataLayer) {
            window.dataLayer = [];
        }
        if (!window.gtag) {
            window.gtag = function(){ window.dataLayer.push(arguments); };
        }
        // Pre-queue initial events before library loads
        window.gtag('js', new Date());
        window.gtag('config', this.GA_MEASUREMENT_ID, {
            enhanced_measurement: true
        });
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${this.GA_MEASUREMENT_ID}`;
        document.head.appendChild(script);
    }

    // Track user registration
    trackUserRegistration(method = 'email') {
        if (!this.initialized) return;
        
        gtag('event', 'sign_up', {
            method: method, // 'email', 'google', etc.
            event_category: 'Authentication',
            event_label: 'User Registration',
            custom_parameters: {
                registration_method: method,
                timestamp: new Date().toISOString()
            }
        });
        
        console.log('GA4: User registration tracked', method);
    }

    // Track user login
    trackUserLogin(method = 'email') {
        if (!this.initialized) return;
        
        gtag('event', 'login', {
            method: method, // 'email', 'google', etc.
            event_category: 'Authentication',
            event_label: 'User Login',
            custom_parameters: {
                login_method: method,
                timestamp: new Date().toISOString()
            }
        });
        
        console.log('GA4: User login tracked', method);
    }

    // Track user logout
    trackUserLogout() {
        if (!this.initialized) return;
        
        gtag('event', 'logout', {
            event_category: 'Authentication',
            event_label: 'User Logout',
            custom_parameters: {
                timestamp: new Date().toISOString()
            }
        });
        
        console.log('GA4: User logout tracked');
    }

    // Track AI chat interactions
    trackChatMessage(modelUsed, responseTime) {
        if (!this.initialized) return;
        
        gtag('event', 'chat_interaction', {
            event_category: 'AI Chat',
            event_label: `Model: ${modelUsed}`,
            value: Math.round(responseTime), // Response time in milliseconds
            custom_parameters: {
                ai_model: modelUsed,
                response_time_ms: responseTime,
                timestamp: new Date().toISOString()
            }
        });
    }

    // Track file uploads to knowledge base
    trackFileUpload(fileType, fileSize) {
        if (!this.initialized) return;
        
        gtag('event', 'file_upload', {
            event_category: 'Knowledge Base',
            event_label: `File Type: ${fileType}`,
            value: Math.round(fileSize / 1024), // File size in KB
            custom_parameters: {
                file_type: fileType,
                file_size_kb: Math.round(fileSize / 1024),
                timestamp: new Date().toISOString()
            }
        });
    }

    // Track page views (automatically handled by GA4, but can be customized)
    trackPageView(pageName) {
        if (!this.initialized) return;
        
        gtag('event', 'page_view', {
            page_title: pageName,
            page_location: window.location.href,
            custom_parameters: {
                page_name: pageName,
                timestamp: new Date().toISOString()
            }
        });
    }

    // Track user engagement time on different features
    trackFeatureUsage(featureName, engagementTime) {
        if (!this.initialized) return;
        
        gtag('event', 'feature_usage', {
            event_category: 'User Engagement',
            event_label: featureName,
            value: Math.round(engagementTime), // Time in seconds
            custom_parameters: {
                feature: featureName,
                engagement_seconds: Math.round(engagementTime),
                timestamp: new Date().toISOString()
            }
        });
    }

    // Track conversion goals (e.g., first successful AI chat)
    trackConversion(conversionType) {
        if (!this.initialized) return;
        
        gtag('event', 'conversion', {
            event_category: 'Conversions',
            event_label: conversionType,
            custom_parameters: {
                conversion_type: conversionType,
                timestamp: new Date().toISOString()
            }
        });
    }

    // Set user properties (for better user segmentation)
    setUserProperties(userId, properties = {}) {
        if (!this.initialized) return;
        
        gtag('config', this.GA_MEASUREMENT_ID, {
            user_id: userId,
            custom_map: properties
        });
    }
}

// Initialize Google Analytics
const analytics = new GoogleAnalytics();

// Export for use in other files
window.analytics = analytics;

// Auto-track page views when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const pageName = document.title || window.location.pathname;
    analytics.trackPageView(pageName);
});

// Export the class for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleAnalytics;
}
