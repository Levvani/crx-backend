#!/bin/bash

# SSL Certificate Setup Script for NestJS App on Hetzner Ubuntu/Debian
# This script sets up Let's Encrypt SSL certificates using Certbot

set -e

echo "🚀 Starting SSL certificate setup for your NestJS application on Hetzner..."

# Check if running on Ubuntu/Debian
if ! command -v apt &> /dev/null; then
    echo "❌ This script is designed for Ubuntu/Debian systems (Hetzner servers)"
    echo "Please run this script on your Hetzner server, not on macOS"
    exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Certbot and Nginx (Ubuntu/Debian specific)
echo "🔧 Installing Certbot and Nginx..."
sudo apt install -y certbot python3-certbot-nginx nginx

# Create Nginx configuration for your domain
echo "📝 Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/nestjs-app << EOF
server {
    listen 80;
    server_name crx-platform.vercel.app www.crx-platform.vercel.app;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
echo "🔗 Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/nestjs-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

# Start Nginx
echo "🚀 Starting Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Get SSL certificate
echo "🔐 Obtaining SSL certificate from Let's Encrypt..."
echo "Running: sudo certbot --nginx -d crx-platform.vercel.app -d www.crx-platform.vercel.app"
echo "Please provide your email when prompted: levanzhvania96@gmail.com"

# Run certbot
sudo certbot --nginx -d crx-platform.vercel.app -d www.crx-platform.vercel.app

echo ""
echo "✅ SSL setup completed!"
echo "🌐 Your application should now be accessible at: https://crx-platform.vercel.app" 