import dotenv from "dotenv";
dotenv.config();

const style = `<style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f3f4f6;
                    margin: 0;
                    padding: 0;
                }

                .email-container {
                    background-color: #fefefe;
                    margin: 20px auto;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    max-width: 600px;
                }

                .button {
                    display: inline-block;
                    padding: 10px 20px;
                    font-size: 16px;
                    cursor: pointer;
                    text-align: center;
                    text-decoration: none;
                    outline: none;
                    color: #fff !important;
                    background-color: #007bff;
                    border: none;
                    border-radius: 5px;
                    box-shadow: 0 4px #999;
                }
                .ii a[href] {
                    color: #fff;
                }

                .button:hover {background-color: #0069d9}

                .button:active {
                    background-color: #0069d9;
                    box-shadow: 0 2px #666;
                    transform: translateY(2px);
                }
                a {
                    color:#fff
                }

                p {
                    font-size: 16px;
                    color: #333;
                }
                ul{
                    font-size: 16px;
                    color: #333;
                }
            </style>`;

export function validationCodeContent(userName: string, code: string) {
  return `<!DOCTYPE html>
            <html>
            <head>
                ${style}
            </head>
            <body>
                <div class="email-container">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://bestglobalai.com/watermark.png" alt="BestGlobalAl watermark" style="max-width: 200px; height: auto;"/>
                    </div>
                    <p>Dear ${userName},</p>
                    <p>Welcome to <strong>BestGlobalAl</strong>! We're thrilled to have you on board.</p>
                    <p>To complete your setup, please verify your email using the code below:</p>
                    <div class="button">${code}</div>
                    <p>Once verified, you'll get instant access to:</p>
                    <ul>
                     <li>AI-powered interactive avatars</li>
                     <li>Automated social media and email campaigns</li>
                     <li>Advanced analytics and insights</li>
                    </ul>
                    <p>If you have any questions, reach us at:</p>
                    <p><strong>support@bestglobalal.com</strong></p>
                    <p>We're excited to help you get started!</p>
                    <p>Best regards,<br>
                    The BestGlobalAl Team</p>
                </div>
            </body>
            </html>`;
}

export function subscriptionConfirmationContent(
  userName: string,
  plan: string,
  expirationDate: string
) {
  return `<!DOCTYPE html>
            <html>
            <head>
                ${style}
            </head>
            <body>
                <div class="email-container">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://bestglobalai.com/watermark.png" alt="BestGlobalAl watermark" style="max-width: 200px; height: auto;"/>
                    </div>
                    <p>Dear ${userName},</p>
                    <p>Thank you for subscribing to <strong>BestGlobalAI</strong>!</p>
                    <p>We're excited to have you on board with the <strong>${plan}</strong> plan.</p>
                    <p>Your subscription is valid until <strong>${expirationDate}</strong>.</p>
                    <p>If you have any questions or need assistance, don't hesitate to reach out to our support team at:</p>
                    <p><strong>support@bestglobalai.com</strong></p>
                    <p>We're here to ensure you get the most out of your experience!</p>
                    <p>Best regards,<br>The BestGlobalAI Team</p>
                </div>
            </body>
            </html>`;
}

export function resetPasswordLink(userName: string, token: string) {
  const resetLink = `https://bestglobalai.com/reset-password?token=${token}`;
  return `<!DOCTYPE html>
            <html>
            <head>
                ${style}
            </head>
            <body>
                <div class="email-container">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://bestglobalai.com/watermark.png" alt="BestGlobalAl watermark" style="max-width: 200px; height: auto;"/>
                    </div>
                    <p>Dear ${userName},</p>
                    <p>We received a request to reset your  account password. If you made this request, please click the link below to reset your password:</p>
                    <a href="${resetLink}" class="button">Reset Password</a>
                    <p>For your security, this link will expire in 24 hours. If you didn’t request a password reset, you can safely ignore this email—your account will remain secure.</p>
                    <ul>
                     <li>AI-powered interactive avatars</li>
                     <li>Automated social media and email campaigns</li>
                     <li>Advanced analytics and insights</li>
                    </ul>
                    <p>If you have any questions, reach us at:</p>
                    <p><strong>support@bestglobalal.com</strong></p>
                    <p>We're excited to help you get started!</p>
                    <p>Best regards,<br>
                    The BestGlobalAl Team</p>
                </div>
            </body>
            </html>`;
}

export function extraServiceUserEmail(userName: string, service: any) {
  return `<!DOCTYPE html>
            <html>
            <head>
                ${style}
            </head>
            <body>
                <div class="email-container">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://bestglobalai.com/watermark.png" alt="BestGlobalAl watermark" style="max-width: 200px; height: auto;"/>
                    </div>
                    <p>Dear ${userName},</p>
                    <p>Thank you for purchasing <strong>${
                      service.title
                    }</strong>!</p>
                    <p>Your payment was successfully processed. Here are the details of your purchase:</p>
                    <ul>
                        <li><strong>Service:</strong> ${service.title}</li>
                        <li><strong>Description:</strong> ${
                          service.description
                        }</li>
                        <li><strong>Price:</strong> ${service.price}</li>
                    </ul>
                    <p>Features included:</p>
                    <ul>
                        ${service.features
                          .map((feature: string) => `<li>${feature}</li>`)
                          .join("")}
                    </ul>
                    <p>Our team will reach out to you shortly to begin the service.</p>
                    <p>If you have any questions, feel free to contact us at:</p>
                    <p><strong>admin@bestglobalai.com</strong></p>
                    <p>Best regards,<br>
                    The BestGlobalAI Team</p>
                </div>
            </body>
            </html>`;
}

export function extraServicePaymentSuccessAdmin(
  userName: string,
  userEmail: string,
  service: any
) {
  return `<!DOCTYPE html>
            <html>
            <head>
                ${style}
            </head>
            <body>
                <div class="email-container">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://bestglobalai.com/watermark.png" alt="BestGlobalAI watermark" style="max-width: 200px; height: auto;"/>
                    </div>
                    <p><strong>New Extra Service Purchase Notification</strong></p>
                    <p>A user has successfully purchased an extra service.</p>
                    <p><strong>User Details:</strong></p>
                    <p>Name: ${userName}</p>
                    <p>Email: ${userEmail}</p>
                    <p><strong>Service Details:</strong></p>
                    <p>Title: <strong>${service.title}</strong></p>
                    <p>Description: ${service.description}</p>
                    <p>Price: ${service.price}</p>
                    <p><strong>Features:</strong></p>
                    <ul>
                        ${service.features
                          .map((feature: string) => `<li>${feature}</li>`)
                          .join("")}
                    </ul>
                    <p>Please review the request and proceed with the necessary actions.</p>
                    <p>Best regards,<br>
                    The BestGlobalAI System</p>
                </div>
            </body>
            </html>`;
}

export function sendInvites(
  inviteLink: string,
  first_name: string,
  last_name: string
) {
  return `<!DOCTYPE html>
            <html>
            <head>
                ${style}
            </head>
            <body>  
                <div class="email-container">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://bestglobalai.com/watermark.png" alt="BestGlobalAl watermark" style="max-width: 200px; height: auto;"/>
                    </div>
                    <p>Dear ${first_name} ${last_name},</p>
                    <p>You're invited to join BestGlobalAl! Click the link below to sign up:</p>
                    <a href="${inviteLink}" class="button">Sign Up</a>
                    <p>Best regards,<br>
                    The BestGlobalAl Team</p>
                </div>
            </body>
            </html>`;
}
