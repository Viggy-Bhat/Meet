import { notFound } from "next/navigation";
import { getUserByUsername } from "@/actions/users";
import EventCard from "@/components/event-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export async function generateMetadata(props) {
  const params = await props.params;
  const user = await getUserByUsername(params.username);

  if (!user) {
    return { title: "User Not Found" };
  }

  return {
    title: `${user.name}'s Profile | Meet`,
    description: `Book an event with ${user.name}. View available public events and schedules.`,
  };
}

export default async function UserProfilePage(props) {
  const params = await props.params;
  const user = await getUserByUsername(params.username);

  if (!user) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col items-center mb-12">
        <Avatar className="h-24 w-24 mb-5 ring-4 ring-border/40 shadow-lg">
          <AvatarImage src={user.imageUrl} alt={user.name} />
          <AvatarFallback className="font-serif text-2xl">
            {user.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <h1 className="font-serif text-3xl font-bold mb-2">{user.name}</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Welcome to my scheduling page. Please select an event below to book a
          call with me.
        </p>
      </div>

      {user.events.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No public events available.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {user.events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              username={params.username}
              isPublic
            />
          ))}
        </div>
      )}
    </div>
  );
}
