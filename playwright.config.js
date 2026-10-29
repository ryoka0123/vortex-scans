const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:'./tests',workers:1,use:{baseURL:'http://localhost:3001',headless:true,launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}},webServer:{command:'node server.js',url:'http://localhost:3001',env:{PORT:'3001',ADMIN_PASSWORD:'test-password',CATALOG_PATH:'data/test-catalog.json'},reuseExistingServer:false}});

