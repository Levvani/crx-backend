#!/bin/bash

# SSL Certificate Renewal Script
# This script should be run via cron job to automatically renew certificates

set -e

echo "🔄 Starting SSL certificate renewal process..."

# Check if certificates need renewal
if certbot renew --dry-run; then
    echo "✅ Certificates are valid and don't need renewal"
else
    echo "🔄 Renewing certificates..."
    certbot renew --quiet
    
    # Reload Nginx to use new certificates
    echo "🔄 Reloading Nginx..."
    systemctl reload nginx
    
    echo "✅ Certificate renewal completed successfully"
fi

echo "📅 Next renewal check: $(date -d '+60 days' '+%Y-%m-%d')" 