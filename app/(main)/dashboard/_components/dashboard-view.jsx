"use client";

import React, { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateUsername } from "@/actions/users";
import { BarLoader } from "react-spinners";
import useFetch from "@/hooks/use-fetch";
import { usernameSchema } from "@/lib/validators";
import { getLatestUpdates } from "@/actions/dashboard";
import { format } from "date-fns";
import { Calendar, Copy, CheckCircle2 } from "lucide-react";

export default function DashboardView() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(usernameSchema),
  });

  useEffect(() => {
    setValue("username", user?.username);
  }, [isPending, setValue, user?.username]);

  const {
    loading: loadingUpdates,
    data: upcomingMeetings,
    fn: fnUpdates,
  } = useFetch(getLatestUpdates);

  useEffect(() => {
    fnUpdates();
  }, [fnUpdates]);

  const { loading, error, fn: fnUpdateUsername } = useFetch(updateUsername);

  const onSubmit = async (data) => {
    await fnUpdateUsername(data.username);
  };

  const [copied, setCopied] = React.useState(false);
  const googleAccount = session?.accounts?.find(
    (acc) => acc.providerId === "google"
  );
  const isGoogleConnected = !!googleAccount;
  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      `${appUrl}/${user?.username}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">
            Welcome, {user?.name || "there"}!
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!loadingUpdates ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Recent Meetings</span>
              </div>
              <div>
                {upcomingMeetings && upcomingMeetings?.length > 0 ? (
                  <ul className="space-y-2">
                    {upcomingMeetings?.map((meeting) => (
                      <li
                        key={meeting.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-sm"
                      >
                        <div className="h-2 w-2 rounded-full bg-accent" />
                        <span className="font-medium">{meeting.event.title}</span>
                        <span className="text-muted-foreground">
                          on {format(new Date(meeting.startTime), "MMM d, h:mm a")}
                        </span>
                        <span className="text-muted-foreground">with {meeting.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No upcoming meetings
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading updates...</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">
            Your Unique Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {appUrl}/
                </span>
                <Input
                  {...register("username")}
                  placeholder="username"
                  className="rounded-lg"
                />
              </div>
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.username.message}
                </p>
              )}
              {error && (
                <p className="text-red-500 text-sm mt-1">{error?.message}</p>
              )}
            </div>
            {loading && (
              <BarLoader className="mb-4" width="100%" color="var(--color-accent)" />
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="rounded-full">
                Update Username
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy Link"}
                <Copy className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card
        className={
          isGoogleConnected
            ? "border-green-500/30 bg-green-500/5"
            : "border-accent/30 bg-accent/5"
        }
      >
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4">
          {isGoogleConnected ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  Google Calendar Connected
                </p>
                <p className="text-xs text-muted-foreground">
                  {googleAccount?.email || "Your Google account is linked"}
                </p>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                Active
              </span>
            </>
          ) : (
            <>
              <div className="flex-1">
                <p className="text-sm font-medium">Connect Google Calendar</p>
                <p className="text-xs text-muted-foreground">
                  Enable automatic Meet links for your bookings.
                </p>
              </div>
              <Button
                onClick={() =>
                  authClient.signIn.social({
                    provider: "google",
                    callbackURL: "/dashboard",
                  })
                }
                className="rounded-full shrink-0"
              >
                Connect Now
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
