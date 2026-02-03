import { Link as LinkIcon, PenBox } from 'lucide-react';
import React from 'react'
import Image from 'next/image'; 
import Link from 'next/link';
import { Button } from './ui/button';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { SignInButton, UserButton } from '@clerk/nextjs';
import UserMenu from './user-menu';
import { checkUser } from '@/lib/checkUser';

const Header = async () => {
   
      await checkUser();


  return (
   
     <nav className='mx-auto py-2 px-4 flex justify-between items-center shadow-md border-b-2'>
        <Link href={"/"} className='flex items-center'>
        <Image src={"/logo2.png"} alt="logo" width={120} height={100} className=" h-15 w-auto" />
       </Link>
       <div className='flex items-center gap-4'>
        <Link href="/events?create=true">
         <Button><PenBox size={18} /> Create Event</Button>
        </Link>
        <SignedOut>
            <SignInButton forceRedirectUrl='/dashboard'>
          <Button variant="outline">Login</Button>
            </SignInButton>
        </SignedOut>
        <SignedIn>
           <UserMenu />
        </SignedIn>
       </div>
    </nav>
  )
  
}

export default Header;