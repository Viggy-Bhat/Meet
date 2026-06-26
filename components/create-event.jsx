"use client";

import React, { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import EventForm from "./event-form";

export default function CreateEventDrawer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  React.useEffect(() => {
    setIsOpen(searchParams.get("create") === "true");
  }, [searchParams]);

  // State can be exposed to our app in case we want to manually open the drawer 👇
  // useEffect(() => {
  //   window.openCreateEventDrawer = () => setIsOpen(true);

  //   return () => {
  //     delete window.openCreateEventDrawer;
  //   };
  // }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (searchParams.get("create") === "true") {
      router.replace(window?.location.pathname);
    }
  };

  return (
    <Drawer open={isOpen} onClose={handleClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Create New Event</DrawerTitle>
        </DrawerHeader>
        <EventForm
          onSubmitForm={() => {
            handleClose();
          }}
        />
        <DrawerFooter className="px-6">
          <DrawerClose asChild>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}