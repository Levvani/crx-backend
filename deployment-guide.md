# Deployment Guide: SSL Setup for NestJS on Hetzner

## 🚨 Important: Run on Hetzner Server, Not Locally

The SSL setup scripts are designed to run on your **Hetzner Ubuntu/Debian server**, not on your local macOS machine.

## Step 1: Upload Files to Hetzner Server

### Option A: Using SCP

```bash
# Upload the SSL setup files to your Hetzner server
scp ssl-setup-hetzner.sh ssl-renewal.sh nginx.conf docker-compose.ssl.yml user@your-hetzner-ip:/home/user/
```

### Option B: Using Git

```bash
# On your Hetzner server
git clone your-repository
cd your-repository
```

## Step 2: Deploy Your NestJS Application

### Option A: Direct Deployment

```bash
# On your Hetzner server
cd /path/to/your/app
npm install
npm run build
npm run start:prod
```

### Option B: Docker Deployment

```bash
# Build and run with Docker
docker build -t nestjs-app .
docker run -d -p 3000:3000 --name nestjs-app nestjs-app
```

## Step 3: Set Up SSL Certificates

### Run the SSL Setup Script

```bash
# Make the script executable
chmod +x ssl-setup-hetzner.sh

# Run the setup script (ON HETZNER SERVER)
./ssl-setup-hetzner.sh
```

The script will:

- Install Nginx and Certbot
- Configure Nginx for your domain
- Obtain SSL certificates from Let's Encrypt
- Set up automatic HTTPS redirect

## Step 4: Verify SSL Setup

### Check SSL Certificate

```bash
# Verify certificate is installed
sudo certbot certificates

# Test SSL configuration
curl -I https://crx-platform.vercel.app
```

### Check Nginx Status

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx configuration
sudo nginx -t
```

## Step 5: Set Up Automatic Renewal

```bash
# Make renewal script executable
chmod +x ssl-renewal.sh

# Add to crontab (runs twice daily)
sudo crontab -e
```

Add this line:

```
0 0,12 * * * /path/to/ssl-renewal.sh >> /var/log/ssl-renewal.log 2>&1
```

## Alternative: Docker Compose Setup

If you prefer using Docker Compose:

```bash
# Update environment variables
cp env.example .env
nano .env

# Start services with SSL
docker-compose -f docker-compose.ssl.yml up -d
```

## Troubleshooting

### Common Issues:

1. **"certbot: command not found"**
   - Run: `sudo apt install certbot python3-certbot-nginx`

2. **"Unable to locate a Java Runtime"**
   - This error occurs on macOS, not on Hetzner servers
   - Run the script on your Hetzner server instead

3. **Domain not pointing to server**
   - Ensure your domain DNS points to your Hetzner server IP
   - Wait for DNS propagation (up to 24 hours)

4. **Port 80/443 blocked**
   - Configure Hetzner firewall to allow ports 80 and 443
   - Run: `sudo ufw allow 80 && sudo ufw allow 443`

### Check Logs:

```bash
# Nginx logs
sudo tail -f /var/log/nginx/error.log

# Certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Application logs
docker logs nestjs-app
```

## Security Checklist

- [ ] SSL certificates installed
- [ ] HTTPS redirect working
- [ ] Firewall configured (ports 22, 80, 443)
- [ ] Automatic renewal set up
- [ ] Security headers configured
- [ ] Rate limiting enabled

## Testing Your Setup

1. **HTTP to HTTPS redirect**: Visit `http://crx-platform.vercel.app`
2. **SSL certificate**: Visit `https://crx-platform.vercel.app`
3. **API endpoints**: Test your NestJS API endpoints
4. **SSL Labs test**: https://www.ssllabs.com/ssltest/

## Next Steps

After SSL is set up:

1. Update your frontend to use HTTPS URLs
2. Configure CORS to allow HTTPS origins
3. Set up monitoring for certificate expiry
4. Consider setting up a CDN for better performance

## Support

If you encounter issues:

1. Check the logs mentioned above
2. Verify DNS settings
3. Ensure ports are open
4. Contact Hetzner support if needed
