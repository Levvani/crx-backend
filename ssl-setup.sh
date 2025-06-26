#!/bin/bash

# SSL Certificate Setup Script for NestJS App on Hetzner
# This script sets up Let's Encrypt SSL certificates using Certbot

set -e

echo "🚀 Starting SSL certificate setup for your NestJS application..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Certbot and Nginx
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
echo "Please replace YOUR_DOMAIN.com with your actual domain name in the command below:"
echo "sudo certbot --nginx -d crx-platform.vercel.app -d www.crx-platform.vercel.app"

# Instructions for manual certificate generation
echo ""
echo "📋 Manual Steps Required:"
echo "1. Replace YOUR_DOMAIN.com with your actual domain name in the Nginx config"
echo "2. Make sure your domain points to this server's IP address"
echo "3. Run: sudo certbot --nginx -d crx-platform.vercel.app -d www.crx-platform.vercel.app"
echo "4. Follow the prompts to complete SSL setup"
echo ""
echo "✅ SSL setup script completed!" 