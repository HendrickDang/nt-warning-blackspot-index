import Dashboard from "./components/Dashboard";
import { seedJobs } from "@/lib/data/seed";

export default function Page() {
  const jobs = seedJobs();
  return <Dashboard initialJobs={jobs} />;
}
