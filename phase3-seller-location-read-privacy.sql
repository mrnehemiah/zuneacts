-- Exact seller GPS/address details are private to the store owner and Admin.
-- Checkout reads location inside SECURITY DEFINER checkout RPCs, so buyers do not
-- need direct SELECT access to seller_locations.
DROP POLICY IF EXISTS "Read active seller locations" ON public.seller_locations;

CREATE POLICY "Seller and Admin read permitted locations"
ON public.seller_locations
FOR SELECT
TO authenticated
USING (
  vendor_id = (SELECT public.zune_seller_owner_id())
  OR (SELECT public.zune_is_admin())
);
