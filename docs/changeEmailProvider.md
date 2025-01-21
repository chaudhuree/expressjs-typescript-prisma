
If user want to change the email provider , there has two ways.
First one:
- collect the app password from Gmail
- now store the app password in .env variable with the email like below 
```
GMAIL_CLIENT_ID = user@gmail.com
GMAIL_CLIENT_SECRET = app password collected from gmail
```
---
```
// In auth.service.ts or wherever you want to switch email providers
import { emailService } from '../utils/email.util.ts';
export const switchToGmailProvider = () => {
  const gmailClientId = process.env.GMAIL_CLIENT_ID;
  const gmailClientSecret = process.env.GMAIL_CLIENT_SECRET;

  if (!gmailClientId || !gmailClientSecret) {
    throw new Error('Gmail credentials are not set in the environment variables');
  }

  emailService.switchEmailProvider({
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: gmailClientId,
      pass: gmailClientSecret
    },
    secure: false // Use TLS
  });
};


// Before sending OTP call switchToGmailProvider
switchToGmailProvider();

// Now send OTP will use Gmail
await emailService.sendPasswordResetOTP(email, otp);
```
Second way:  you can create a separate Gmail-specific email service:

```
## [MUST] import EmailService from email.util.ts file
const gmailService = new EmailService({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
  user: process.env.GMAIL_CLIENT_ID,
  pass: process.env.GMAIL_CLIENT_SECRET
},
  secure: false
});

// then send email like this,
await gmailService.sendPasswordResetOTP(email, otp);
```