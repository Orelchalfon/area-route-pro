-- Preview and clean legacy empty Google Sheets imports.
-- Run the SELECT first and review the rows before running DELETE.
-- These rows are not technically empty because Supabase defaults/timestamps exist,
-- but they are unusable jobs when all business fields are blank.

select
  id,
  sheet_row_id,
  region,
  customer_name,
  phone,
  city,
  address,
  product_type,
  notes,
  source,
  created_at
from public.installations
where nullif(trim(customer_name), '') is null
  and nullif(trim(phone), '') is null
  and nullif(trim(city), '') is null
  and nullif(trim(address), '') is null
  and nullif(trim(product_type), '') is null
  and source in ('sheet', 'sheets')
order by created_at desc;

-- After confirming the preview only contains empty imported spreadsheet blocks,
-- run this cleanup once.

delete from public.installations
where nullif(trim(customer_name), '') is null
  and nullif(trim(phone), '') is null
  and nullif(trim(city), '') is null
  and nullif(trim(address), '') is null
  and nullif(trim(product_type), '') is null
  and source in ('sheet', 'sheets');
