-- Employees should not browse the entire customer directory.
-- They may read customer rows only when the customer is connected to one of
-- their assigned service rows. Malfunctions/installations carry their own
-- customer details and are already protected by their job-row RLS policies.

DROP POLICY IF EXISTS "customers employee read" ON public.customers;

CREATE POLICY "customers employee read assigned services"
ON public.customers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ongoing_services os
    WHERE os.technician_id = public.current_technician_id()
      AND os.customer_id IS NOT NULL
      AND replace(os.customer_id, 'db-cust-', '') = customers.id::text
  )
  OR EXISTS (
    SELECT 1
    FROM public.scheduled_filter_services sfs
    WHERE sfs.technician_id = public.current_technician_id()
      AND replace(sfs.customer_id, 'db-cust-', '') = customers.id::text
  )
);
