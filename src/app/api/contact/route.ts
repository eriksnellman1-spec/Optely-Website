import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const body = await request.json();
    const { name, email, phone, company, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "eriksnellman1@gmail.com",
      subject: `Nytt meddelande från ${name}${company ? ` — ${company}` : ""}`,
      text: `Namn: ${name}\nE-post: ${email}\nTelefon: ${phone || "–"}\nFöretag: ${company || "–"}\n\nMeddelande:\n${message}`,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
