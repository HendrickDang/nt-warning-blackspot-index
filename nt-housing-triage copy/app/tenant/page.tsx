import TenantView from "../components/TenantView";
import { seedJobs } from "@/lib/data/seed";

export default async function TenantPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const { job } = await searchParams;
  const jobs = seedJobs();
  return <TenantView jobs={jobs} initialJobId={job ?? jobs[0]?.id ?? null} />;
}
