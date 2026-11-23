
-- ZUNE Seller Dashboard + Marketplace Live engagement migration
-- Applied to project rpkogiieegqgxqbzwxwo on 2026-11-23.
-- Safe to re-run: objects are created/replaced idempotently.

begin;

-- ---------------------------------------------------------------------------
-- Seller promotion RPC: bind the store to the authenticated seller portal
-- identity, validate product ownership, and prevent anonymous invocation.
-- ---------------------------------------------------------------------------

create or replace function public.submit_seller_promotion(
  p_store_id uuid,
  p_title text,
  p_description text,
  p_discount_type text,
  p_discount_value numeric,
  p_min_order_amount numeric,
  p_max_discount_amount numeric,
  p_starts_at timestamptz,
  p_expires_at timestamptz,
  p_eligible_product_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_id uuid;
  v_owner_id uuid;
  v_actor_owner_id uuid := public.zune_seller_owner_id();
begin
  if auth.uid() is null or v_actor_owner_id is null then
    raise exception 'Authentication required';
  end if;

  select s.owner_id into v_owner_id
  from public.stores s
  where s.id = p_store_id and s.is_active = true;

  if v_owner_id is null then
    raise exception 'Selected store does not exist or is inactive';
  end if;

  if v_owner_id <> v_actor_owner_id then
    raise exception 'You are not authorized to submit a promotion for this store';
  end if;

  if p_title is null or char_length(trim(p_title)) not between 3 and 120 then
    raise exception 'Promotion title must contain 3 to 120 characters';
  end if;
  if p_discount_type not in ('percentage','fixed') or p_discount_value is null or p_discount_value <= 0 then
    raise exception 'Invalid discount';
  end if;
  if p_discount_type = 'percentage' and p_discount_value > 100 then
    raise exception 'Percentage cannot exceed 100';
  end if;
  if p_min_order_amount is not null and p_min_order_amount < 0 then
    raise exception 'Minimum order amount cannot be negative';
  end if;
  if p_max_discount_amount is not null and p_max_discount_amount < 0 then
    raise exception 'Maximum discount amount cannot be negative';
  end if;
  if p_starts_at is null or p_expires_at is null or p_expires_at <= p_starts_at then
    raise exception 'Invalid promotion dates';
  end if;

  if coalesce(cardinality(p_eligible_product_ids),0) > 0 and exists (
    select 1
    from unnest(p_eligible_product_ids) as requested(product_id)
    left join public.products p
      on p.id = requested.product_id
     and p.vendor_id = v_owner_id
     and p.removed_at is null
     and p.seller_archived_at is null
    where p.id is null
  ) then
    raise exception 'Promotion contains products that do not belong to this store or are unavailable';
  end if;

  insert into public.seller_promotions(
    store_id, seller_id, requested_by, title, description,
    discount_type, discount_value, min_order_amount, max_discount_amount,
    starts_at, expires_at, eligible_product_ids, status
  ) values (
    p_store_id, v_owner_id, auth.uid(), trim(p_title), p_description,
    p_discount_type, p_discount_value, greatest(coalesce(p_min_order_amount,0),0),
    p_max_discount_amount, p_starts_at, p_expires_at,
    coalesce(p_eligible_product_ids,'{}'), 'pending_approval'
  ) returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.admin_publish_announcement(text,text,text,text,text,text,timestamptz,text) from public, anon;
grant execute on function public.admin_publish_announcement(text,text,text,text,text,text,timestamptz,text) to authenticated;

revoke all on function public.admin_review_seller_promotion(uuid,text,text) from public, anon;
grant execute on function public.admin_review_seller_promotion(uuid,text,text) to authenticated;

revoke all on function public.submit_seller_promotion(uuid,text,text,text,numeric,numeric,numeric,timestamptz,timestamptz,uuid[]) from public, anon;
grant execute on function public.submit_seller_promotion(uuid,text,text,text,numeric,numeric,numeric,timestamptz,timestamptz,uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Persistent monthly seller sales goals. Seller portal identity is resolved
-- through zune_seller_owner_id(); no public/anonymous access is granted.
-- ---------------------------------------------------------------------------

create table if not exists public.seller_business_goals (
  store_id uuid not null references public.stores(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  goal_month date not null,
  monthly_sales_target numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_business_goals_month_start check (extract(day from goal_month) = 1),
  constraint seller_business_goals_target_nonnegative check (monthly_sales_target >= 0),
  constraint seller_business_goals_pk primary key (store_id, goal_month)
);

create index if not exists seller_business_goals_owner_id_idx
  on public.seller_business_goals(owner_id);

alter table public.seller_business_goals enable row level security;

drop policy if exists seller_business_goals_owner_read on public.seller_business_goals;
create policy seller_business_goals_owner_read
on public.seller_business_goals for select to authenticated
using (
  owner_id = public.zune_seller_owner_id()
  and exists (
    select 1 from public.stores s
    where s.id = seller_business_goals.store_id
      and s.owner_id = public.zune_seller_owner_id()
  )
);

drop policy if exists seller_business_goals_owner_insert on public.seller_business_goals;
create policy seller_business_goals_owner_insert
on public.seller_business_goals for insert to authenticated
with check (
  owner_id = public.zune_seller_owner_id()
  and exists (
    select 1 from public.stores s
    where s.id = seller_business_goals.store_id
      and s.owner_id = public.zune_seller_owner_id()
      and s.is_active = true
  )
);

drop policy if exists seller_business_goals_owner_update on public.seller_business_goals;
create policy seller_business_goals_owner_update
on public.seller_business_goals for update to authenticated
using (
  owner_id = public.zune_seller_owner_id()
  and exists (
    select 1 from public.stores s
    where s.id = seller_business_goals.store_id
      and s.owner_id = public.zune_seller_owner_id()
      and s.is_active = true
  )
)
with check (
  owner_id = public.zune_seller_owner_id()
  and exists (
    select 1 from public.stores s
    where s.id = seller_business_goals.store_id
      and s.owner_id = public.zune_seller_owner_id()
      and s.is_active = true
  )
);

grant select, insert, update on public.seller_business_goals to authenticated;
revoke all on public.seller_business_goals from anon;

-- ---------------------------------------------------------------------------
-- Persistent, non-monetary Live gifts. Events are private; authenticated
-- viewers can only submit through the guarded RPC. Service role can read
-- aggregate counts for the public Live feed.
-- ---------------------------------------------------------------------------

create table if not exists public.zune_live_gift_events (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.youtube_live_broadcasts(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  gift_type text not null check (gift_type in ('applause','star','heart')),
  created_at timestamptz not null default now()
);

create index if not exists zune_live_gift_events_broadcast_created_idx
  on public.zune_live_gift_events(broadcast_id, created_at desc);
create index if not exists zune_live_gift_events_sender_broadcast_created_idx
  on public.zune_live_gift_events(sender_id, broadcast_id, created_at desc);

alter table public.zune_live_gift_events enable row level security;
revoke all on public.zune_live_gift_events from public, anon, authenticated;

create or replace function public.zune_send_live_gift(
  p_broadcast_id uuid,
  p_gift_type text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_privacy text;
  v_count bigint;
  v_gift text := lower(coalesce(p_gift_type,''));
begin
  if v_user_id is null then
    raise exception 'Ingia kwenye akaunti yako ili kutuma zawadi.';
  end if;
  if v_gift not in ('applause','star','heart') then
    raise exception 'Aina ya zawadi haijaruhusiwa.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_broadcast_id::text || ':' || v_user_id::text, 0));

  select b.broadcast_status,b.privacy_status
    into v_status,v_privacy
  from public.youtube_live_broadcasts b
  where b.id=p_broadcast_id;

  if not found or v_status <> 'live' or v_privacy <> 'public' then
    raise exception 'Zawadi zinapatikana tu kwenye matangazo ya umma yanayoendelea.';
  end if;

  if exists (
    select 1 from public.zune_live_gift_events e
    where e.broadcast_id=p_broadcast_id
      and e.sender_id=v_user_id
      and e.created_at > now() - interval '5 seconds'
  ) then
    raise exception 'Subiri sekunde chache kabla ya kutuma zawadi nyingine.';
  end if;

  insert into public.zune_live_gift_events(broadcast_id,sender_id,gift_type)
  values(p_broadcast_id,v_user_id,v_gift);

  select count(*) into v_count
  from public.zune_live_gift_events e
  where e.broadcast_id=p_broadcast_id;

  return jsonb_build_object('ok',true,'gift_type',v_gift,'gift_count',v_count);
end;
$function$;

revoke all on function public.zune_send_live_gift(uuid,text) from public, anon;
grant execute on function public.zune_send_live_gift(uuid,text) to authenticated;

create or replace function public.zune_live_gift_stats(p_broadcast_ids uuid[])
returns table(broadcast_id uuid,gift_count bigint)
language sql
stable
security invoker
set search_path = ''
as $function$
  select e.broadcast_id,count(*)::bigint
  from public.zune_live_gift_events e
  join public.youtube_live_broadcasts b on b.id=e.broadcast_id
  where e.broadcast_id = any(coalesce(p_broadcast_ids,'{}'::uuid[]))
    and b.privacy_status='public'
  group by e.broadcast_id;
$function$;

revoke all on function public.zune_live_gift_stats(uuid[]) from public, anon, authenticated;
grant execute on function public.zune_live_gift_stats(uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- Seller portal RLS performance: wrap auth.uid() in scalar SELECTs so the
-- value is evaluated once per statement, while preserving existing rules.
-- ---------------------------------------------------------------------------

drop policy if exists "Buyers can create conversations" on public.chat_conversations;
create policy "Buyers can create conversations"
on public.chat_conversations for insert to authenticated
with check (
  (select auth.uid()) = buyer_id
  and buyer_id <> seller_id
  and exists (
    select 1 from public.products p
    where p.id = chat_conversations.product_id
      and p.vendor_id = chat_conversations.seller_id
  )
);

drop policy if exists "Participants can view conversations" on public.chat_conversations;
create policy "Participants can view conversations"
on public.chat_conversations for select to authenticated
using ((select auth.uid()) = buyer_id or public.zune_seller_owner_id() = seller_id);

drop policy if exists "Participants can send messages" on public.chat_messages;
create policy "Participants can send messages"
on public.chat_messages for insert to authenticated
with check (
  exists (
    select 1 from public.chat_conversations c
    where c.id = chat_messages.conversation_id
      and (
        ((select auth.uid()) = c.buyer_id and chat_messages.sender_id = (select auth.uid()))
        or (public.zune_seller_owner_id() = c.seller_id and chat_messages.sender_id = public.zune_seller_owner_id())
      )
  )
);

drop policy if exists "Participants can view messages" on public.chat_messages;
create policy "Participants can view messages"
on public.chat_messages for select to authenticated
using (
  exists (
    select 1 from public.chat_conversations c
    where c.id = chat_messages.conversation_id
      and ((select auth.uid()) = c.buyer_id or public.zune_seller_owner_id() = c.seller_id)
  )
);

drop policy if exists "Recipients can mark messages as read" on public.chat_messages;
create policy "Recipients can mark messages as read"
on public.chat_messages for update to authenticated
using (
  sender_id <> (select auth.uid())
  and sender_id <> public.zune_seller_owner_id()
  and exists (
    select 1 from public.chat_conversations c
    where c.id = chat_messages.conversation_id
      and ((select auth.uid()) = c.buyer_id or public.zune_seller_owner_id() = c.seller_id)
  )
)
with check (
  sender_id <> (select auth.uid())
  and sender_id <> public.zune_seller_owner_id()
);

drop policy if exists "Buyers can create orders." on public.orders;
create policy "Buyers can create orders."
on public.orders for insert to public
with check ((select auth.uid()) = buyer_id);

drop policy if exists "Users can view their own orders." on public.orders;
create policy "Users can view their own orders."
on public.orders for select to public
using (
  (select auth.uid()) = buyer_id
  or (select auth.uid()) in (
    select p.vendor_id from public.products p where p.id = orders.product_id
  )
);

drop policy if exists "Vendors can delete their own products." on public.products;
create policy "Vendors can delete their own products."
on public.products for delete to public
using ((select auth.uid()) = vendor_id);

drop policy if exists "seller_promotions_owner_read" on public.seller_promotions;
create policy "seller_promotions_owner_read"
on public.seller_promotions for select to authenticated
using (
  seller_id = (select auth.uid())
  or requested_by = (select auth.uid())
  or public.is_admin()
);

-- Seller portal identity is separate from the customer Supabase auth ID.
drop policy if exists "product_reviews_seller_read_own_products" on public.product_reviews;
create policy "product_reviews_seller_read_own_products"
on public.product_reviews for select to authenticated
using (
  exists (
    select 1 from public.products p
    where p.id = product_reviews.product_id
      and p.vendor_id = (select auth.uid())
  )
  or exists (
    select 1 from public.products p
    where p.id = product_reviews.product_id
      and p.vendor_id = public.zune_seller_owner_id()
  )
);

commit;
