import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import { getMeetingPdfData } from "@/actions/generate-pdf";
import MeetingPdfDocument from "@/components/meeting/meeting-pdf-document";

export async function GET(req, { params }) {
  const { meetingId } = await params;

  try {
    const booking = await getMeetingPdfData(meetingId);

    const stream = pdf(<MeetingPdfDocument booking={booking} />);
    const buffer = await stream.toBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="meeting-${meetingId}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === "Unauthorized" ? 401 : 404 }
    );
  }
}
