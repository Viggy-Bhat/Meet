"use client";

import { deleteEvent } from "@/actions/events";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import useFetch from "@/hooks/use-fetch";
import { Link, Trash2, Clock, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function EventCard({ event, username, isPublic = false }) {
  const [isCopied, setIsCopied] = useState(false);
  const router = useRouter();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window?.location.origin}/${username}/${event.id}`
      );
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const { loading, fn: fnDeleteEvent } = useFetch(deleteEvent);

  const handleDelete = async () => {
    if (window?.confirm("Are you sure you want to delete this event?")) {
      await fnDeleteEvent(event.id);
      router.refresh();
    }
  };

  const handleCardClick = (e) => {
    if (e.target.tagName !== "BUTTON" && e.target.tagName !== "SVG" && e.target.tagName !== "svg") {
      window?.open(
        `${window?.location.origin}/${username}/${event.id}`,
        "_blank"
      );
    }
  };

  return (
    <Card
      className="group flex flex-col justify-between cursor-pointer border-border/60 hover:border-accent/30 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
      onClick={handleCardClick}
    >
      <CardHeader>
        <CardTitle className="font-serif text-xl">{event.title}</CardTitle>
        <CardDescription className="flex justify-between items-center">
          <span className="flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            {event.duration} min
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
            {event.isPrivate ? "Private" : "Public"}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {event.description?.substring(0, event.description.indexOf("."))}.
        </p>
        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{event._count.bookings} bookings</span>
        </div>
      </CardContent>
      {!isPublic && (
        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="rounded-full"
          >
            <Link className="mr-1.5 h-3.5 w-3.5" />
            {isCopied ? "Copied!" : "Copy Link"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={loading}
            className="rounded-full"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
