import { MailService } from "@sendgrid/mail";
import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);


const mailService = new MailService();

if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }>;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not set, skipping email send");
    return false;
  }

  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
      attachments: params.attachments,
    });
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error: any) {
    console.error("SendGrid email error:", error.response?.body || error);
    return false;
  }
}

export async function sendVendorReport(
  vendorEmail: string,
  vendorName: string,
  reportData: any[],
  reportPeriod: string,
): Promise<boolean> {
  const csvContent = generateCSVReport(reportData);

  const html = `
    <html>
      <body>
        <h2>Metro Vehicle Attendance Report</h2>
        <p>Dear ${vendorName},</p>
        <p>Please find attached your vehicle attendance report for ${reportPeriod}.</p>
        <p>Report Summary:</p>
        <ul>
          <li>Total Vehicles: ${reportData.length}</li>
          <li>Report Period: ${reportPeriod}</li>
        </ul>
        <p>Best regards,<br>Metro Cash & Carry</p>
      </body>
    </html>
  `;

  return await sendEmail({
    to: vendorEmail,
    from: process.env.FROM_EMAIL || "noreply@metro.com",
    subject: `Metro Vehicle Report - ${reportPeriod}`,
    html,
    attachments: [
      {
        content: Buffer.from(csvContent).toString("base64"),
        filename: `vehicle_report_${reportPeriod.replace(/\s+/g, "_")}.csv`,
        type: "text/csv",
        disposition: "attachment",
      },
    ],
  });
}

function generateCSVReport(data: any[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]).join(",");
  const rows = data.map((row) =>
    Object.values(row)
      .map((val) => `"${val}"`)
      .join(","),
  );

  return [headers, ...rows].join("\n");
}



//store vendor driver/sup/loader(aadhar id )-dropdown  checkin(data+ time)  ckeckout