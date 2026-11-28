-- Phase 3: Seller Portal must manage GPS under the Marketplace vendor profile ID.
-- Seller Portal sessions use a separate auth identity; zune_seller_owner_id()
-- securely maps that session back to the approved Marketplace vendor profile.
DROP POLICY IF EXISTS "Seller manage own locations" ON public.seller_locations;

CREATE POLICY "Seller manage own locations"
ON public.seller_locations
FOR ALL
TO authenticated
USING (
  vendor_id = (SELECT public.zune_seller_owner_id())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = seller_locations.vendor_id
      AND p.role::text = 'vendor'
      AND COALESCE(p.account_status, 'active') = 'active'
      AND p.removed_at IS NULL
  )
)
WITH CHECK (
  vendor_id = (SELECT public.zune_seller_owner_id())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = seller_locations.vendor_id
      AND p.role::text = 'vendor'
      AND COALESCE(p.account_status, 'active') = 'active'
      AND p.removed_at IS NULL
  )
);
