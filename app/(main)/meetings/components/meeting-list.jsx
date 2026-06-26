import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video, FileDown } from "lucide-react";
import CancelMeetingButton from "./cancel-meeting";
import MeetingRecordings from "@/components/meeting/meeting-recordings";

export default function MeetingList({ meetings, type }) {
  if (meetings.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No {type} meetings found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {meetings.map((meeting) => {
        const recordings = meeting.recordings || [];
        const latest = recordings[0];

        return (
          <Card
            key={meeting.id}
            className="flex flex-col justify-between border-border/60 hover:border-accent/20 transition-colors"
          >
            <CardHeader>
              <CardTitle className="font-serif text-lg">
                {meeting.event.title}
              </CardTitle>
              <CardDescription>with {meeting.name}</CardDescription>
              {meeting.additionalInfo && (
                <CardDescription className="line-clamp-1 italic">
                  &quot;{meeting.additionalInfo}&quot;
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {format(new Date(meeting.startTime), "MMMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {format(new Date(meeting.startTime), "h:mm a")} -{" "}
                  {format(new Date(meeting.endTime), "h:mm a")}
                </span>
              </div>
              {meeting.meetLink && (
                <div className="flex items-center">
                  <Video className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <a
                    href={meeting.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Join Meeting
                  </a>
                </div>
              )}
              {type === "past" && <MeetingRecordings meeting={meeting} />}
              {type === "past" && latest?.status === "COMPLETED" && (
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="rounded-full" asChild>
                    <a href={`/api/meetings/${meeting.id}/pdf`} download>
                      <FileDown className="mr-1.5 h-3.5 w-3.5" />
                      Download PDF
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
            {type === "upcoming" && (
              <CardFooter className="flex justify-between border-t border-border/40 pt-4">
                <CancelMeetingButton meetingId={meeting.id} />
              </CardFooter>
            )}
          </Card>
        );
      })}
    </div>
  );
}
