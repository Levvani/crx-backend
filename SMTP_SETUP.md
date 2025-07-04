# SMTP Configuration Guide

This guide will help you configure SMTP settings correctly to avoid SSL/TLS connection errors.

## Common SMTP Providers

### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Note**: Use App Passwords, not your regular Gmail password. Enable 2FA and generate an App Password in Google Account settings.

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Yahoo
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

### Custom/Business Email
```env
# For STARTTLS (recommended)
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-password

# For SSL/TLS
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-password
```

## Port and Security Settings

| Port | Security | Use Case |
|------|----------|----------|
| 25   | None     | Unencrypted (not recommended) |
| 587  | STARTTLS | **Recommended** - Encrypted after handshake |
| 465  | SSL/TLS  | Legacy - Encrypted from start |
| 2525 | STARTTLS | Alternative port for some providers |

## Environment Variables

Add these to your `.env` file:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Required for password reset emails
FRONTEND_URL=https://your-frontend-domain.com

# Set to production for strict SSL validation
NODE_ENV=development
```

## Troubleshooting SSL Errors

### Error: "wrong version number"
This typically means:
- Using `SMTP_SECURE=true` with port 587 (should be `false`)
- Using `SMTP_SECURE=false` with port 465 (should be `true`)

**Solutions**:
1. For port 587: Set `SMTP_SECURE=false`
2. For port 465: Set `SMTP_SECURE=true`
3. Check your provider's documentation

### Error: "ECONNREFUSED"
- Check if the SMTP host and port are correct
- Verify firewall settings allow outbound connections
- Ensure your hosting provider allows SMTP connections

### Error: "Invalid login"
- Verify username and password
- For Gmail: Use App Passwords instead of regular password
- Check if less secure app access is enabled (not recommended)

### Error: "ETIMEDOUT"
- Check network connectivity
- Verify SMTP server is reachable
- Check if your hosting provider blocks SMTP ports

## Testing SMTP Configuration

### Manual Test
You can test SMTP settings using telnet:

```bash
# Test connection
telnet smtp.gmail.com 587

# You should see a response like:
# 220 smtp.gmail.com ESMTP
```

### Application Test
Make a test request to the password reset endpoint:

```bash
curl -X POST http://localhost:3000/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Check the application logs for detailed SMTP configuration and connection info.

## Security Best Practices

1. **Use App Passwords**: For Gmail, Yahoo, and other providers that support 2FA
2. **Environment Variables**: Never hardcode credentials in your code
3. **TLS/STARTTLS**: Always use encrypted connections in production
4. **Dedicated Email**: Use a dedicated email account for sending automated emails
5. **Rate Limiting**: Implement rate limiting for password reset requests
6. **Monitoring**: Monitor email sending success/failure rates

## Development vs Production

### Development
- Set `NODE_ENV=development`
- Can use less strict SSL validation
- Enable debug logging

### Production
- Set `NODE_ENV=production`
- Strict SSL validation enabled
- Minimal logging
- Use dedicated SMTP service (SendGrid, Mailgun, etc.)

## Alternative Email Services

For production applications, consider using dedicated email services:

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

### Amazon SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-aws-access-key
SMTP_PASS=your-aws-secret-key
```

## Monitoring and Logging

The application logs detailed SMTP configuration on startup. Check your logs for:

```
Mailer configuration: {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  user: 'your-email@gmail.com',
  hasPass: true,
  nodeEnv: 'development'
}
```

## Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| SSL version error | Port/security mismatch | Check port and SMTP_SECURE settings |
| Authentication failed | Wrong credentials | Verify username/password, use App Passwords |
| Connection timeout | Network/firewall | Check network connectivity and firewall rules |
| TLS required | Server requires encryption | Set SMTP_SECURE=false with port 587 |
| Self-signed certificate | Development environment | Ensure NODE_ENV is set correctly |

## Need Help?

If you're still experiencing issues:

1. Check the application logs for detailed error information
2. Verify your SMTP provider's documentation
3. Test with a simple email client first
4. Consider switching to a dedicated email service for production 