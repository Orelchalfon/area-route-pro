import { useJobsContext } from "@/contexts/JobsContext";
import { useGoogleMapsKey } from "@/hooks/useGoogleMapsKey";
import { geocodeAddress } from "@/lib/geocodeAddress";
import { isDbCustomer, isFilterJob } from "@/lib/idConventions";
import { splitJobNotes } from "@/lib/jobNotes";
import { Customer, Job } from "@/types";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export interface JobDetailsDraft {
  location: string;
  city: string;
  phone: string;
  /** First half of the displayed Job.notes — see src/lib/jobNotes.ts. */
  description: string;
}

export interface PlaceCoords {
  lat: number;
  lng: number;
  placeId?: string;
}

export interface PendingCustomerUpdate {
  customerId: string;
  customerName: string;
  patch: Partial<Customer>;
  /** Address changed, so the stored coordinates need re-geocoding on confirm. */
  needsGeocode: boolean;
  coords: PlaceCoords | null;
}

/** Seed a draft from a job, falling back to the customer for a missing phone. */
export function jobDetailsDraft(job: Job, customer?: Customer): JobDetailsDraft {
  return {
    location: job.location || "",
    city: job.city || "",
    phone: job.phone || customer?.phone || "",
    description: splitJobNotes(job.notes).description,
  };
}

/**
 * Saving a job's contact details from the scheduling screens, plus the "update the
 * customer card too?" decision.
 *
 * Where an edit can actually land depends on the job's id prefix:
 *  - db-malf-* / db-inst-*  → the job row only. Their "customer" (db-malf-cust-*) is
 *    synthesized from that same row, so there is no customer card to offer.
 *  - db-ongoing-* with a real db-cust-* customer → job row, then offer the card.
 *  - db-ongoing-* calendar rows (db-ongoing-cust-*) → job row only; the derived
 *    "customer" name is the task description, so upserting it would mint a junk card.
 *  - filter-* → synthetic, no DB row at all (updateJob silently no-ops). The customer
 *    record IS the source — the board re-derives address/city from it — so the edit
 *    goes straight there and there is nothing to ask about.
 */
export function useJobDetailsSave() {
  const { customersList, updateJob, updateCustomer } = useJobsContext();
  const { fetchKey } = useGoogleMapsKey();

  const [isSaving, setIsSaving] = useState(false);
  const [pendingCustomerUpdate, setPendingCustomerUpdate] =
    useState<PendingCustomerUpdate | null>(null);

  const applyCustomerUpdate = useCallback(
    async (update: PendingCustomerUpdate) => {
      const patch = { ...update.patch };

      if (update.needsGeocode) {
        const geocoded =
          update.coords ??
          (await geocodeAddress(
            [patch.address, patch.city].filter(Boolean).join(", "),
            await fetchKey(),
          ));
        // A miss clears the stored coords rather than leaving the old pin behind.
        patch.lat = geocoded?.lat;
        patch.lng = geocoded?.lng;
        patch.placeId = geocoded?.placeId;
      }

      updateCustomer(update.customerId, patch);
    },
    [fetchKey, updateCustomer],
  );

  const saveJobDetails = useCallback(
    async (job: Job, draft: JobDetailsDraft, coords: PlaceCoords | null) => {
      if (isSaving) return;

      const location = draft.location.trim();
      const city = draft.city.trim();
      const phone = draft.phone.trim();
      const description = draft.description.trim();

      const customer = customersList.find((c) => c.id === job.customerId);
      const addressChanged =
        !!customer &&
        (location !== (customer.address || "").trim() ||
          city !== (customer.city || "").trim());
      const customerPatch: Partial<Customer> = { address: location, city, phone };

      setIsSaving(true);
      try {
        if (isFilterJob(job.id)) {
          if (!customer) {
            toast.error("לא נמצא כרטיס לקוח למשימה זו");
            return;
          }
          await applyCustomerUpdate({
            customerId: customer.id,
            customerName: customer.name,
            patch: customerPatch,
            needsGeocode: addressChanged && !!(location || city),
            coords,
          });
          toast.success("כרטיס הלקוח עודכן");
          return;
        }

        const jobPatch: Parameters<typeof updateJob>[1] = { location, city, phone };
        // Only touch the description column when it actually changed — an untouched
        // job keeps whatever split the loader produced.
        if (description !== splitJobNotes(job.notes).description) {
          jobPatch.description = description;
        }
        if (coords) {
          jobPatch.lat = coords.lat;
          jobPatch.lng = coords.lng;
        }
        updateJob(job.id, jobPatch);
        toast.success("פרטי המשימה עודכנו");

        const customerDiffers =
          !!customer &&
          (addressChanged || phone !== (customer.phone || "").trim());
        if (customer && isDbCustomer(customer.id) && customerDiffers) {
          setPendingCustomerUpdate({
            customerId: customer.id,
            customerName: customer.name,
            patch: customerPatch,
            needsGeocode: addressChanged && !!(location || city),
            coords,
          });
        }
      } finally {
        setIsSaving(false);
      }
    },
    [applyCustomerUpdate, customersList, isSaving, updateJob],
  );

  const confirmCustomerUpdate = useCallback(async () => {
    if (!pendingCustomerUpdate) return;
    const update = pendingCustomerUpdate;
    setPendingCustomerUpdate(null);
    await applyCustomerUpdate(update);
    toast.success("כרטיס הלקוח עודכן");
  }, [applyCustomerUpdate, pendingCustomerUpdate]);

  const dismissCustomerUpdate = useCallback(() => {
    setPendingCustomerUpdate(null);
  }, []);

  return {
    isSaving,
    saveJobDetails,
    pendingCustomerUpdate,
    confirmCustomerUpdate,
    dismissCustomerUpdate,
  };
}
