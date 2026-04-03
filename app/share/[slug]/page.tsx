import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { timeAgo } from '@/lib/share-location';
import SharePageClient from './share-page-client';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SharePage({ params }: Props) {
  const { slug } = await params;

  const record = await prisma.sharedLocation.findUnique({ where: { slug } });
  if (!record) {
    notFound();
  }

  const updatedAt = record.updatedAt.toISOString();

  return (
    <SharePageClient
      lat={record.lat}
      lon={record.lon}
      label={record.label}
      updatedAtLabel={timeAgo(new Date(updatedAt))}
    />
  );
}
