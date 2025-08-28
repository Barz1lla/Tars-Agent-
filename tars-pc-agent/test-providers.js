const TarsClient = require('./src/shared/tarsClient');
const config = require('./config/settings.json');
const logger = require('./src/shared/logger');

async function testProviders() {
    console.log('🚀 Testing TARS Multi-Provider System...\n');
    
    const client = new TarsClient(config);
    
    try {
        // Test connection
        console.log('1. Testing connection...');
        const testResult = await client.testConnection();
        console.log(`   ✅ ${testResult.message} via ${testResult.provider}`);
        
        // Show provider status
        console.log('\n2. Provider Status:');
        const providers = client.getProviderStatus();
        Object.entries(providers).forEach(([key, provider]) => {
            console.log(`   ${provider.name}: ${provider.status} (${provider.responseTime || 'N/A'}ms)`);
        });
        
        // Test actual content analysis
        console.log('\n3. Testing content analysis...');
        const testContent = "This is a test document about AI and machine learning innovations.";
        const result = await client.analyzeContent(testContent, 'technical');
        
        console.log(`   ✅ Analysis complete via ${result.provider}`);
        console.log(`   📊 Tokens used: ${result.usage.total_tokens || 0}`);
        console.log(`   🎯 Response preview: ${result.text.substring(0, 200)}...`);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testProviders();