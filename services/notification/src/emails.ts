export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Pure mapping from an outbox event to the emails it should produce.
 * Kept free of IO so it can be unit tested without a database or SMTP server.
 */
export function buildEmails(
  eventType: string,
  payload: Record<string, unknown>,
  adminEmail: string,
): EmailPayload[] {
  switch (eventType) {
    case "user.registered":
      if (payload.invitation) {
        return [{
          to: String(payload.email),
          subject: "You have been invited to the Elkatech service platform",
          text: `Hi ${payload.displayName ?? "there"},\n\nYou have been invited as ${payload.role}.\n\nComplete your account here:\n${payload.inviteUrl ?? payload.verifyUrl}\n`,
        }];
      }

      return [{
        to: String(payload.email),
        subject: "Verify your Elkatech account",
        text: `Hi ${payload.displayName ?? "there"},\n\nPlease verify your email to activate your Elkatech account:\n${payload.verifyUrl}\n`,
      }];
    case "user.password_reset_requested":
      return [{
        to: String(payload.email),
        subject: "Reset your Elkatech password",
        text: `Hi ${payload.displayName ?? "there"},\n\nReset your password using this link:\n${payload.resetUrl}\n`,
      }];
    case "user.email_verified":
      return [{
        to: String(payload.email),
        subject: "Your Elkatech email is verified",
        text: `Your email has been verified successfully. You can now submit service requests.`,
      }];
    case "request.created":
      return [
        {
          to: adminEmail,
          subject: `New service request ${payload.requestNumber}`,
          text: `A new service request has been created by ${payload.customerName} for ${payload.productName}.\n\nSubject: ${payload.subject}\nCustomer email: ${payload.customerEmail}\n`,
        },
        {
          to: String(payload.customerEmail),
          subject: `We received your service request ${payload.requestNumber}`,
          text: `Hi ${payload.customerName ?? "there"},\n\nYour service request for ${payload.productName} has been created successfully.\n\nSubject: ${payload.subject}\nRequest number: ${payload.requestNumber}\n\nThe Elkatech service team will review it and update you inside the portal.`,
        },
      ];
    case "request.assigned":
      return [{
        to: String(payload.engineerEmail),
        subject: `Service request assigned: ${payload.requestNumber}`,
        text: `You have been assigned to service request ${payload.requestNumber}.\n\nCustomer email: ${payload.customerEmail}\nStatus: ${payload.status}\n`,
      }];
    case "request.status_changed":
      return [{
        to: String(payload.customerEmail),
        subject: `Your service request ${payload.requestNumber} was updated`,
        text: `Your service request status changed from ${payload.previousStatus} to ${payload.status}.\nUpdated by ${payload.actorName}.`,
      }];
    case "request.staff_reply_posted":
      return [{
        to: String(payload.customerEmail),
        subject: `New update on request ${payload.requestNumber}`,
        text: `${payload.authorName} replied to your service request:\n\n${payload.body}`,
      }];
    case "request.customer_message_posted":
      return [{
        to: adminEmail,
        subject: `Customer replied on request ${payload.requestNumber}`,
        text: `Customer update on request ${payload.requestNumber}:\n\n${payload.body}`,
      }];
    default:
      return [];
  }
}
