-- Phase 3: let the separately authenticated Seller Portal read only the
-- Marketplace vendor's own earnings ledger. Existing profile-auth policy remains.
DROP POLICY IF EXISTS "seller_portal_read_own_earnings" ON public.zune_seller_earnings_ledger;
CREATE POLICY "seller_portal_read_own_earnings"
ON public.zune_seller_earnings_ledger
FOR SELECT
TO authenticated
USING (
  seller_id = (SELECT public.zune_seller_owner_id())
  OR (SELECT public.zune_is_admin())
);
