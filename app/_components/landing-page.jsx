"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Calendar, Clock, LinkIcon, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Testimonials from "@/components/testimonials";

const features = [
  {
    icon: Calendar,
    title: "Create Events",
    description: "Easily set up and customize your event types",
  },
  {
    icon: Clock,
    title: "Manage Availability",
    description: "Define your availability to streamline scheduling",
  },
  {
    icon: LinkIcon,
    title: "Custom Links",
    description: "Share your personalized scheduling link",
  },
];

const howItWorks = [
  { step: "Sign Up", description: "Create your free Meet account" },
  {
    step: "Set Availability",
    description: "Define when you're available for meetings",
  },
  {
    step: "Share Your Link",
    description: "Send your scheduling link to clients or colleagues",
  },
  {
    step: "Get Booked",
    description: "Receive confirmations for new appointments automatically",
  },
];

export default function Home() {
  return (
    <main>
      <section className="container mx-auto px-4 pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-16">
          <div className="lg:max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Meeting Summaries
            </div>
            <h1 className="font-serif text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-balance mb-6">
              Scheduling that
              <br />
              <span className="bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                flows with you.
              </span>
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed mb-10 max-w-lg">
              Schedule meetings effortlessly, manage time effectively, and get
              AI-powered summaries of every conversation. Your personal
              scheduling assistant.
            </p>
            <Link href="/dashboard">
              <Button size="lg" className="text-base px-8 py-6 rounded-full">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          <div className="lg:w-1/2 flex justify-center">
            <div className="relative w-full max-w-md aspect-square">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl" />
              <Image
                src="/poster.png"
                alt="poster"
                width={600}
                height={500}
                className="rounded-2xl shadow-2xl relative z-10"
                style={{ objectFit: "contain" }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <span className="text-accent font-medium text-sm uppercase tracking-widest">
            Features
          </span>
          <h2 className="font-serif text-4xl lg:text-5xl font-bold mt-3 mb-4">
            Everything you need
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Powerful tools to take control of your schedule.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group border-border/60 hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-accent/10 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary group-hover:text-accent transition-colors" />
                </div>
                <CardTitle className="font-serif text-xl">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-24">
        <Testimonials />
      </section>

      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <span className="text-accent font-medium text-sm uppercase tracking-widest">
            How It Works
          </span>
          <h2 className="font-serif text-4xl lg:text-5xl font-bold mt-3 mb-4">
            Get started in minutes
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {howItWorks.map((step, index) => (
            <div key={index} className="text-center relative">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 text-primary font-serif font-bold text-2xl">
                {index + 1}
              </div>
              <h3 className="font-serif font-semibold text-lg mb-2">
                {step.step}
              </h3>
              <p className="text-muted-foreground text-sm">
                {step.description}
              </p>
              {index < 3 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-border -translate-x-1/2" />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-24">
        <div className="max-w-3xl mx-auto text-center bg-primary rounded-3xl p-12 lg:p-16">
          <h2 className="font-serif text-3xl lg:text-4xl font-bold text-primary-foreground mb-4">
            Ready to streamline your scheduling?
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-md mx-auto">
            Join thousands of professionals who trust Meet for efficient time
            management.
          </p>
          <Link href="/dashboard">
            <Button
              size="lg"
              variant="secondary"
              className="text-base px-8 py-6 rounded-full bg-white hover:bg-white/90 text-primary"
            >
              Start For Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
