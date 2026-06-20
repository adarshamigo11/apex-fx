import { redirect } from 'next/navigation';

export default function HomePage() {
  // Server-side redirect to the tidemark-3d.html landing page
  redirect('/index.html');
}
