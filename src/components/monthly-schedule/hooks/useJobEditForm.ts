import { useJobsContext } from "@/contexts/JobsContext";
import { useGoogleMapsKey } from "@/hooks/useGoogleMapsKey";
import { geocodeAddress } from "@/lib/geocodeAddress";
import { Customer, Job } from "@/types";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useState,
} from "react";
import { toast } from "sonner";

interface EditForm {
  location: string;
  city: string;
  phone: string;
  notes: string;
  estimatedDuration: number;
}

const EMPTY_FORM: EditForm = {
  location: "",
  city: "",
  phone: "",
  notes: "",
  estimatedDuration: 0,
};

/**
 * Inline per-job edit form used by the day detail dialog. Owns the edit form
 * state and the save flow (geocode on address change, persist job + customer,
 * optimistically patch the passed-in ordered list). Behavior matches the
 * original inline implementation.
 */
export function useJobEditForm(setOrderedJobs: Dispatch<SetStateAction<Job[]>>) {
  const { customersList: customers, updateJob, updateCustomer } =
    useJobsContext();
  const { fetchKey } = useGoogleMapsKey();

  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM);
  const [pendingEditCoords, setPendingEditCoords] = useState<{
    lat: number;
    lng: number;
    placeId?: string;
  } | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);

  const startEditingJob = useCallback(
    (job: Job) => {
      const customer = customers.find((c) => c.id === job.customerId);
      setEditingJobId(job.id);
      setEditForm({
        location: job.location,
        city: job.city,
        phone: job.phone || customer?.phone || "",
        notes: job.notes,
        estimatedDuration: job.estimatedDuration,
      });
      setPendingEditCoords(null);
    },
    [customers],
  );

  const closeEditingJob = useCallback(() => {
    setEditingJobId(null);
    setPendingEditCoords(null);
  }, []);

  const handleSaveEditedJob = useCallback(
    async (job: Job) => {
      if (isEditSaving) return;

      const nextLocation = editForm.location.trim();
      const nextCity = editForm.city.trim();
      const nextPhone = editForm.phone.trim();
      const customer = customers.find((c) => c.id === job.customerId);
      const hasLocationChange =
        !!customer &&
        (nextLocation !== (customer.address || "").trim() ||
          nextCity !== (customer.city || "").trim());

      const customerUpdate: Partial<Customer> | null = customer
        ? { address: nextLocation, city: nextCity, phone: nextPhone }
        : null;

      setIsEditSaving(true);

      try {
        if (customerUpdate && hasLocationChange && (nextLocation || nextCity)) {
          const geocoded =
            pendingEditCoords ??
            (await geocodeAddress(
              [nextLocation, nextCity].filter(Boolean).join(", "),
              await fetchKey(),
            ));

          if (geocoded) {
            customerUpdate.lat = geocoded.lat;
            customerUpdate.lng = geocoded.lng;
            customerUpdate.placeId = geocoded.placeId;
          } else {
            customerUpdate.lat = undefined;
            customerUpdate.lng = undefined;
            customerUpdate.placeId = undefined;
          }
        }

        const nextJobData: Partial<
          Pick<Job, "location" | "city" | "phone" | "notes" | "estimatedDuration">
        > & { lat?: number; lng?: number } = {
          ...editForm,
          location: nextLocation,
          city: nextCity,
          phone: nextPhone,
        };

        // Propagate geocoded coords into the job so the map moves immediately
        if (
          customerUpdate &&
          (customerUpdate.lat != null || customerUpdate.lng != null)
        ) {
          nextJobData.lat = customerUpdate.lat;
          nextJobData.lng = customerUpdate.lng;
        }

        updateJob(job.id, nextJobData);
        setOrderedJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, ...nextJobData } : j)),
        );

        // Don't write derived ongoing-service "customers" (db-ongoing-cust-*) back to
        // the customers table — their name is the task description, so the upsert in
        // updateCustomer would mint a junk duplicate customer card. The job's own row
        // (ongoing_services) already got the address/city/phone via updateJob above.
        if (
          customer &&
          customerUpdate &&
          !customer.id.startsWith("db-ongoing-cust-")
        ) {
          updateCustomer(customer.id, customerUpdate);
        }

        closeEditingJob();
        toast.success("המשימה עודכנה בהצלחה");
      } finally {
        setIsEditSaving(false);
      }
    },
    [
      closeEditingJob,
      customers,
      editForm,
      fetchKey,
      isEditSaving,
      pendingEditCoords,
      setOrderedJobs,
      updateCustomer,
      updateJob,
    ],
  );

  return {
    editingJobId,
    editForm,
    setEditForm,
    pendingEditCoords,
    setPendingEditCoords,
    isEditSaving,
    startEditingJob,
    closeEditingJob,
    handleSaveEditedJob,
  };
}
