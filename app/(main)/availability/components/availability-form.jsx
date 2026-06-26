"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import { updateAvailability } from "@/actions/availability";
import { availabilitySchema } from "@/lib/validators";
import { timeSlots } from "../data";
import useFetch from "@/hooks/use-fetch";

export default function AvailabilityForm({ initialData }) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(availabilitySchema),
    defaultValues: { ...initialData },
  });

  const {
    loading,
    error,
    fn: fnupdateAvailability,
  } = useFetch(updateAvailability);

  const onSubmit = async (data) => {
    await fnupdateAvailability(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {[
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ].map((day) => {
        const isAvailable = watch(`${day}.isAvailable`);

        return (
          <div
            key={day}
            className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-accent/20 transition-colors"
          >
            <Controller
              name={`${day}.isAvailable`}
              control={control}
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    setValue(`${day}.isAvailable`, checked);
                    if (!checked) {
                      setValue(`${day}.startTime`, "09:00");
                      setValue(`${day}.endTime`, "17:00");
                    }
                  }}
                />
              )}
            />
            <span className="w-28 text-sm font-medium">
              {day.charAt(0).toUpperCase() + day.slice(1)}
            </span>
            {isAvailable && (
              <div className="flex items-center gap-2">
                <Controller
                  name={`${day}.startTime`}
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-28 rounded-lg">
                        <SelectValue placeholder="Start" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <span className="text-muted-foreground text-xs">to</span>
                <Controller
                  name={`${day}.endTime`}
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-28 rounded-lg">
                        <SelectValue placeholder="End" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors[day]?.endTime && (
                  <span className="text-red-500 text-xs ml-2">
                    {errors[day].endTime.message}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-3 p-4 rounded-xl border border-border/60">
        <span className="text-sm font-medium w-64">
          Minimum gap before booking (minutes):
        </span>
        <Input
          type="number"
          {...register("timeGap", { valueAsNumber: true })}
          className="w-28 rounded-lg"
        />
        {errors.timeGap && (
          <span className="text-red-500 text-xs">{errors.timeGap.message}</span>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
          {error?.message}
        </div>
      )}

      <Button type="submit" disabled={loading} className="rounded-full">
        {loading ? "Updating..." : "Update Availability"}
      </Button>
    </form>
  );
}
