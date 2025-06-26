# SSL Certificate Setup for NestJS App on Hetzner

This guide will help you set up SSL certificates for your NestJS application hosted on Hetzner using Let's Encrypt.

## Prerequisites

- A domain name pointing to your Hetzner server
- SSH access to your Hetzner server
- Root or sudo privileges

## Option 1: Manual Setup with Certbot (Recommended)

### Step 1: Run the SSL Setup Script

```bash
# Make the script executable
chmod +x ssl-setup.sh

# Run the setup script
./ssl-setup.sh
```

### Step 2: Configure Your Domain

1. Edit the Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/nestjs-app
```

2. The domain is already configured as `crx-platform.vercel.app`.

### Step 3: Obtain SSL Certificate

```bash
# Replace with your actual email
sudo certbot --nginx -d crx-platform.vercel.app -d www.crx-platform.vercel.app
```

### Step 4: Test SSL Configuration

```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Option 2: Docker Compose Setup

### Step 1: Configure Environment Variables

1. Copy the environment example:

```bash
cp env.example .env
```

2. Edit `.env` with your actual values:

```bash
nano .env
```

### Step 2: Update Configuration Files

1. The `nginx.conf` is already configured for `crx-platform.vercel.app`
2. Update `docker-compose.ssl.yml`:
   - Replace `your-email@example.com` with your email

### Step 3: Deploy with SSL

```bash
# Start the services
docker-compose -f docker-compose.ssl.yml up -d

# Check logs
docker-compose -f docker-compose.ssl.yml logs -f
```

## Automatic Certificate Renewal

### Set up Cron Job

```bash
# Make the renewal script executable
chmod +x ssl-renewal.sh

# Add to crontab (runs twice daily)
sudo crontab -e
```

Add this line to crontab:

```
0 0,12 * * * /path/to/your/ssl-renewal.sh >> /var/log/ssl-renewal.log 2>&1
```

## Security Best Practices

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (for Let's Encrypt)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. SSL Security Headers

The Nginx configuration includes security headers:

- HSTS (HTTP Strict Transport Security)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy

### 3. Rate Limiting

The configuration includes rate limiting to prevent abuse:

- 10 requests per second per IP
- Burst allowance of 20 requests

## Troubleshooting

### Common Issues

1. **Certificate not found**:

   ```bash
   sudo certbot certificates
   ```

2. **Nginx configuration errors**:

   ```bash
   sudo nginx -t
   ```

3. **Certificate renewal fails**:
   ```bash
   sudo certbot renew --dry-run
   ```

### Logs

- Nginx logs: `/var/log/nginx/`
- Certbot logs: `/var/log/letsencrypt/`
- Application logs: Check your application logs

### SSL Testing

Test your SSL configuration:

- [SSL Labs](https://www.ssllabs.com/ssltest/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

## Monitoring

### Certificate Expiry Monitoring

Add this to your monitoring system:

```bash
# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/crx-platform.vercel.app/cert.pem -text -noout | grep "Not After"
```

### Health Check Endpoint

Your NestJS app should have a health check endpoint:

```typescript
@Get('health')
getHealth() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}
```

## Backup

### Backup SSL Certificates

```bash
# Create backup directory
sudo mkdir -p /backup/ssl

# Backup certificates
sudo cp -r /etc/letsencrypt/live/crx-platform.vercel.app /backup/ssl/
sudo cp -r /etc/letsencrypt/archive/crx-platform.vercel.app /backup/ssl/
```

## Support

If you encounter issues:

1. Check the logs mentioned above
2. Verify domain DNS settings
3. Ensure ports 80 and 443 are open
4. Check firewall settings

## Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
