import { nameMatchesAllTokens, nameSearchTokens } from "@/lib/nameSearch";
import { Customer, Job } from "@/types";

export function jobMatchesPickerSearch(
  job: Job,
  customer: Customer | undefined,
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const textMatch = [
    customer?.name,
    customer?.phone,
    customer?.address,
    customer?.city,
    // Calendar rows have no customer record — their name rides on the job (see
    // ongoingCustomerName), so without this a name search would miss all of them.
    job.customerName,
    job.notes,
    job.city,
    job.location,
    job.phone,
  ].some((field) => field && field.toLowerCase().includes(q));
  if (textMatch) return true;

  // A multi-word query also matches the name with the words in any order: the same
  // person is stored as both "נילי אגסי" and "אגסי נילי". Name fields only, so a
  // word from the name and a word from the city can never combine into a hit.
  const tokens = nameSearchTokens(q);
  return [customer?.name, job.customerName].some((name) =>
    nameMatchesAllTokens(name, tokens),
  );
}
