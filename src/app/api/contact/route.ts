import { NextRequest, NextResponse } from "next/server";

// TODO: Connect to your preferred email provider (Resend, SendGrid, Nodemailer, etc.)
// Example with Resend: npm install resend
// import { Resend } from 'resend';
// const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, company, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    // Log the submission (replace with actual email sending in production)
    console.log("Contact form submission:", { name, email, phone, company, message });

    // TODO: Replace with actual email sending:
    // await resend.emails.send({
    //   from: 'noreply@optely.eu',
    //   to: 'eriksnellman1@gmail.com',
    //   subject: `New contact from ${name} — ${company || 'No company'}`,
    //   text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nCompany: ${company}\n\n${message}`,
    // });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
