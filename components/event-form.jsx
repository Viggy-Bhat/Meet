import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { eventSchema } from "@/lib/validators";
import { createEvent } from "@/actions/events";
import { useRouter } from "next/navigation";
import useFetch from "@/hooks/use-fetch";

const EventForm = ({ onSubmitForm, initialData = {} }) => {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: initialData.title || "",
      description: initialData.description || "",
      duration: initialData.duration || 30,
      isPrivate: initialData.isPrivate ?? true,
    },
  });

  const { loading, error, fn: fnCreateEvent } = useFetch(createEvent);

  const onSubmit = async (data) => {
    try {
      await fnCreateEvent(data);
      onSubmitForm();
      router.refresh();
    } catch {
      // error is already set by useFetch
    }
  };

  return (
    <form className="px-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1.5">
          Event Title
        </label>
        <Input id="title" {...register("title")} className="rounded-lg" />
        {errors.title && (
          <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1.5">
          Description
        </label>
        <Textarea {...register("description")} id="description" className="rounded-lg" />
        {errors.description && (
          <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="duration" className="block text-sm font-medium mb-1.5">
          Duration (minutes)
        </label>
        <Input
          id="duration"
          {...register("duration", { valueAsNumber: true })}
          type="number"
          className="rounded-lg"
        />
        {errors.duration && (
          <p className="text-red-500 text-xs mt-1">{errors.duration.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="isPrivate" className="block text-sm font-medium mb-1.5">
          Event Privacy
        </label>
        <Controller
          name="isPrivate"
          control={control}
          render={({ field }) => (
            <Select
              onValueChange={(value) => field.onChange(value === "true")}
              value={field.value ? "true" : "false"}
            >
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Select privacy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Private</SelectItem>
                <SelectItem value="false">Public</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {error && <p className="text-red-500 text-xs">{error.message}</p>}

      <Button type="submit" disabled={loading} className="rounded-full mt-2">
        {loading ? "Submitting..." : "Create Event"}
      </Button>
    </form>
  );
};

export default EventForm;
