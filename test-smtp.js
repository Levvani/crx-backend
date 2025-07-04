#!/usr/bin/env node

/**
 * SMTP Configuration Test Script
 * 
 * This script helps you test your SMTP configuration before running the main application.
 * Run with: node test-smtp.js
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testSmtpConfig() {
  console.log('🔧 Testing SMTP Configuration...\n');

  // Check environment variables
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease check your .env file.');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log('📋 Configuration:');
  console.log(`   Host: ${process.env.SMTP_HOST}`);
  console.log(`   Port: ${process.env.SMTP_PORT}`);
  console.log(`   Secure: ${process.env.SMTP_SECURE || 'false'}`);
  console.log(`   User: ${process.env.SMTP_USER}`);
  console.log(`   Password: ${'*'.repeat(process.env.SMTP_PASS.length)}\n`);

  // Create transporter with the same config as the app
  const port = parseInt(process.env.SMTP_PORT);
  const isSecure = process.env.SMTP_SECURE === 'true';
  
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: port,
    secure: isSecure,
    requireTLS: !isSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      minVersion: 'TLSv1.2',
      ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA'
    },
    connectionTimeout: 60000,
    socketTimeout: 60000,
    debug: true,
    logger: true,
  });

  try {
    console.log('🔌 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    // Send test email
    const testEmail = process.env.SMTP_USER; // Send to self for testing
    console.log(`📧 Sending test email to ${testEmail}...`);
    
    const info = await transporter.sendMail({
      from: `"CRX Platform Test" <${process.env.SMTP_USER}>`,
      to: testEmail,
      subject: 'SMTP Configuration Test - Success!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #28a745;">✅ SMTP Configuration Test Successful!</h2>
          <p>Congratulations! Your SMTP configuration is working correctly.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>Configuration Details:</h3>
            <ul>
              <li><strong>Host:</strong> ${process.env.SMTP_HOST}</li>
              <li><strong>Port:</strong> ${process.env.SMTP_PORT}</li>
              <li><strong>Secure:</strong> ${process.env.SMTP_SECURE || 'false'}</li>
              <li><strong>User:</strong> ${process.env.SMTP_USER}</li>
            </ul>
          </div>
          <p>You can now run your CRX Platform application with confidence!</p>
          <hr>
          <small style="color: #666;">
            This is a test email from the CRX Platform SMTP configuration test script.
            <br>Generated at: ${new Date().toISOString()}
          </small>
        </div>
      `,
    });

    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    if (info.response) {
      console.log(`   Server Response: ${info.response}`);
    }
    
    console.log('\n🎉 SMTP configuration test completed successfully!');
    console.log('You can now run your application with: npm run start:dev');
    
  } catch (error) {
    console.error('❌ SMTP test failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    
    if (error.command) {
      console.error(`   Command: ${error.command}`);
    }

    console.error('\n🔧 Troubleshooting suggestions:');
    
    if (error.message.includes('wrong version number')) {
      console.error('   - Check SMTP_SECURE setting:');
      console.error('     • For port 587: SMTP_SECURE=false');
      console.error('     • For port 465: SMTP_SECURE=true');
    }
    
    if (error.message.includes('authentication') || error.message.includes('login')) {
      console.error('   - Verify your username and password');
      console.error('   - For Gmail: Use App Passwords, not regular password');
      console.error('   - Enable 2FA and generate App Password in Google Account settings');
    }
    
    if (error.message.includes('connection') || error.message.includes('timeout')) {
      console.error('   - Check your internet connection');
      console.error('   - Verify SMTP host and port are correct');
      console.error('   - Check if your hosting provider blocks SMTP ports');
    }
    
    console.error('\n📖 For detailed configuration help, see: SMTP_SETUP.md');
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testSmtpConfig().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { testSmtpConfig }; 