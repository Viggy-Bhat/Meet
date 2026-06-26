import { Calendar, Clock, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function EventDetails({ event }) {
  const { user } = event;
  return (
    <div className="p-8 lg:p-10 lg:w-1/3 bg-card border border-border/40 rounded-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Avatar className="h-12 w-12 ring-2 ring-border/40">
          <AvatarImage src={user.imageUrl} alt={user.name} />
          <AvatarFallback className="font-serif">{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-serif text-xl font-semibold">{user.name}</h2>
        </div>
      </div>
      <h1 className="font-serif text-3xl font-bold mb-6">{event.title}</h1>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{event.duration} minutes</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Video className="h-4 w-4" />
          <span>Google Meet</span>
        </div>
      </div>
      {event.description && (
        <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
          {event.description}
        </p>
      )}
    </div>
  );
}
