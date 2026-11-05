WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY payment_provider, provider_reference
           ORDER BY created_at ASC, id ASC
         ) AS occurrence
  FROM public.purchases
  WHERE provider_reference IS NOT NULL
)
UPDATE public.purchases AS p
SET provider_reference = p.provider_reference || ':historical:' || p.id::text
FROM ranked AS r
WHERE p.id = r.id
  AND r.occurrence > 1;

CREATE UNIQUE INDEX IF NOT EXISTS purchases_provider_reference_unique
ON public.purchases (payment_provider, provider_reference)
WHERE provider_reference IS NOT NULL;