"use client";
import { Carousel, CarouselContent, CarouselItem } from './ui/carousel';
import { Card, CardContent } from './ui/card';
import Autoplay from "embla-carousel-autoplay"
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';


const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Marketing Manager",
    content:
      "Meet has transformed how I manage my team's meetings. It's intuitive and saves us hours every week!",
    image: "https://i.pravatar.cc/150?img=1",
  },
  {
    name: "David Lee",
    role: "Freelance Designer",
    content:
      "As a freelancer, Meet helps me stay organized and professional. My clients love how easy it is to book time with me.",
    image: "https://i.pravatar.cc/150?img=2",
  },
  {
    name: "Emily Chen",
    role: "Startup Founder",
    content:
      "Meet streamlined our hiring process. Setting up interviews has never been easier!",
    image: "https://i.pravatar.cc/150?img=3",
  },
  {
    name: "Michael Brown",
    role: "Sales Executive",
    content:
      "I've seen a 30% increase in my meeting bookings since using Meet. It's a game-changer for sales professionals.",
    image: "https://i.pravatar.cc/150?img=4",
  },
];

const Testimonials = () => {
  return (
    <div> 
     <Carousel
      plugins={[
        Autoplay({
          delay: 2000,
        }),
      ]}
    
      className="w-full mx-auto "
    >
      <CarouselContent >
        {testimonials.map((testimonial, index) => (
          <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
          
              <Card className='h-full'>
                <CardContent className="flex  flex-col h-full justify-between p-6">
                    <p className='text-gray-600 mb-4'>
                      &quot;{testimonial.content}&quot;
                    </p>
                    <div className=' flex items-center mt-4'>
                   <Avatar className='h-12 w-12 mr-4'>
        <AvatarImage
          src={testimonial.image}
          alt={testimonial.name}
        />
        <AvatarFallback>{testimonial.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
      </Avatar>
      </div>
      <div >
      <p className='font-semibold'>{testimonial.name}</p>
      <p className='text-sm text-gray-500'>{testimonial.role}</p>
      </div>
                </CardContent>
              </Card>
        
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
        
         </div>
  )
}

export default Testimonials